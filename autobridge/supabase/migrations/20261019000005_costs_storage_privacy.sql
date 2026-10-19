-- Cost estimation configuration, saved estimates, storage buckets and privacy helpers.

-- ---------------------------------------------------------------------------
-- Exchange rates: append-only, documented. 1 unit of base_currency = rate quote_currency.
-- ---------------------------------------------------------------------------
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency char(3) not null references public.currencies (code),
  quote_currency char(3) not null references public.currencies (code),
  rate numeric(18, 8) not null check (rate > 0),
  source text not null check (char_length(source) between 2 and 300),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  effective_date date not null,
  is_demo boolean not null default false,
  notes text check (char_length(notes) <= 1000),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (base_currency <> quote_currency)
);
create index exchange_rates_pair_idx on public.exchange_rates (base_currency, quote_currency, effective_date desc, created_at desc);

alter table public.exchange_rates enable row level security;
create policy "exchange_rates: public read" on public.exchange_rates for select using (true);
create policy "exchange_rates: admin insert" on public.exchange_rates
  for insert to authenticated
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()) and not is_demo);
revoke update, delete on public.exchange_rates from anon, authenticated;

-- Latest documented rate per pair.
create view public.latest_exchange_rates with (security_barrier = true) as
select distinct on (base_currency, quote_currency)
  id, base_currency, quote_currency, rate, source, source_url, effective_date, is_demo, created_at
from public.exchange_rates
where effective_date <= (now() at time zone 'Africa/Algiers')::date
order by base_currency, quote_currency, effective_date desc, created_at desc;
grant select on public.latest_exchange_rates to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Versioned cost rule sets. Only one set is active; rules of active or retired
-- sets are immutable, so every published estimate can be traced to a version.
-- ---------------------------------------------------------------------------
create table public.cost_rule_sets (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  title text not null check (char_length(title) between 2 and 160),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  notes text check (char_length(notes) <= 2000),
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  activated_by uuid references public.profiles (id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index cost_rule_sets_single_active on public.cost_rule_sets ((status)) where status = 'active';

create table public.cost_estimate_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.cost_rule_sets (id) on delete cascade,
  code text not null check (code ~ '^[a-z_]+$'),
  kind public.fee_kind not null,
  label_ar text not null,
  label_fr text not null,
  -- fixed: amount in currency; percent_of_price: percent of the converted vehicle price;
  -- quote_required: no reliable value; the estimate flags it as missing.
  method text not null check (method in ('fixed', 'percent_of_price', 'quote_required')),
  amount numeric(14, 2) check (amount is null or amount >= 0),
  currency char(3) references public.currencies (code),
  percent numeric(7, 4) check (percent is null or percent between 0 and 1000),
  pathway_code text references public.acquisition_pathways (code) on update cascade,
  is_verified boolean not null default false,
  source text not null check (char_length(source) between 2 and 300),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  source_date date,
  notes_ar text check (char_length(notes_ar) <= 1000),
  notes_fr text check (char_length(notes_fr) <= 1000),
  position smallint not null default 0,
  check (method <> 'fixed' or (amount is not null and currency is not null)),
  check (method <> 'percent_of_price' or percent is not null),
  check (not is_verified or source_date is not null),
  unique nulls not distinct (rule_set_id, code, pathway_code)
);
create index cost_estimate_rules_set_idx on public.cost_estimate_rules (rule_set_id, position);

create or replace function private.cost_rules_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.cost_rule_sets
  where id = coalesce(new.rule_set_id, old.rule_set_id);
  -- v_status is null when the parent set itself is being deleted (cascade).
  if v_status is not null and v_status <> 'draft' then
    raise exception 'rule_set_locked' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create trigger cost_estimate_rules_immutable before insert or update or delete on public.cost_estimate_rules
  for each row execute function private.cost_rules_immutable();

create or replace function private.cost_rule_sets_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request() then
    if tg_op = 'INSERT' then
      new.status := 'draft';
      new.activated_by := null;
      new.activated_at := null;
      new.is_demo := false;
    elsif new.status is distinct from old.status
       or new.activated_by is distinct from old.activated_by
       or new.activated_at is distinct from old.activated_at
       or new.is_demo is distinct from old.is_demo
       or new.version is distinct from old.version then
      raise exception 'protected_fields' using errcode = '42501';
    elsif old.status <> 'draft' then
      raise exception 'rule_set_locked' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger cost_rule_sets_guard before insert or update on public.cost_rule_sets
  for each row execute function private.cost_rule_sets_guard();

alter table public.cost_rule_sets enable row level security;
alter table public.cost_estimate_rules enable row level security;

create policy "cost_rule_sets: public read active, admin all" on public.cost_rule_sets
  for select using (status = 'active' or (select private.is_staff()));
create policy "cost_rule_sets: admin insert" on public.cost_rule_sets
  for insert to authenticated with check ((select private.is_admin()));
create policy "cost_rule_sets: admin update" on public.cost_rule_sets
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "cost_rule_sets: admin delete draft" on public.cost_rule_sets
  for delete to authenticated using ((select private.is_admin()) and status = 'draft');

create policy "cost_rules: read with set" on public.cost_estimate_rules
  for select using (exists (select 1 from public.cost_rule_sets s where s.id = rule_set_id));
create policy "cost_rules: admin write" on public.cost_estimate_rules
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create or replace function public.clone_cost_rule_set(p_source_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new uuid;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.cost_rule_sets (version, title, notes, created_by)
  select coalesce(max(version), 0) + 1, coalesce(nullif(trim(p_title), ''), 'Draft'), null, auth.uid()
  from public.cost_rule_sets
  returning id into v_new;
  if p_source_id is not null then
    insert into public.cost_estimate_rules (rule_set_id, code, kind, label_ar, label_fr, method, amount, currency,
      percent, pathway_code, is_verified, source, source_url, source_date, notes_ar, notes_fr, position)
    select v_new, code, kind, label_ar, label_fr, method, amount, currency, percent, pathway_code, is_verified,
      source, source_url, source_date, notes_ar, notes_fr, position
    from public.cost_estimate_rules where rule_set_id = p_source_id;
  end if;
  perform private.audit('cost_rules.cloned', 'cost_rule_set', v_new::text,
    jsonb_build_object('source', p_source_id));
  return v_new;
end;
$$;

create or replace function public.activate_cost_rule_set(p_rule_set_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cost_rule_sets where id = p_rule_set_id and status = 'draft') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.cost_rule_sets set status = 'retired' where status = 'active';
  update public.cost_rule_sets set status = 'active', activated_by = auth.uid(), activated_at = now()
  where id = p_rule_set_id;
  perform private.audit('cost_rules.activated', 'cost_rule_set', p_rule_set_id::text, '{}'::jsonb);
end;
$$;

revoke execute on function public.clone_cost_rule_set(uuid, text) from public, anon;
revoke execute on function public.activate_cost_rule_set(uuid) from public, anon;
grant execute on function public.clone_cost_rule_set(uuid, text) to authenticated;
grant execute on function public.activate_cost_rule_set(uuid) to authenticated;

-- Saved estimates (snapshot of inputs and itemised result).
create table public.cost_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  rule_set_id uuid references public.cost_rule_sets (id) on delete set null,
  inputs jsonb not null,
  result jsonb not null,
  total_amount numeric(16, 2) not null check (total_amount >= 0),
  total_currency char(3) not null references public.currencies (code),
  completeness smallint not null check (completeness between 0 and 100),
  created_at timestamptz not null default now()
);
create index cost_estimates_user_idx on public.cost_estimates (user_id, created_at desc);

alter table public.cost_estimates enable row level security;
create policy "cost_estimates: own read" on public.cost_estimates
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "cost_estimates: own insert" on public.cost_estimates
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "cost_estimates: own delete" on public.cost_estimates
  for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.cost_estimates from anon, authenticated;

alter table public.purchase_requests
  add column cost_estimate_id uuid references public.cost_estimates (id) on delete set null;

-- The estimate attached to a request must belong to the requester.
create or replace function private.request_estimate_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cost_estimate_id is not null and not exists (
    select 1 from public.cost_estimates where id = new.cost_estimate_id and user_id = new.customer_id
  ) then
    raise exception 'invalid_cost_estimate' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger purchase_requests_estimate_owner before insert or update of cost_estimate_id on public.purchase_requests
  for each row execute function private.request_estimate_owner();

-- ---------------------------------------------------------------------------
-- Storage
--   vehicle-images     public read by URL (random paths), uploads only by the owning
--                      approved supplier into {uid}/{vehicle_id}/...; listing restricted.
--   verification-docs  private; owner and staff only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "vehicle-images: owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.vehicle_owned_by_me(((storage.foldername(name))[2])::uuid))
  );
create policy "vehicle-images: owner or staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff()))
  );
create policy "vehicle-images: owner or staff delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff()))
  );

create policy "verification-docs: owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select private.my_supplier_id()) is not null or (select private.my_partner_id()) is not null)
  );
create policy "verification-docs: owner or staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff()))
  );
create policy "verification-docs: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Privacy: scrub personal data from retained records when a profile is deleted.
-- ---------------------------------------------------------------------------
create or replace function private.scrub_user_pii()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.purchase_requests set
    contact_name = 'Deleted user',
    contact_phone = '000000',
    contact_email = null,
    message = null,
    preferences = null
  where customer_id = old.id;
  update public.contact_messages set name = 'Deleted user', email = 'deleted@invalid.example', phone = null
  where user_id = old.id;
  perform private.audit('user.deleted', 'user', old.id::text, '{}'::jsonb);
  return old;
end;
$$;
create trigger profiles_scrub_pii before delete on public.profiles
  for each row execute function private.scrub_user_pii();

-- Admin-only: list users with their roles (profiles are already staff-readable;
-- this helper adds role management in one call).
create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user_id, p_role, auth.uid())
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
  perform private.audit(case when p_grant then 'role.granted' else 'role.revoked' end,
    'user', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;
revoke execute on function public.admin_set_role(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

-- Dashboard counters for staff (single round trip).
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'vehicles_total', (select count(*) from public.vehicles where status <> 'archived'),
    'vehicles_available', (select count(*) from public.marketplace_vehicles where availability = 'available'),
    'vehicles_pending', (select count(*) from public.vehicles where status = 'pending_review'),
    'suppliers_pending', (select count(*) from public.supplier_profiles where status = 'pending'),
    'partners_pending', (select count(*) from public.partner_profiles where status = 'pending'),
    'requests_new', (select count(*) from public.purchase_requests where status = 'submitted'),
    'requests_open', (select count(*) from public.purchase_requests
                      where status not in ('draft', 'completed', 'cancelled', 'rejected')),
    'quotations_open', (select count(*) from public.quotations where status in ('submitted', 'sent')),
    'requests_completed', (select count(*) from public.purchase_requests where status = 'completed'),
    'reports_open', (select count(*) from public.listing_reports where status in ('open', 'reviewing')),
    'documents_expiring', (select count(*) from public.verification_documents
                           where expires_on is not null and expires_on <= current_date + 30),
    'data_requests_open', (select count(*) from public.data_requests where status in ('open', 'in_progress')),
    'contact_messages_new', (select count(*) from public.contact_messages where status = 'new')
  );
end;
$$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- Make sure every private helper remains callable from RLS policies.
grant execute on all functions in schema private to anon, authenticated, service_role;
