-- Adds an indicative DZD price to the marketplace view so that price filters and sorting
-- work across listing currencies. The conversion uses the latest documented exchange
-- rate (public.latest_exchange_rates); when no rate exists the value is NULL and the
-- listing is excluded from price filters rather than converted with an invented rate.

create or replace function private.convert_amount(p_amount numeric, p_from char(3), p_to char(3))
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_from = p_to then p_amount
    else coalesce(
      (select p_amount * r.rate from public.latest_exchange_rates r
       where r.base_currency = p_from and r.quote_currency = p_to),
      (select p_amount / r.rate from public.latest_exchange_rates r
       where r.base_currency = p_to and r.quote_currency = p_from)
    )
  end;
$$;
grant execute on function private.convert_amount(numeric, char, char) to anon, authenticated, service_role;

create or replace view public.marketplace_vehicles with (security_barrier = true) as
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
    where i.vehicle_id = v.id order by i.position, i.created_at limit 1) as cover_is_storage,
  round(private.convert_amount(v.price_amount, v.price_currency, 'DZD'), 0) as price_dzd
from public.vehicles v
join public.supplier_profiles s on s.id = v.supplier_id
join public.vehicle_makes m on m.id = v.make_id
where v.status = 'published'
  and s.status = 'approved'
  and (v.expires_at is null or v.expires_at > now());

grant select on public.marketplace_vehicles to anon, authenticated;
