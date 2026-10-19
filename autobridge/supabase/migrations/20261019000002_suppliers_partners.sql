-- Suppliers, service partners, verification documents and verification records.

create table public.supplier_profiles (
  id uuid primary key default gen_random_uuid(),
  -- Business records are retained when a user account is removed; an administrator
  -- must first transfer or anonymise the business (see docs/DATA_RETENTION.md).
  owner_id uuid not null unique references public.profiles (id) on delete restrict default auth.uid(),
  business_name text not null check (char_length(business_name) between 2 and 160),
  legal_form text check (char_length(legal_form) <= 80),
  registration_number text check (char_length(registration_number) <= 80),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 80),
  address text check (char_length(address) <= 300),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text not null check (char_length(contact_phone) between 6 and 32),
  website text check (website is null or website ~* '^https?://'),
  description text check (char_length(description) <= 2000),
  services_offered text check (char_length(services_offered) <= 1000),
  status public.business_status not null default 'pending',
  status_reason text check (char_length(status_reason) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.supplier_profiles.is_demo is 'Fictional demonstration data. Never shown as a real business.';
create index supplier_profiles_status_idx on public.supplier_profiles (status);
create trigger supplier_profiles_touch before update on public.supplier_profiles
  for each row execute function private.touch_updated_at();

create table public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete restrict default auth.uid(),
  business_name text not null check (char_length(business_name) between 2 and 160),
  legal_form text check (char_length(legal_form) <= 80),
  registration_number text check (char_length(registration_number) <= 80),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 80),
  operating_countries text[] not null default '{}' check (private.valid_country_codes(operating_countries)),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text not null check (char_length(contact_phone) between 6 and 32),
  website text check (website is null or website ~* '^https?://'),
  description text check (char_length(description) <= 2000),
  status public.business_status not null default 'pending',
  status_reason text check (char_length(status_reason) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_profiles_status_idx on public.partner_profiles (status);
create trigger partner_profiles_touch before update on public.partner_profiles
  for each row execute function private.touch_updated_at();

create table public.partner_service_categories (
  partner_id uuid not null references public.partner_profiles (id) on delete cascade,
  category_code text not null references public.service_categories (code) on update cascade,
  primary key (partner_id, category_code)
);

-- Ownership helpers ---------------------------------------------------------
create or replace function private.my_supplier_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.supplier_profiles where owner_id = (select auth.uid());
$$;

create or replace function private.my_approved_supplier_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.supplier_profiles
  where owner_id = (select auth.uid()) and status = 'approved';
$$;

create or replace function private.my_partner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.partner_profiles where owner_id = (select auth.uid());
$$;

create or replace function private.my_approved_partner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.partner_profiles
  where owner_id = (select auth.uid()) and status = 'approved';
$$;

-- Guard: applicants cannot approve themselves or change moderation fields.
create or replace function private.business_profile_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_client_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.status := 'pending';
    new.status_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_demo := false;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id
     or new.status is distinct from old.status
     or new.status_reason is distinct from old.status_reason
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.is_demo is distinct from old.is_demo then
    raise exception 'protected_fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger supplier_profiles_guard before insert or update on public.supplier_profiles
  for each row execute function private.business_profile_guard();
create trigger partner_profiles_guard before insert or update on public.partner_profiles
  for each row execute function private.business_profile_guard();

-- RLS -----------------------------------------------------------------------
alter table public.supplier_profiles enable row level security;
alter table public.partner_profiles enable row level security;
alter table public.partner_service_categories enable row level security;

create policy "supplier_profiles: owner or staff read" on public.supplier_profiles
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_staff()));
create policy "supplier_profiles: owner apply" on public.supplier_profiles
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
-- Suspended businesses cannot edit their profile.
create policy "supplier_profiles: owner or staff update" on public.supplier_profiles
  for update to authenticated
  using ((owner_id = (select auth.uid()) and status <> 'suspended') or (select private.is_staff()))
  with check ((owner_id = (select auth.uid()) and status <> 'suspended') or (select private.is_staff()));

create policy "partner_profiles: owner or staff read" on public.partner_profiles
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_staff()));
create policy "partner_profiles: owner apply" on public.partner_profiles
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "partner_profiles: owner or staff update" on public.partner_profiles
  for update to authenticated
  using ((owner_id = (select auth.uid()) and status <> 'suspended') or (select private.is_staff()))
  with check ((owner_id = (select auth.uid()) and status <> 'suspended') or (select private.is_staff()));

create policy "partner_categories: read" on public.partner_service_categories
  for select to authenticated
  using (partner_id = (select private.my_partner_id()) or (select private.is_staff()));
create policy "partner_categories: owner write" on public.partner_service_categories
  for insert to authenticated
  with check (partner_id = (select private.my_partner_id()) or (select private.is_staff()));
create policy "partner_categories: owner delete" on public.partner_service_categories
  for delete to authenticated
  using (partner_id = (select private.my_partner_id()) or (select private.is_staff()));

revoke delete on public.supplier_profiles, public.partner_profiles from anon, authenticated;

-- Verification documents (private storage objects) ---------------------------
create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.supplier_profiles (id) on delete cascade,
  partner_id uuid references public.partner_profiles (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  doc_type text not null check (doc_type in
    ('business_registration', 'tax_registration', 'representative_id', 'proof_of_address',
     'insurance_certificate', 'professional_license', 'other')),
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  expires_on date,
  created_at timestamptz not null default now(),
  check (num_nonnulls(supplier_id, partner_id) = 1)
);
create index verification_documents_supplier_idx on public.verification_documents (supplier_id);
create index verification_documents_partner_idx on public.verification_documents (partner_id);
create index verification_documents_expiry_idx on public.verification_documents (expires_on) where expires_on is not null;

alter table public.verification_documents enable row level security;
create policy "verification_documents: owner or staff read" on public.verification_documents
  for select to authenticated
  using (uploaded_by = (select auth.uid()) or (select private.is_staff()));
create policy "verification_documents: owner insert" on public.verification_documents
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and (
      (supplier_id is not null and supplier_id = (select private.my_supplier_id()))
      or (partner_id is not null and partner_id = (select private.my_partner_id()))
    )
  );
create policy "verification_documents: owner delete" on public.verification_documents
  for delete to authenticated
  using (uploaded_by = (select auth.uid()));
revoke update on public.verification_documents from anon, authenticated;

-- Verification records: what was actually checked, by whom, and with what result.
create type public.verification_check as enum (
  'business_registration', 'tax_registration', 'representative_identity', 'business_address',
  'phone_contact', 'email_contact', 'site_visit', 'trade_references', 'other'
);
create type public.verification_result as enum ('passed', 'failed', 'inconclusive');

create table public.supplier_verification_records (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.supplier_profiles (id) on delete cascade,
  partner_id uuid references public.partner_profiles (id) on delete cascade,
  check_type public.verification_check not null,
  result public.verification_result not null,
  method text not null check (char_length(method) between 2 and 300),
  notes text check (char_length(notes) <= 2000),
  evidence_document_id uuid references public.verification_documents (id) on delete restrict,
  verified_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(supplier_id, partner_id) = 1),
  check (expires_at is null or expires_at > verified_at)
);
comment on table public.supplier_verification_records is
  'Recorded administrative verification checks for suppliers and partners. Internal notes are staff-only; '
  'the public sees only passed, unexpired check types via public.public_business_verifications.';
create index verification_records_supplier_idx on public.supplier_verification_records (supplier_id);
create index verification_records_partner_idx on public.supplier_verification_records (partner_id);

alter table public.supplier_verification_records enable row level security;
create policy "verification_records: staff read" on public.supplier_verification_records
  for select to authenticated using ((select private.is_staff()));
create policy "verification_records: staff insert" on public.supplier_verification_records
  for insert to authenticated
  with check ((select private.is_staff()) and verified_by = (select auth.uid()));
revoke update, delete on public.supplier_verification_records from anon, authenticated;

create or replace function private.verification_record_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit('verification.recorded',
    case when new.supplier_id is not null then 'supplier' else 'partner' end,
    coalesce(new.supplier_id, new.partner_id)::text,
    jsonb_build_object('check_type', new.check_type, 'result', new.result));
  return new;
end;
$$;
create trigger verification_records_audit after insert on public.supplier_verification_records
  for each row execute function private.verification_record_audit();

-- Public-safe projections ----------------------------------------------------
-- These views run with the owner's privileges and expose only safe columns of
-- approved businesses. Contact details, registration numbers and addresses stay private.
create view public.public_suppliers with (security_barrier = true) as
select
  s.id,
  s.business_name,
  s.country_code,
  s.city,
  s.description,
  s.services_offered,
  s.website,
  s.is_demo,
  s.created_at as member_since,
  exists (
    select 1 from public.supplier_verification_records r
    where r.supplier_id = s.id and r.result = 'passed'
      and (r.expires_at is null or r.expires_at > now())
  ) as has_verified_checks
from public.supplier_profiles s
where s.status = 'approved';

create view public.public_partners with (security_barrier = true) as
select
  p.id,
  p.business_name,
  p.country_code,
  p.city,
  p.operating_countries,
  p.description,
  p.website,
  p.is_demo,
  coalesce(
    (select array_agg(c.category_code order by c.category_code)
     from public.partner_service_categories c where c.partner_id = p.id),
    '{}'
  ) as categories
from public.partner_profiles p
where p.status = 'approved';

create view public.public_business_verifications with (security_barrier = true) as
select
  r.id,
  r.supplier_id,
  r.partner_id,
  r.check_type,
  r.method,
  r.verified_at,
  r.expires_at
from public.supplier_verification_records r
left join public.supplier_profiles s on s.id = r.supplier_id
left join public.partner_profiles p on p.id = r.partner_id
where r.result = 'passed'
  and (r.expires_at is null or r.expires_at > now())
  and coalesce(s.status, p.status) = 'approved';

grant select on public.public_suppliers, public.public_partners, public.public_business_verifications
  to anon, authenticated;

-- Workflows -----------------------------------------------------------------
-- Only administrators approve, reject or suspend suppliers and partners.
create or replace function public.admin_set_business_status(
  p_kind text, p_id uuid, p_status public.business_status, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_old public.business_status;
  v_name text;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind not in ('supplier', 'partner') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_status in ('rejected', 'suspended') and coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  if p_kind = 'supplier' then
    select owner_id, status, business_name into v_owner, v_old, v_name
    from public.supplier_profiles where id = p_id for update;
  else
    select owner_id, status, business_name into v_owner, v_old, v_name
    from public.partner_profiles where id = p_id for update;
  end if;
  if v_owner is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_old = p_status then
    return;
  end if;
  if not (
    (v_old = 'pending' and p_status in ('approved', 'rejected'))
    or (v_old = 'approved' and p_status = 'suspended')
    or (v_old = 'suspended' and p_status in ('approved', 'rejected'))
    or (v_old = 'rejected' and p_status = 'pending')
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  if p_kind = 'supplier' then
    update public.supplier_profiles
    set status = p_status, status_reason = nullif(trim(p_reason), ''),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
    -- A suspended supplier's listings are withdrawn from the marketplace by the
    -- public views (they only show approved suppliers); nothing else to do here.
  else
    update public.partner_profiles
    set status = p_status, status_reason = nullif(trim(p_reason), ''),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  end if;

  perform private.audit('business.status_changed', p_kind, p_id::text,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason));
  perform private.notify(v_owner, p_kind || '.status.' || p_status::text,
    jsonb_build_object('name', v_name, 'reason', p_reason),
    case when p_kind = 'supplier' then '/supplier' else '/partner' end);
end;
$$;

-- Applicant resubmits after a rejection (having edited their profile).
create or replace function public.resubmit_business_application(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_kind = 'supplier' then
    update public.supplier_profiles set status = 'pending', status_reason = null
    where owner_id = auth.uid() and status = 'rejected' returning id into v_id;
  elsif p_kind = 'partner' then
    update public.partner_profiles set status = 'pending', status_reason = null
    where owner_id = auth.uid() and status = 'rejected' returning id into v_id;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if v_id is null then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  perform private.audit('business.resubmitted', p_kind, v_id::text);
  perform private.notify_staff(p_kind || '.application_submitted', '{}'::jsonb,
    '/admin/' || p_kind || 's/' || v_id::text);
end;
$$;

create or replace function private.business_application_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := case when tg_table_name = 'supplier_profiles' then 'supplier' else 'partner' end;
begin
  perform private.audit('business.applied', v_kind, new.id::text);
  perform private.notify_staff(v_kind || '.application_submitted',
    jsonb_build_object('name', new.business_name), '/admin/' || v_kind || 's/' || new.id::text);
  return new;
end;
$$;
create trigger supplier_profiles_created after insert on public.supplier_profiles
  for each row execute function private.business_application_created();
create trigger partner_profiles_created after insert on public.partner_profiles
  for each row execute function private.business_application_created();

revoke execute on function public.admin_set_business_status(text, uuid, public.business_status, text) from public, anon;
revoke execute on function public.resubmit_business_application(text) from public, anon;
grant execute on function public.admin_set_business_status(text, uuid, public.business_status, text) to authenticated;
grant execute on function public.resubmit_business_application(text) to authenticated;
