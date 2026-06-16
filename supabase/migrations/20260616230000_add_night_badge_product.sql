-- Night rozetini satilabilir badge kataloguna ekler.

insert into public.badge_catalog (
  badge_key,
  title,
  description,
  acquisition_type,
  price_label,
  revenuecat_product_id,
  task_code,
  sort_order
)
values (
  'night_badge',
  'Night',
  'Gece temasini ve ozel ilgiyi profilde gosteren destek rozeti.',
  'paid',
  '₺119,99',
  'ehlibyte.badge.night_badge',
  null,
  145
)
on conflict (badge_key) do update
set title = excluded.title,
    description = excluded.description,
    acquisition_type = excluded.acquisition_type,
    price_label = excluded.price_label,
    revenuecat_product_id = excluded.revenuecat_product_id,
    task_code = excluded.task_code,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
