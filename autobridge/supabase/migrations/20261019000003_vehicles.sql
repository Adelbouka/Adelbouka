-- Vehicle listings, images, favorites and listing reports.
--
-- A row in `vehicles` is one supplier listing of one physical vehicle (the vehicle
-- facts and the commercial listing are kept together; see docs/ARCHITECTURE.md).
-- The public never reads this table directly: it reads `public.marketplace_vehicles`,
-- which exposes only published, unexpired listings of approved suppliers and never the VIN.

create type public.body_type as enum
  ('sedan', 'hatchback', 'suv', 'crossover', 'pickup', 'van', 'coupe', 'wagon', 'convertible', 'minivan', 'other');
create type public.fuel_type as enum
  ('petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'other');
create type public.transmission_type as enum ('manual', 'automatic');
create type public.vehicle_condition as enum ('new', 'used');
create type public.listing_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');
create type public.availability_status as enum ('available', 'reserved', 'sold', 'unavailable');

create sequence public.vehicle_slug_seq;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  -- Always derived by private.vehicles_derive(); the default only satisfies NOT NULL.
  slug text not null unique default gen_random_uuid()::text,
  supplier_id uuid not null references public.supplier_profiles (id) on delete restrict,
  make_id smallint not null references public.vehicle_makes (id),
  model text not null check (char_length(model) between 1 and 80),
  trim_level text check (char_length(trim_level) <= 80),
  body_type public.body_type not null default 'other',
  manufacture_year smallint not null check (manufacture_year between 1950 and 2100),
  first_registration_date date,
  mileage_km integer not null check (mileage_km between 0 and 2000000),
  fuel_type public.fuel_type not null,
  transmission public.transmission_type not null,
  engine_cc integer check (engine_cc is null or engine_cc between 50 and 10000),
  power_kw integer check (power_kw is null or power_kw between 1 and 2000),
  condition public.vehicle_condition not null,
  exterior_color text check (char_length(exterior_color) <= 40),
  doors smallint check (doors is null or doors between 1 and 6),
  seats smallint check (seats is null or seats between 1 and 9),
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  description text check (char_length(description) <= 5000),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 80),
  price_amount numeric(14, 2) not null check (price_amount > 0),
  price_currency char(3) not null references public.currencies (code),
  status public.listing_status not null default 'draft',
  availability public.availability_status not null default 'available',
  review_reason text check (char_length(review_reason) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  last_confirmed_at timestamptz not null default now(),
  -- Paid promotion. Always disclosed in the UI as "Sponsored".
  promoted_until timestamptz,
  is_demo boolean not null default false,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_registration_date is null
         or first_registration_date >= make_date(manufacture_year - 1, 1, 1)),
  check (fuel_type <> 'electric' or engine_cc is null)
);
comment on column public.vehicles.manufacture_year is 'Model/manufacturing year. Distinct from first_registration_date and from legal import eligibility.';
comment on column public.vehicles.vin is 'Private. Exposed publicly only in masked form.';

create index vehicles_supplier_idx on public.vehicles (supplier_id);
create index vehicles_status_idx on public.vehicles (status, availability);
create index vehicles_make_idx on public.vehicles (make_id);
create index vehicles_price_idx on public.vehicles (price_amount);
create index vehicles_year_idx on public.vehicles (manufacture_year);
create index vehicles_published_idx on public.vehicles (published_at desc);
create index vehicles_search_idx on public.vehicles using gin (search_text extensions.gin_trgm_ops);

create trigger vehicles_touch before update on public.vehicles
  for each row execute function private.touch_updated_at();

-- Derived columns: slug and search text.
create or replace function private.vehicles_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_make text;
  v_make_slug text;
begin
  if new.manufacture_year > extract(year from now())::int + 1 then
    raise exception 'invalid_manufacture_year' using errcode = '22023';
  end if;
  if new.first_registration_date is not null and new.first_registration_date > current_date then
    raise exception 'invalid_first_registration_date' using errcode = '22023';
  end if;
  select name, slug into v_make, v_make_slug from public.vehicle_makes where id = new.make_id;
  if tg_op = 'INSERT' then
    new.slug := v_make_slug || '-'
      || coalesce(nullif(trim(both '-' from regexp_replace(lower(new.model), '[^a-z0-9]+', '-', 'g')), ''), 'model')
      || '-' || new.manufacture_year || '-' || nextval('public.vehicle_slug_seq');
  end if;
  new.search_text := lower(concat_ws(' ', v_make, new.model, new.trim_level, new.body_type::text,
    new.fuel_type::text, new.city, new.exterior_color));
  return new;
end;
$$;
create trigger vehicles_derive before insert or update on public.vehicles
  for each row execute function private.vehicles_derive();

-- Guard: suppliers manage content and availability; moderation is staff-only.
create or replace function private.vehicles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_substantive_change boolean;
begin
  if not private.is_client_request() or private.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      new.status := 'draft';
    end if;
    new.review_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.published_at := null;
    new.expires_at := null;
    new.promoted_until := null;
    new.is_demo := false;
    new.last_confirmed_at := now();
    return new;
  end if;

  if new.supplier_id is distinct from old.supplier_id
     or new.review_reason is distinct from old.review_reason
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.published_at is distinct from old.published_at
     or new.expires_at is distinct from old.expires_at
     or new.promoted_until is distinct from old.promoted_until
     or new.is_demo is distinct from old.is_demo then
    raise exception 'protected_fields' using errcode = '42501';
  end if;

  if old.status = 'archived' then
    raise exception 'listing_archived' using errcode = 'P0001';
  end if;

  -- Allowed supplier status moves.
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('pending_review', 'archived'))
    or (old.status = 'pending_review' and new.status in ('draft', 'archived'))
    or (old.status = 'rejected' and new.status in ('pending_review', 'draft', 'archived'))
    or (old.status = 'published' and new.status = 'archived')
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  -- Confirming availability can only stamp the current time.
  if new.last_confirmed_at is distinct from old.last_confirmed_at then
    new.last_confirmed_at := now();
  end if;

  -- Editing the facts of a published listing sends it back to review.
  -- Price and availability updates do not require a new review.
  v_substantive_change :=
       new.make_id is distinct from old.make_id
    or new.model is distinct from old.model
    or new.trim_level is distinct from old.trim_level
    or new.body_type is distinct from old.body_type
    or new.manufacture_year is distinct from old.manufacture_year
    or new.first_registration_date is distinct from old.first_registration_date
    or new.mileage_km is distinct from old.mileage_km
    or new.fuel_type is distinct from old.fuel_type
    or new.transmission is distinct from old.transmission
    or new.engine_cc is distinct from old.engine_cc
    or new.condition is distinct from old.condition
    or new.vin is distinct from old.vin
    or new.description is distinct from old.description
    or new.country_code is distinct from old.country_code;
  if old.status = 'published' and new.status = 'published' and v_substantive_change then
    new.status := 'pending_review';
  end if;

  return new;
end;
$$;
create trigger vehicles_guard before insert or update on public.vehicles
  for each row execute function private.vehicles_guard();

create or replace function private.vehicles_notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending_review'
     and (tg_op = 'INSERT' or old.status is distinct from 'pending_review') then
    perform private.notify_staff('vehicle.pending_review',
      jsonb_build_object('slug', new.slug), '/admin/vehicles/' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger vehicles_notify_review after insert or update of status on public.vehicles
  for each row execute function private.vehicles_notify_review();

alter table public.vehicles enable row level security;

create policy "vehicles: owner or staff read" on public.vehicles
  for select to authenticated
  using (supplier_id = (select private.my_supplier_id()) or (select private.is_staff()));
create policy "vehicles: approved supplier insert" on public.vehicles
  for insert to authenticated
  with check (supplier_id = (select private.my_approved_supplier_id()) or (select private.is_staff()));
create policy "vehicles: approved owner or staff update" on public.vehicles
  for update to authenticated
  using (supplier_id = (select private.my_approved_supplier_id()) or (select private.is_staff()))
  with check (supplier_id = (select private.my_approved_supplier_id()) or (select private.is_staff()));
create policy "vehicles: owner delete drafts" on public.vehicles
  for delete to authenticated
  using (supplier_id = (select private.my_approved_supplier_id()) and status in ('draft', 'rejected'));

-- Images --------------------------------------------------------------------
create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  storage_path text unique,
  external_url text check (external_url is null or external_url ~ '^https://'),
  position smallint not null default 0,
  alt_text text check (char_length(alt_text) <= 200),
  credit text check (char_length(credit) <= 200),
  created_at timestamptz not null default now(),
  check (num_nonnulls(storage_path, external_url) = 1)
);
create index vehicle_images_vehicle_idx on public.vehicle_images (vehicle_id, position);

create or replace function private.vehicle_images_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.vehicle_images where vehicle_id = new.vehicle_id) >= 20 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger vehicle_images_limit before insert on public.vehicle_images
  for each row execute function private.vehicle_images_limit();

-- Only external URLs on an allow-list may be stored by clients (staff seeds use them);
-- suppliers upload to storage.
create or replace function private.vehicle_images_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request() and not private.is_staff() then
    if new.external_url is not null then
      raise exception 'external_images_not_allowed' using errcode = '42501';
    end if;
    if split_part(new.storage_path, '/', 1) <> auth.uid()::text
       or split_part(new.storage_path, '/', 2) <> new.vehicle_id::text then
      raise exception 'invalid_storage_path' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger vehicle_images_guard before insert or update on public.vehicle_images
  for each row execute function private.vehicle_images_guard();

-- Public marketplace projection ---------------------------------------------
create view public.marketplace_vehicles with (security_barrier = true) as
select
  v.id,
  v.slug,
  v.supplier_id,
  s.business_name as supplier_name,
  s.is_demo as supplier_is_demo,
  exists (
    select 1 from public.supplier_verification_records r
    where r.supplier_id = s.id and r.result = 'passed'
      and (r.expires_at is null or r.expires_at > now())
  ) as supplier_has_verified_checks,
  v.make_id,
  m.name as make_name,
  m.slug as make_slug,
  v.model,
  v.trim_level,
  v.body_type,
  v.manufacture_year,
  v.first_registration_date,
  v.mileage_km,
  v.fuel_type,
  v.transmission,
  v.engine_cc,
  v.power_kw,
  v.condition,
  v.exterior_color,
  v.doors,
  v.seats,
  case when v.vin is null then null else '••••••••••••' || right(v.vin, 5) end as vin_masked,
  v.description,
  v.country_code,
  v.city,
  v.price_amount,
  v.price_currency,
  v.availability,
  v.published_at,
  v.updated_at,
  v.expires_at,
  v.last_confirmed_at,
  (v.last_confirmed_at < now() - interval '30 days') as is_stale,
  (v.promoted_until is not null and v.promoted_until > now()) as is_sponsored,
  v.is_demo,
  v.search_text,
  (select coalesce(i.external_url, i.storage_path) from public.vehicle_images i
    where i.vehicle_id = v.id order by i.position, i.created_at limit 1) as cover_image,
  (select i.storage_path is not null from public.vehicle_images i
    where i.vehicle_id = v.id order by i.position, i.created_at limit 1) as cover_is_storage
from public.vehicles v
join public.supplier_profiles s on s.id = v.supplier_id
join public.vehicle_makes m on m.id = v.make_id
where v.status = 'published'
  and s.status = 'approved'
  and (v.expires_at is null or v.expires_at > now());

grant select on public.marketplace_vehicles to anon, authenticated;

create or replace function private.vehicle_is_public(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.marketplace_vehicles where id = p_vehicle_id);
$$;

create or replace function private.vehicle_owned_by_me(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles
    where id = p_vehicle_id and supplier_id = private.my_approved_supplier_id()
  );
$$;

alter table public.vehicle_images enable row level security;
create policy "vehicle_images: read public or own or staff" on public.vehicle_images
  for select
  using (
    (select private.vehicle_is_public(vehicle_id))
    or (select private.vehicle_owned_by_me(vehicle_id))
    or (select private.is_staff())
  );
create policy "vehicle_images: owner or staff insert" on public.vehicle_images
  for insert to authenticated
  with check ((select private.vehicle_owned_by_me(vehicle_id)) or (select private.is_staff()));
create policy "vehicle_images: owner or staff update" on public.vehicle_images
  for update to authenticated
  using ((select private.vehicle_owned_by_me(vehicle_id)) or (select private.is_staff()))
  with check ((select private.vehicle_owned_by_me(vehicle_id)) or (select private.is_staff()));
create policy "vehicle_images: owner or staff delete" on public.vehicle_images
  for delete to authenticated
  using ((select private.vehicle_owned_by_me(vehicle_id)) or (select private.is_staff()));

-- Moderation workflow -------------------------------------------------------
create or replace function public.admin_review_vehicle(
  p_vehicle_id uuid, p_decision text, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.vehicles%rowtype;
  v_owner uuid;
  v_validity integer;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v from public.vehicles where id = p_vehicle_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select owner_id into v_owner from public.supplier_profiles where id = v.supplier_id;

  if p_decision = 'approve' then
    if v.status <> 'pending_review' then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.supplier_profiles where id = v.supplier_id and status = 'approved') then
      raise exception 'supplier_not_approved' using errcode = 'P0001';
    end if;
    select coalesce((value #>> '{}')::integer, 90) into v_validity
      from public.site_settings where key = 'listing.validity_days';
    update public.vehicles set
      status = 'published',
      review_reason = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      published_at = coalesce(published_at, now()),
      expires_at = now() + make_interval(days => coalesce(v_validity, 90))
    where id = p_vehicle_id;
  elsif p_decision = 'reject' then
    if v.status not in ('pending_review', 'published') then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'reason_required' using errcode = '22023';
    end if;
    update public.vehicles set
      status = 'rejected', review_reason = trim(p_reason),
      reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_vehicle_id;
  elsif p_decision = 'archive' then
    update public.vehicles set status = 'archived', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_vehicle_id;
  else
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  perform private.audit('vehicle.' || p_decision, 'vehicle', p_vehicle_id::text,
    jsonb_build_object('from', v.status, 'reason', p_reason));
  if p_decision in ('approve', 'reject') then
    perform private.notify(v_owner, 'vehicle.' || p_decision || 'd',
      jsonb_build_object('slug', v.slug, 'reason', p_reason), '/supplier/vehicles/' || v.id::text);
  end if;
end;
$$;

create or replace function public.admin_archive_expired_listings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.vehicles set status = 'archived'
  where status = 'published' and expires_at is not null and expires_at <= now();
  get diagnostics v_count = row_count;
  perform private.audit('vehicle.archive_expired', 'vehicle', null, jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

-- Staff can set a disclosed paid promotion window.
create or replace function public.admin_set_promotion(p_vehicle_id uuid, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.vehicles set promoted_until = p_until where id = p_vehicle_id;
  perform private.audit('vehicle.promotion_set', 'vehicle', p_vehicle_id::text,
    jsonb_build_object('until', p_until));
end;
$$;

revoke execute on function public.admin_review_vehicle(uuid, text, text) from public, anon;
revoke execute on function public.admin_archive_expired_listings() from public, anon;
revoke execute on function public.admin_set_promotion(uuid, timestamptz) from public, anon;
grant execute on function public.admin_review_vehicle(uuid, text, text) to authenticated;
grant execute on function public.admin_archive_expired_listings() to authenticated;
grant execute on function public.admin_set_promotion(uuid, timestamptz) to authenticated;

-- Favorites -----------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);
create index favorites_vehicle_idx on public.favorites (vehicle_id);

alter table public.favorites enable row level security;
create policy "favorites: own read" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: own insert of public vehicles" on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.vehicle_is_public(vehicle_id)));
create policy "favorites: own delete" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- Listing reports -------------------------------------------------------------
create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null default auth.uid(),
  reason text not null check (reason in ('incorrect_information', 'suspected_fraud', 'no_longer_available', 'duplicate', 'inappropriate', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index listing_reports_status_idx on public.listing_reports (status, created_at desc);

alter table public.listing_reports enable row level security;
create policy "listing_reports: reporter or staff read" on public.listing_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_staff()));
create policy "listing_reports: authenticated create" on public.listing_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open'
              and resolved_by is null and resolution_note is null
              and (select private.vehicle_is_public(vehicle_id)));
create policy "listing_reports: staff update" on public.listing_reports
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create or replace function private.listing_reports_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.listing_reports
        where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    perform private.notify_staff('report.created', jsonb_build_object('reason', new.reason), '/admin/reports');
  end if;
  return new;
end;
$$;
create trigger listing_reports_created before insert on public.listing_reports
  for each row execute function private.listing_reports_created();
