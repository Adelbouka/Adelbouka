-- AutoBridge DZ — foundation: extensions, enums, helper functions, profiles, roles,
-- reference data tables, content tables, internal notes, audit log and notifications.
--
-- Security model (applies to every migration):
--   * Every table in `public` has RLS enabled.
--   * Clients (roles `anon` / `authenticated`) may only perform the writes that RLS allows.
--   * Moderation/status columns are protected by guard triggers that reject changes made
--     directly by `anon` / `authenticated`. State changes go through SECURITY DEFINER
--     functions (RPCs) that validate the transition, record history and write audit logs.
--   * Helper functions live in the `private` schema, which PostgREST does not expose.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'staff');
create type public.locale_code as enum ('ar', 'fr');
create type public.business_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current statement was issued directly by an API client
-- (PostgREST roles). SECURITY DEFINER functions run as their owner, so this
-- returns false inside them, which is how trusted workflows bypass guards.
create or replace function private.is_client_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

create or replace function private.valid_country_codes(codes text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(c ~ '^[A-Z]{2}$'), true) from unnest(codes) as c;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  wilaya text check (char_length(wilaya) <= 64),
  preferred_locale public.locale_code not null default 'ar',
  notify_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Private user profile. Visible to the user and to staff only.';

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Users may only edit their own descriptive fields; email is synced from auth.users.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, wilaya, preferred_locale, notify_email) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale public.locale_code := 'ar';
begin
  if new.raw_user_meta_data ->> 'locale' in ('ar', 'fr') then
    v_locale := (new.raw_user_meta_data ->> 'locale')::public.locale_code;
  end if;
  insert into public.profiles (id, email, full_name, preferred_locale)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), ''),
    v_locale
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Privileged roles. Customers, suppliers and partners are NOT roles: a customer is
-- any authenticated user; supplier/partner capabilities derive from an approved
-- business profile owned by the user.
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function private.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'staff')
  );
$$;

grant execute on all functions in schema private to anon, authenticated, service_role;

alter table public.user_roles enable row level security;

create policy "user_roles: read own or staff" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

create policy "user_roles: admin insert" on public.user_roles
  for insert to authenticated
  with check ((select private.is_admin()) and granted_by = (select auth.uid()));

create policy "user_roles: admin delete" on public.user_roles
  for delete to authenticated
  using ((select private.is_admin()));

revoke update on public.user_roles from anon, authenticated;

-- Never allow the platform to lose its last administrator.
create or replace function private.keep_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'cannot_remove_last_admin' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger user_roles_keep_last_admin before delete on public.user_roles
  for each row execute function private.keep_last_admin();

alter table public.profiles enable row level security;

create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
create policy "audit_logs: staff read" on public.audit_logs
  for select to authenticated using ((select private.is_staff()));
revoke insert, update, delete on public.audit_logs from anon, authenticated;

create or replace function private.audit(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- In-app notifications. Rows are created only by trusted functions; the message
-- text is rendered client-side from `type` + `params` in the reader's language.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  params jsonb not null default '{}'::jsonb,
  link text check (link is null or link ~ '^/[^/]'),
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_email_queue_idx on public.notifications (created_at) where emailed_at is null;

alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.notify(
  p_user_id uuid, p_type text, p_params jsonb default '{}'::jsonb, p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, params, link)
  select p_user_id, p_type, coalesce(p_params, '{}'::jsonb), p_link
  where p_user_id is not null;
$$;

create or replace function private.notify_staff(
  p_type text, p_params jsonb default '{}'::jsonb, p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, params, link)
  select distinct user_id, p_type, coalesce(p_params, '{}'::jsonb), p_link
  from public.user_roles where role in ('admin', 'staff');
$$;

-- ---------------------------------------------------------------------------
-- Internal notes (staff only), attachable to any entity.
-- ---------------------------------------------------------------------------
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in
    ('supplier', 'partner', 'purchase_request', 'vehicle', 'service_request', 'user', 'report')),
  entity_id uuid not null,
  body text not null check (char_length(body) between 1 and 4000),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id, created_at desc);

alter table public.admin_notes enable row level security;
create policy "admin_notes: staff read" on public.admin_notes
  for select to authenticated using ((select private.is_staff()));
create policy "admin_notes: staff insert" on public.admin_notes
  for insert to authenticated
  with check ((select private.is_staff()) and author_id = (select auth.uid()));
revoke update, delete on public.admin_notes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.currencies (
  code char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name_ar text not null,
  name_fr text not null,
  symbol text not null,
  minor_units smallint not null default 2 check (minor_units between 0 and 4),
  is_active boolean not null default true
);

create table public.vehicle_makes (
  id smallint generated always as identity primary key,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true
);

create table public.service_categories (
  code text primary key check (code ~ '^[a-z_]+$'),
  name_ar text not null,
  name_fr text not null,
  position smallint not null default 0,
  is_active boolean not null default true
);

-- Acquisition pathways are configurable and can be disabled by an administrator
-- when legal eligibility or service availability cannot be established.
create table public.acquisition_pathways (
  code text primary key check (code ~ '^[a-z_]+$'),
  name_ar text not null,
  name_fr text not null,
  description_ar text not null default '',
  description_fr text not null default '',
  is_enabled boolean not null default true,
  requires_legal_review boolean not null default true,
  disabled_message_ar text,
  disabled_message_fr text,
  legal_reference text,
  last_reviewed_at timestamptz,
  position smallint not null default 0,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger acquisition_pathways_touch before update on public.acquisition_pathways
  for each row execute function private.touch_updated_at();

create table public.site_settings (
  key text primary key check (key ~ '^[a-z_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings
  for each row execute function private.touch_updated_at();

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question_ar text not null,
  question_fr text not null,
  answer_ar text not null,
  answer_fr text not null,
  position smallint not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger faqs_touch before update on public.faqs
  for each row execute function private.touch_updated_at();

-- Terms, privacy policy and intermediary disclosure are versioned content that
-- an administrator maintains; the latest published version per slug/locale is shown.
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in ('terms', 'privacy', 'disclosure')),
  locale public.locale_code not null,
  version integer not null check (version > 0),
  title text not null,
  body text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (slug, locale, version)
);

-- Read access: public reference/content data.
alter table public.currencies enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.service_categories enable row level security;
alter table public.acquisition_pathways enable row level security;
alter table public.site_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.legal_documents enable row level security;

create policy "currencies: public read" on public.currencies for select using (true);
create policy "currencies: admin write" on public.currencies for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "vehicle_makes: public read" on public.vehicle_makes for select using (true);
create policy "vehicle_makes: admin write" on public.vehicle_makes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "service_categories: public read" on public.service_categories for select using (true);
create policy "service_categories: admin write" on public.service_categories for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "pathways: public read" on public.acquisition_pathways for select using (true);
create policy "pathways: admin write" on public.acquisition_pathways for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "settings: public read of public keys" on public.site_settings
  for select using (is_public or (select private.is_staff()));
create policy "settings: admin write" on public.site_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "faqs: public read published" on public.faqs
  for select using (is_published or (select private.is_staff()));
create policy "faqs: admin write" on public.faqs for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "legal_documents: public read published" on public.legal_documents
  for select using (is_published or (select private.is_staff()));
create policy "legal_documents: admin write" on public.legal_documents for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Contact form messages (anonymous allowed, rate limited)
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  subject text not null check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  locale public.locale_code not null default 'ar',
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;
create policy "contact_messages: anyone can send" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and handled_by is null
              and (user_id is null or user_id = (select auth.uid())));
create policy "contact_messages: staff read" on public.contact_messages
  for select to authenticated using ((select private.is_staff()));
create policy "contact_messages: staff update" on public.contact_messages
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create or replace function private.contact_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_messages
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.contact_messages
         where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger contact_messages_rate_limit before insert on public.contact_messages
  for each row execute function private.contact_rate_limit();

-- ---------------------------------------------------------------------------
-- Personal data requests (access / correction / deletion)
-- ---------------------------------------------------------------------------
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null default auth.uid(),
  kind text not null check (kind in ('access', 'correction', 'deletion')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'rejected')),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.data_requests enable row level security;
create policy "data_requests: own read" on public.data_requests
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "data_requests: own insert" on public.data_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open' and handled_by is null);
create policy "data_requests: staff update" on public.data_requests
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create or replace function private.data_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.data_requests
             where user_id = new.user_id and kind = new.kind and status in ('open', 'in_progress')) then
    raise exception 'duplicate_open_request' using errcode = 'P0001';
  end if;
  perform private.notify_staff('data_request.created', jsonb_build_object('kind', new.kind), '/admin/users');
  return new;
end;
$$;
create trigger data_requests_guard before insert on public.data_requests
  for each row execute function private.data_requests_guard();
