-- Purchase requests, status history, milestones, quotations and partner service requests.

create type public.request_status as enum (
  'draft', 'submitted', 'under_review', 'supplier_contacted', 'quotation_received',
  'awaiting_customer_decision', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'
);
create type public.legal_review_status as enum ('not_required', 'pending', 'approved', 'blocked');
create type public.contact_method as enum ('phone', 'email', 'whatsapp');

create sequence public.purchase_request_ref_seq;

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'AB-' || to_char(now() at time zone 'Africa/Algiers', 'YYYY') || '-'
    || lpad(nextval('public.purchase_request_ref_seq')::text, 6, '0')
  ),
  -- Set to null if the customer account is deleted; personal fields are scrubbed (see private.scrub_user_pii).
  customer_id uuid references public.profiles (id) on delete set null default auth.uid(),
  request_type text not null check (request_type in ('listed_vehicle', 'custom_search')),
  vehicle_id uuid references public.vehicles (id) on delete restrict,
  -- Listing facts as published when the request was made (kept even if the listing changes or is withdrawn).
  vehicle_snapshot jsonb,
  supplier_id uuid references public.supplier_profiles (id) on delete set null,
  desired_make_id smallint references public.vehicle_makes (id),
  desired_model text check (char_length(desired_model) <= 80),
  year_min smallint check (year_min between 1950 and 2100),
  year_max smallint check (year_max between 1950 and 2100),
  max_mileage_km integer check (max_mileage_km between 0 and 2000000),
  desired_fuel public.fuel_type,
  desired_transmission public.transmission_type,
  preferences text check (char_length(preferences) <= 2000),
  budget_amount numeric(14, 2) check (budget_amount > 0),
  budget_currency char(3) not null default 'DZD' references public.currencies (code),
  pathway_code text not null references public.acquisition_pathways (code) on update cascade,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 32),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  wilaya text not null check (char_length(wilaya) between 2 and 64),
  preferred_contact public.contact_method not null default 'phone',
  message text check (char_length(message) <= 2000),
  status public.request_status not null default 'submitted',
  legal_review_status public.legal_review_status not null default 'pending',
  legal_reviewed_by uuid references public.profiles (id) on delete set null,
  legal_reviewed_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (request_type <> 'listed_vehicle' or vehicle_id is not null),
  check (request_type <> 'custom_search' or vehicle_id is null),
  check (year_min is null or year_max is null or year_min <= year_max)
);
create index purchase_requests_customer_idx on public.purchase_requests (customer_id, created_at desc);
create index purchase_requests_status_idx on public.purchase_requests (status, created_at desc);
create index purchase_requests_supplier_idx on public.purchase_requests (supplier_id);
create index purchase_requests_assigned_idx on public.purchase_requests (assigned_to);
create index purchase_requests_vehicle_idx on public.purchase_requests (vehicle_id);

create trigger purchase_requests_touch before update on public.purchase_requests
  for each row execute function private.touch_updated_at();

create table public.request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  from_status public.request_status,
  to_status public.request_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('customer', 'staff', 'supplier', 'system')),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index request_status_history_request_idx on public.request_status_history (request_id, created_at);

-- ---------------------------------------------------------------------------
-- Transition rules (authoritative). Mirrored in src/lib/domain/request-status.ts.
-- ---------------------------------------------------------------------------
create or replace function private.request_transition_allowed(
  p_from public.request_status, p_to public.request_status, p_actor text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from (values
      ('customer', 'draft', 'submitted'),
      ('customer', 'draft', 'cancelled'),
      ('customer', 'submitted', 'cancelled'),
      ('customer', 'under_review', 'cancelled'),
      ('customer', 'supplier_contacted', 'cancelled'),
      ('customer', 'quotation_received', 'cancelled'),
      ('customer', 'awaiting_customer_decision', 'cancelled'),
      ('staff', 'submitted', 'under_review'),
      ('staff', 'submitted', 'rejected'),
      ('staff', 'submitted', 'cancelled'),
      ('staff', 'under_review', 'supplier_contacted'),
      ('staff', 'under_review', 'rejected'),
      ('staff', 'under_review', 'cancelled'),
      ('staff', 'supplier_contacted', 'under_review'),
      ('staff', 'supplier_contacted', 'rejected'),
      ('staff', 'supplier_contacted', 'cancelled'),
      ('staff', 'quotation_received', 'under_review'),
      ('staff', 'quotation_received', 'awaiting_customer_decision'),
      ('staff', 'quotation_received', 'cancelled'),
      ('staff', 'awaiting_customer_decision', 'under_review'),
      ('staff', 'awaiting_customer_decision', 'cancelled'),
      ('staff', 'accepted', 'in_progress'),
      ('staff', 'accepted', 'cancelled'),
      ('staff', 'in_progress', 'completed'),
      ('staff', 'in_progress', 'cancelled'),
      -- Automatic moves performed by quotation workflows.
      ('system', 'under_review', 'quotation_received'),
      ('system', 'supplier_contacted', 'quotation_received'),
      ('system', 'under_review', 'awaiting_customer_decision'),
      ('system', 'supplier_contacted', 'awaiting_customer_decision'),
      ('system', 'quotation_received', 'awaiting_customer_decision'),
      ('system', 'awaiting_customer_decision', 'accepted'),
      ('system', 'awaiting_customer_decision', 'under_review')
    ) as t (actor, from_status, to_status)
    where t.actor = p_actor and t.from_status = p_from::text and t.to_status = p_to::text
  );
$$;

-- Applies a validated status change, records history and notifies the customer.
create or replace function private.apply_request_status(
  p_request_id uuid, p_to public.request_status, p_actor_role text, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
begin
  select * into r from public.purchase_requests where id = p_request_id for update;
  update public.purchase_requests set
    status = p_to,
    submitted_at = case when p_to = 'submitted' then now() else submitted_at end,
    closed_at = case when p_to in ('completed', 'cancelled', 'rejected') then now() else null end
  where id = p_request_id;

  insert into public.request_status_history (request_id, from_status, to_status, actor_id, actor_role, note)
  values (p_request_id, r.status, p_to, auth.uid(), p_actor_role, nullif(trim(p_note), ''));

  perform private.audit('request.status_changed', 'purchase_request', p_request_id::text,
    jsonb_build_object('from', r.status, 'to', p_to, 'actor_role', p_actor_role));

  if p_actor_role <> 'customer' then
    perform private.notify(r.customer_id, 'request.status_changed',
      jsonb_build_object('reference', r.reference, 'status', p_to),
      '/account/requests/' || r.id::text);
  end if;
  if p_to = 'supplier_contacted' and r.supplier_id is not null then
    perform private.notify(
      (select owner_id from public.supplier_profiles where id = r.supplier_id),
      'request.forwarded_to_supplier',
      jsonb_build_object('reference', r.reference),
      '/supplier/requests/' || r.id::text);
  end if;
  if p_actor_role = 'customer' then
    perform private.notify_staff('request.customer_status_changed',
      jsonb_build_object('reference', r.reference, 'status', p_to),
      '/admin/requests/' || r.id::text);
  end if;
end;
$$;

-- Public RPC for customers and staff.
create or replace function public.transition_purchase_request(
  p_request_id uuid, p_to public.request_status, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
  v_actor text;
begin
  select * into r from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if r.customer_id = auth.uid() and private.request_transition_allowed(r.status, p_to, 'customer') then
    v_actor := 'customer';
  elsif private.is_staff() and private.request_transition_allowed(r.status, p_to, 'staff') then
    v_actor := 'staff';
  elsif r.customer_id = auth.uid() or private.is_staff() then
    raise exception 'invalid_transition' using errcode = 'P0001';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_to = 'in_progress' and r.legal_review_status not in ('approved', 'not_required') then
    raise exception 'legal_review_required' using errcode = 'P0001';
  end if;
  if p_to = 'supplier_contacted' and r.supplier_id is null then
    raise exception 'supplier_required' using errcode = 'P0001';
  end if;
  if p_to = 'awaiting_customer_decision' and not exists (
    select 1 from public.quotations q
    where q.request_id = r.id and q.status = 'sent' and q.valid_until >= current_date
  ) then
    raise exception 'no_sent_quotation' using errcode = 'P0001';
  end if;
  if p_to = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if p_to = 'submitted' and not exists (
    select 1 from public.acquisition_pathways where code = r.pathway_code and is_enabled
  ) then
    raise exception 'pathway_disabled' using errcode = 'P0001';
  end if;

  perform private.apply_request_status(p_request_id, p_to, v_actor, p_note);

  -- Cancelling or rejecting closes any quotation still open.
  if p_to in ('cancelled', 'rejected') then
    update public.quotations set status = 'withdrawn', updated_at = now()
    where request_id = p_request_id and status in ('submitted', 'sent');
  end if;
end;
$$;

-- Guard and derivations for direct writes by customers.
create or replace function private.vehicle_supplier_if_public(p_vehicle_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select supplier_id from public.marketplace_vehicles
  where id = p_vehicle_id and availability in ('available', 'reserved');
$$;

create or replace function private.vehicle_snapshot(p_vehicle_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', slug, 'make', make_name, 'model', model, 'trim', trim_level, 'year', manufacture_year,
    'first_registration_date', first_registration_date, 'mileage_km', mileage_km,
    'price_amount', price_amount, 'price_currency', price_currency,
    'country_code', country_code, 'city', city, 'is_demo', is_demo or supplier_is_demo
  )
  from public.marketplace_vehicles where id = p_vehicle_id;
$$;

create or replace function private.pathway_requires_review(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select requires_legal_review from public.acquisition_pathways where code = p_code and is_enabled;
$$;

create or replace function private.purchase_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_requires_review boolean;
begin
  if not private.is_client_request() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.customer_id := auth.uid();
    if new.status not in ('draft', 'submitted') then
      new.status := 'submitted';
    end if;
    new.assigned_to := null;
    new.legal_reviewed_by := null;
    new.legal_reviewed_at := null;
    new.closed_at := null;
    new.submitted_at := case when new.status = 'submitted' then now() else null end;

    v_requires_review := private.pathway_requires_review(new.pathway_code);
    if v_requires_review is null then
      raise exception 'pathway_disabled' using errcode = 'P0001';
    end if;
    new.legal_review_status := case when v_requires_review then 'pending' else 'not_required' end::public.legal_review_status;

    if new.request_type = 'listed_vehicle' then
      new.supplier_id := private.vehicle_supplier_if_public(new.vehicle_id);
      if new.supplier_id is null then
        raise exception 'vehicle_not_available' using errcode = 'P0001';
      end if;
      new.vehicle_snapshot := private.vehicle_snapshot(new.vehicle_id);
    else
      new.supplier_id := null;
      new.vehicle_snapshot := null;
    end if;
    return new;
  end if;

  -- UPDATE by a client.
  if new.reference is distinct from old.reference
     or new.customer_id is distinct from old.customer_id
     or new.status is distinct from old.status
     or new.supplier_id is distinct from old.supplier_id
     or new.vehicle_id is distinct from old.vehicle_id
     or new.vehicle_snapshot is distinct from old.vehicle_snapshot
     or new.request_type is distinct from old.request_type
     or new.legal_review_status is distinct from old.legal_review_status
     or new.legal_reviewed_by is distinct from old.legal_reviewed_by
     or new.legal_reviewed_at is distinct from old.legal_reviewed_at
     or new.assigned_to is distinct from old.assigned_to
     or new.submitted_at is distinct from old.submitted_at
     or new.closed_at is distinct from old.closed_at then
    raise exception 'protected_fields' using errcode = '42501';
  end if;
  if not private.is_staff() and old.status <> 'draft' then
    raise exception 'request_locked' using errcode = 'P0001';
  end if;
  if new.pathway_code is distinct from old.pathway_code then
    v_requires_review := private.pathway_requires_review(new.pathway_code);
    if v_requires_review is null then
      raise exception 'pathway_disabled' using errcode = 'P0001';
    end if;
    new.legal_review_status := case when v_requires_review then 'pending' else 'not_required' end::public.legal_review_status;
  end if;
  return new;
end;
$$;
create trigger purchase_requests_guard before insert or update on public.purchase_requests
  for each row execute function private.purchase_requests_guard();

create or replace function private.purchase_requests_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_client_request() and (
    select count(*) from public.purchase_requests
    where customer_id = auth.uid() and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger purchase_requests_rate_limit before insert on public.purchase_requests
  for each row execute function private.purchase_requests_rate_limit();

create or replace function private.purchase_requests_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.request_status_history (request_id, from_status, to_status, actor_id, actor_role)
  values (new.id, null, new.status, new.customer_id, 'customer');
  perform private.audit('request.created', 'purchase_request', new.id::text,
    jsonb_build_object('reference', new.reference, 'status', new.status));
  if new.status = 'submitted' then
    perform private.notify_staff('request.created',
      jsonb_build_object('reference', new.reference), '/admin/requests/' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger purchase_requests_created after insert on public.purchase_requests
  for each row execute function private.purchase_requests_created();

alter table public.purchase_requests enable row level security;
create policy "purchase_requests: own or staff read" on public.purchase_requests
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));
create policy "purchase_requests: own insert" on public.purchase_requests
  for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy "purchase_requests: own draft or staff update" on public.purchase_requests
  for update to authenticated
  using ((customer_id = (select auth.uid()) and status = 'draft') or (select private.is_staff()))
  with check (customer_id = (select auth.uid()) or (select private.is_staff()));
create policy "purchase_requests: own draft delete" on public.purchase_requests
  for delete to authenticated
  using (customer_id = (select auth.uid()) and status = 'draft');

alter table public.request_status_history enable row level security;
create policy "request_history: customer or staff read" on public.request_status_history
  for select to authenticated
  using (
    (select private.is_staff())
    or exists (select 1 from public.purchase_requests r
               where r.id = request_id and r.customer_id = (select auth.uid()))
  );
revoke insert, update, delete on public.request_status_history from anon, authenticated;

-- Suppliers see forwarded requests without the customer's contact details.
create view public.supplier_purchase_requests with (security_barrier = true) as
select
  r.id, r.reference, r.request_type, r.vehicle_id, r.vehicle_snapshot, r.supplier_id,
  r.desired_make_id, r.desired_model, r.year_min, r.year_max, r.max_mileage_km,
  r.desired_fuel, r.desired_transmission, r.preferences,
  r.budget_amount, r.budget_currency, r.pathway_code, r.wilaya, r.message,
  r.status, r.created_at, r.updated_at
from public.purchase_requests r
where r.supplier_id is not null
  and r.supplier_id = private.my_approved_supplier_id()
  and r.status in ('supplier_contacted', 'quotation_received', 'awaiting_customer_decision',
                   'accepted', 'in_progress', 'completed');
grant select on public.supplier_purchase_requests to authenticated;

-- Staff RPCs for assignment, supplier routing and legal review ------------------
create or replace function public.assign_purchase_request(p_request_id uuid, p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_staff_id is not null and not exists (
    select 1 from public.user_roles where user_id = p_staff_id and role in ('admin', 'staff')
  ) then
    raise exception 'assignee_not_staff' using errcode = '22023';
  end if;
  update public.purchase_requests set assigned_to = p_staff_id where id = p_request_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.audit('request.assigned', 'purchase_request', p_request_id::text,
    jsonb_build_object('assigned_to', p_staff_id));
  if p_staff_id is not null and p_staff_id <> auth.uid() then
    perform private.notify(p_staff_id, 'request.assigned_to_you', '{}'::jsonb, '/admin/requests/' || p_request_id::text);
  end if;
end;
$$;

create or replace function public.set_request_supplier(p_request_id uuid, p_supplier_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into r from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if r.request_type = 'listed_vehicle' then
    raise exception 'supplier_fixed_by_listing' using errcode = 'P0001';
  end if;
  if r.status not in ('submitted', 'under_review') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if p_supplier_id is not null and not exists (
    select 1 from public.supplier_profiles where id = p_supplier_id and status = 'approved'
  ) then
    raise exception 'supplier_not_approved' using errcode = 'P0001';
  end if;
  update public.purchase_requests set supplier_id = p_supplier_id where id = p_request_id;
  perform private.audit('request.supplier_set', 'purchase_request', p_request_id::text,
    jsonb_build_object('supplier_id', p_supplier_id));
end;
$$;

-- Legal review must be completed before a request advances to a legally sensitive stage.
create or replace function public.record_legal_review(
  p_request_id uuid, p_decision public.legal_review_status, p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'blocked', 'pending') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into r from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if r.status in ('in_progress', 'completed', 'cancelled', 'rejected') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.purchase_requests set
    legal_review_status = p_decision,
    legal_reviewed_by = auth.uid(),
    legal_reviewed_at = now()
  where id = p_request_id;
  insert into public.admin_notes (entity_type, entity_id, body, author_id)
  values ('purchase_request', p_request_id, '[legal_review:' || p_decision || '] ' || trim(p_note), auth.uid());
  perform private.audit('request.legal_review', 'purchase_request', p_request_id::text,
    jsonb_build_object('decision', p_decision));
  perform private.notify(r.customer_id, 'request.legal_review',
    jsonb_build_object('reference', r.reference, 'decision', p_decision),
    '/account/requests/' || r.id::text);
end;
$$;

-- Milestones: recorded, dated events after a quotation is accepted. The UI never
-- claims a vehicle was purchased, shipped, cleared or delivered without one of these.
create type public.milestone_kind as enum (
  'supplier_confirmed_availability', 'vehicle_inspected', 'vehicle_purchased',
  'export_documents_ready', 'shipped', 'arrived_at_port', 'customs_cleared',
  'delivered_to_customer', 'other'
);

create table public.request_milestones (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  kind public.milestone_kind not null,
  occurred_on date not null,
  note text check (char_length(note) <= 1000),
  evidence_reference text check (char_length(evidence_reference) <= 300),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (occurred_on <= (now() at time zone 'Africa/Algiers')::date + 1)
);
create index request_milestones_request_idx on public.request_milestones (request_id, occurred_on);

create or replace function private.request_accepts_milestones(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.purchase_requests
                 where id = p_request_id and status in ('accepted', 'in_progress', 'completed'));
$$;

alter table public.request_milestones enable row level security;
create policy "milestones: customer or staff read" on public.request_milestones
  for select to authenticated
  using (
    (select private.is_staff())
    or exists (select 1 from public.purchase_requests r
               where r.id = request_id and r.customer_id = (select auth.uid()))
  );
create policy "milestones: staff record" on public.request_milestones
  for insert to authenticated
  with check ((select private.is_staff()) and recorded_by = (select auth.uid())
              and (select private.request_accepts_milestones(request_id)));
revoke update, delete on public.request_milestones from anon, authenticated;

create or replace function private.milestone_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
begin
  select * into r from public.purchase_requests where id = new.request_id;
  perform private.audit('request.milestone', 'purchase_request', new.request_id::text,
    jsonb_build_object('kind', new.kind, 'occurred_on', new.occurred_on));
  perform private.notify(r.customer_id, 'request.milestone',
    jsonb_build_object('reference', r.reference, 'kind', new.kind),
    '/account/requests/' || r.id::text);
  return new;
end;
$$;
create trigger request_milestones_recorded after insert on public.request_milestones
  for each row execute function private.milestone_recorded();

-- ---------------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------------
create type public.quotation_status as enum ('submitted', 'sent', 'accepted', 'declined', 'withdrawn', 'rejected');
create type public.fee_kind as enum (
  'vehicle_price', 'domestic_transport', 'international_shipping', 'insurance', 'inspection',
  'taxes_and_customs', 'documentation_admin', 'platform_service_fee', 'partner_service_fee', 'other'
);
-- Who is paid. The customer is always the payer of a quotation line.
create type public.fee_party as enum ('supplier', 'platform', 'partner', 'public_authority', 'other');

create sequence public.quotation_ref_seq;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'Q-' || to_char(now() at time zone 'Africa/Algiers', 'YYYY') || '-'
    || lpad(nextval('public.quotation_ref_seq')::text, 6, '0')
  ),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  supplier_id uuid references public.supplier_profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  status public.quotation_status not null default 'submitted',
  currency char(3) not null references public.currencies (code),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  valid_until date not null,
  terms text check (char_length(terms) <= 3000),
  message_to_customer text check (char_length(message_to_customer) <= 2000),
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  decline_reason text check (char_length(decline_reason) <= 1000),
  submitted_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.quotations is 'A quotation is an offer, never a guaranteed final price. Taxes and customs lines are always estimates.';
create index quotations_request_idx on public.quotations (request_id);
create index quotations_supplier_idx on public.quotations (supplier_id, created_at desc);
create index quotations_status_idx on public.quotations (status);
create trigger quotations_touch before update on public.quotations
  for each row execute function private.touch_updated_at();

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  position smallint not null default 0,
  kind public.fee_kind not null,
  description text not null check (char_length(description) between 2 and 300),
  amount numeric(14, 2) not null check (amount >= 0),
  payee public.fee_party not null,
  is_estimate boolean not null default false,
  -- The nature of each fee and who receives it must be coherent: a platform or
  -- referral fee can never be presented as a customs charge, and vice versa.
  check ((kind = 'taxes_and_customs') = (payee = 'public_authority')),
  check (kind <> 'taxes_and_customs' or is_estimate),
  check (kind <> 'platform_service_fee' or payee = 'platform'),
  check (payee <> 'platform' or kind in ('platform_service_fee', 'documentation_admin')),
  check (kind <> 'partner_service_fee' or payee = 'partner'),
  check (kind <> 'vehicle_price' or payee = 'supplier')
);
create index quotation_items_quotation_idx on public.quotation_items (quotation_id, position);

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

create policy "quotations: staff, supplier or customer read" on public.quotations
  for select to authenticated
  using (
    (select private.is_staff())
    or (supplier_id is not null and supplier_id = (select private.my_supplier_id()))
    or (
      (status in ('sent', 'accepted', 'declined') or (status = 'withdrawn' and sent_at is not null))
      and exists (select 1 from public.purchase_requests r
                  where r.id = request_id and r.customer_id = (select auth.uid()))
    )
  );
create policy "quotation_items: visible with quotation" on public.quotation_items
  for select to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id));
revoke insert, update, delete on public.quotations, public.quotation_items from anon, authenticated;

-- Submit a quotation (supplier for a forwarded request, or staff).
-- p_items: [{"kind": "...", "description": "...", "amount": 123.45, "payee": "...", "is_estimate": false}, ...]
create or replace function public.submit_quotation(
  p_request_id uuid, p_currency char(3), p_valid_until date, p_terms text, p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.purchase_requests%rowtype;
  v_actor text;
  v_quote_id uuid;
  v_item jsonb;
  v_pos integer := 0;
  v_total numeric(14, 2) := 0;
begin
  select * into r from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if private.is_staff() then
    v_actor := 'staff';
    if r.status not in ('under_review', 'supplier_contacted', 'quotation_received', 'awaiting_customer_decision') then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
  elsif r.supplier_id is not null and r.supplier_id = private.my_approved_supplier_id() then
    v_actor := 'supplier';
    if r.status not in ('supplier_contacted', 'quotation_received', 'awaiting_customer_decision') then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from public.currencies where code = p_currency and is_active) then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  if p_valid_until is null or p_valid_until < current_date then
    raise exception 'invalid_valid_until' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  insert into public.quotations (request_id, supplier_id, created_by, currency, valid_until, terms)
  values (p_request_id, r.supplier_id, auth.uid(), p_currency, p_valid_until, nullif(trim(p_terms), ''))
  returning id into v_quote_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.quotation_items (quotation_id, position, kind, description, amount, payee, is_estimate)
    values (
      v_quote_id, v_pos,
      (v_item ->> 'kind')::public.fee_kind,
      trim(v_item ->> 'description'),
      round((v_item ->> 'amount')::numeric, 2),
      (v_item ->> 'payee')::public.fee_party,
      -- Taxes and customs are never an official assessment: always stored as estimates.
      coalesce((v_item ->> 'is_estimate')::boolean, false) or (v_item ->> 'kind') = 'taxes_and_customs'
    );
    v_total := v_total + round((v_item ->> 'amount')::numeric, 2);
    v_pos := v_pos + 1;
  end loop;

  update public.quotations set total_amount = v_total where id = v_quote_id;

  if r.status in ('under_review', 'supplier_contacted') then
    perform private.apply_request_status(p_request_id, 'quotation_received', 'system',
      'quotation submitted by ' || v_actor);
  end if;

  perform private.audit('quotation.submitted', 'quotation', v_quote_id::text,
    jsonb_build_object('request_id', p_request_id, 'total', v_total, 'currency', p_currency, 'actor', v_actor));
  perform private.notify_staff('quotation.submitted',
    jsonb_build_object('reference', r.reference), '/admin/requests/' || r.id::text);
  return v_quote_id;
end;
$$;

-- Staff reviews a submitted quotation and sends it to the customer.
create or replace function public.send_quotation(p_quotation_id uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotations%rowtype;
  r public.purchase_requests%rowtype;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if q.status <> 'submitted' or q.valid_until < current_date then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  select * into r from public.purchase_requests where id = q.request_id for update;
  if r.status not in ('under_review', 'supplier_contacted', 'quotation_received', 'awaiting_customer_decision') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  update public.quotations set status = 'sent', sent_at = now(), sent_by = auth.uid(),
    message_to_customer = nullif(trim(p_message), '')
  where id = p_quotation_id;

  if r.status <> 'awaiting_customer_decision' then
    perform private.apply_request_status(r.id, 'awaiting_customer_decision', 'system', null);
  end if;
  perform private.audit('quotation.sent', 'quotation', p_quotation_id::text, '{}'::jsonb);
  perform private.notify(r.customer_id, 'quotation.received',
    jsonb_build_object('reference', r.reference, 'quotation', q.reference),
    '/account/requests/' || r.id::text);
end;
$$;

create or replace function public.reject_quotation(p_quotation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotations%rowtype;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if q.status <> 'submitted' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.quotations set status = 'rejected', rejection_reason = trim(p_reason), decided_at = now()
  where id = p_quotation_id;
  perform private.audit('quotation.rejected', 'quotation', p_quotation_id::text,
    jsonb_build_object('reason', p_reason));
  perform private.notify(
    (select owner_id from public.supplier_profiles where id = q.supplier_id),
    'quotation.rejected', jsonb_build_object('quotation', q.reference, 'reason', p_reason),
    '/supplier/quotations');
end;
$$;

create or replace function public.withdraw_quotation(p_quotation_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotations%rowtype;
  r public.purchase_requests%rowtype;
begin
  select * into q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (private.is_staff() or (q.supplier_id is not null and q.supplier_id = private.my_supplier_id())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if q.status not in ('submitted', 'sent') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.quotations set status = 'withdrawn', rejection_reason = nullif(trim(p_reason), ''), decided_at = now()
  where id = p_quotation_id;

  select * into r from public.purchase_requests where id = q.request_id for update;
  if q.status = 'sent' then
    perform private.notify(r.customer_id, 'quotation.withdrawn',
      jsonb_build_object('reference', r.reference, 'quotation', q.reference),
      '/account/requests/' || r.id::text);
    if r.status = 'awaiting_customer_decision' and not exists (
      select 1 from public.quotations where request_id = r.id and status = 'sent'
    ) then
      perform private.apply_request_status(r.id, 'under_review', 'system', 'quotation withdrawn');
    end if;
  end if;
  perform private.audit('quotation.withdrawn', 'quotation', p_quotation_id::text, '{}'::jsonb);
  perform private.notify_staff('quotation.withdrawn', jsonb_build_object('quotation', q.reference),
    '/admin/requests/' || r.id::text);
end;
$$;

-- Customer accepts or declines a quotation that was sent to them.
create or replace function public.respond_to_quotation(
  p_quotation_id uuid, p_accept boolean, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotations%rowtype;
  r public.purchase_requests%rowtype;
begin
  select * into q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into r from public.purchase_requests where id = q.request_id for update;
  if r.customer_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if q.status <> 'sent' or r.status <> 'awaiting_customer_decision' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if q.valid_until < current_date then
    raise exception 'quotation_expired' using errcode = 'P0001';
  end if;

  if p_accept then
    update public.quotations set status = 'accepted', decided_at = now() where id = q.id;
    update public.quotations set status = 'declined', decline_reason = 'another_quotation_accepted', decided_at = now()
    where request_id = r.id and id <> q.id and status in ('submitted', 'sent');
    perform private.apply_request_status(r.id, 'accepted', 'system', 'quotation ' || q.reference || ' accepted by customer');
  else
    update public.quotations set status = 'declined', decline_reason = nullif(trim(p_reason), ''), decided_at = now()
    where id = q.id;
    if not exists (select 1 from public.quotations where request_id = r.id and status = 'sent') then
      perform private.apply_request_status(r.id, 'under_review', 'system', 'quotation ' || q.reference || ' declined by customer');
    end if;
  end if;

  perform private.audit(case when p_accept then 'quotation.accepted' else 'quotation.declined' end,
    'quotation', q.id::text, jsonb_build_object('reason', p_reason));
  perform private.notify_staff(case when p_accept then 'quotation.accepted' else 'quotation.declined' end,
    jsonb_build_object('reference', r.reference, 'quotation', q.reference), '/admin/requests/' || r.id::text);
  if q.supplier_id is not null then
    perform private.notify((select owner_id from public.supplier_profiles where id = q.supplier_id),
      case when p_accept then 'quotation.accepted' else 'quotation.declined' end,
      jsonb_build_object('reference', r.reference, 'quotation', q.reference), '/supplier/quotations');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner service requests and service quotations
-- ---------------------------------------------------------------------------
create type public.service_request_status as enum
  ('requested', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled');

create sequence public.service_request_ref_seq;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'S-' || to_char(now() at time zone 'Africa/Algiers', 'YYYY') || '-'
    || lpad(nextval('public.service_request_ref_seq')::text, 6, '0')
  ),
  purchase_request_id uuid references public.purchase_requests (id) on delete set null,
  partner_id uuid not null references public.partner_profiles (id) on delete restrict,
  category_code text not null references public.service_categories (code) on update cascade,
  description text not null check (char_length(description) between 10 and 3000),
  status public.service_request_status not null default 'requested',
  status_note text check (char_length(status_note) <= 1000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_partner_idx on public.service_requests (partner_id, created_at desc);
create index service_requests_purchase_idx on public.service_requests (purchase_request_id);
create trigger service_requests_touch before update on public.service_requests
  for each row execute function private.touch_updated_at();

create table public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  partner_id uuid not null references public.partner_profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null references public.currencies (code),
  valid_until date not null,
  notes text check (char_length(notes) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'declined', 'withdrawn')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index service_quotes_request_idx on public.service_quotes (service_request_id);

alter table public.service_requests enable row level security;
alter table public.service_quotes enable row level security;

create policy "service_requests: partner or staff read" on public.service_requests
  for select to authenticated
  using (partner_id = (select private.my_approved_partner_id()) or (select private.is_staff()));
create policy "service_requests: staff create" on public.service_requests
  for insert to authenticated
  with check ((select private.is_staff()) and status = 'requested');
revoke update, delete on public.service_requests from anon, authenticated;

create policy "service_quotes: partner or staff read" on public.service_quotes
  for select to authenticated
  using (partner_id = (select private.my_partner_id()) or (select private.is_staff()));
revoke insert, update, delete on public.service_quotes from anon, authenticated;

create or replace function private.service_requests_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.partner_profiles where id = new.partner_id and status = 'approved') then
    raise exception 'partner_not_approved' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.partner_service_categories
                 where partner_id = new.partner_id and category_code = new.category_code) then
    raise exception 'partner_category_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger service_requests_validate before insert on public.service_requests
  for each row execute function private.service_requests_created();

create or replace function private.service_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit('service_request.created', 'service_request', new.id::text,
    jsonb_build_object('partner_id', new.partner_id, 'category', new.category_code));
  perform private.notify((select owner_id from public.partner_profiles where id = new.partner_id),
    'service_request.created', jsonb_build_object('reference', new.reference),
    '/partner/services/' || new.id::text);
  return new;
end;
$$;
create trigger service_requests_notify after insert on public.service_requests
  for each row execute function private.service_requests_notify();

create or replace function public.submit_service_quote(
  p_service_request_id uuid, p_amount numeric, p_currency char(3), p_valid_until date, p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.service_requests%rowtype;
  v_id uuid;
begin
  select * into s from public.service_requests where id = p_service_request_id for update;
  if not found or s.partner_id is distinct from private.my_approved_partner_id() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if s.status not in ('requested', 'quoted') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_valid_until is null or p_valid_until < current_date then
    raise exception 'invalid_valid_until' using errcode = '22023';
  end if;
  insert into public.service_quotes (service_request_id, partner_id, amount, currency, valid_until, notes)
  values (s.id, s.partner_id, round(p_amount, 2), p_currency, p_valid_until, nullif(trim(p_notes), ''))
  returning id into v_id;
  update public.service_requests set status = 'quoted' where id = s.id;
  perform private.audit('service_quote.submitted', 'service_request', s.id::text,
    jsonb_build_object('amount', p_amount, 'currency', p_currency));
  perform private.notify_staff('service_quote.submitted', jsonb_build_object('reference', s.reference),
    case when s.purchase_request_id is null then '/admin/partners'
         else '/admin/requests/' || s.purchase_request_id::text end);
  return v_id;
end;
$$;

create or replace function public.decide_service_quote(p_quote_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.service_quotes%rowtype;
  s public.service_requests%rowtype;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into q from public.service_quotes where id = p_quote_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if q.status <> 'submitted' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  select * into s from public.service_requests where id = q.service_request_id for update;
  if p_accept then
    if q.valid_until < current_date then
      raise exception 'quotation_expired' using errcode = 'P0001';
    end if;
    update public.service_quotes set status = 'accepted', decided_by = auth.uid(), decided_at = now() where id = q.id;
    update public.service_quotes set status = 'declined', decided_by = auth.uid(), decided_at = now()
    where service_request_id = s.id and id <> q.id and status = 'submitted';
    update public.service_requests set status = 'accepted' where id = s.id;
  else
    update public.service_quotes set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = q.id;
    if not exists (select 1 from public.service_quotes where service_request_id = s.id and status = 'submitted') then
      update public.service_requests set status = 'requested' where id = s.id;
    end if;
  end if;
  perform private.audit(case when p_accept then 'service_quote.accepted' else 'service_quote.declined' end,
    'service_request', s.id::text, jsonb_build_object('quote_id', q.id));
  perform private.notify((select owner_id from public.partner_profiles where id = s.partner_id),
    case when p_accept then 'service_quote.accepted' else 'service_quote.declined' end,
    jsonb_build_object('reference', s.reference), '/partner/services/' || s.id::text);
end;
$$;

create or replace function public.update_service_request_status(
  p_service_request_id uuid, p_status public.service_request_status, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.service_requests%rowtype;
  v_is_partner boolean;
  v_is_staff boolean := private.is_staff();
begin
  select * into s from public.service_requests where id = p_service_request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_is_partner := s.partner_id = private.my_approved_partner_id();
  if not (v_is_partner or v_is_staff) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (
    (s.status = 'accepted' and p_status = 'in_progress')
    or (s.status = 'in_progress' and p_status = 'completed')
    or (v_is_staff and p_status = 'cancelled' and s.status not in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.service_requests set status = p_status, status_note = nullif(trim(p_note), '') where id = s.id;
  perform private.audit('service_request.status_changed', 'service_request', s.id::text,
    jsonb_build_object('from', s.status, 'to', p_status));
  if v_is_partner then
    perform private.notify_staff('service_request.status_changed',
      jsonb_build_object('reference', s.reference, 'status', p_status),
      case when s.purchase_request_id is null then '/admin/partners'
           else '/admin/requests/' || s.purchase_request_id::text end);
  else
    perform private.notify((select owner_id from public.partner_profiles where id = s.partner_id),
      'service_request.status_changed', jsonb_build_object('reference', s.reference, 'status', p_status),
      '/partner/services/' || s.id::text);
  end if;
end;
$$;

-- Execution grants for RPCs (never anonymous).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.transition_purchase_request(uuid, public.request_status, text)',
    'public.assign_purchase_request(uuid, uuid)',
    'public.set_request_supplier(uuid, uuid)',
    'public.record_legal_review(uuid, public.legal_review_status, text)',
    'public.submit_quotation(uuid, char, date, text, jsonb)',
    'public.send_quotation(uuid, text)',
    'public.reject_quotation(uuid, text)',
    'public.withdraw_quotation(uuid, text)',
    'public.respond_to_quotation(uuid, boolean, text)',
    'public.submit_service_quote(uuid, numeric, char, date, text)',
    'public.decide_service_quote(uuid, boolean)',
    'public.update_service_request_status(uuid, public.service_request_status, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
