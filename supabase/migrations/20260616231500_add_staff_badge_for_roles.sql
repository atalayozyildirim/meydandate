-- Admin ve moderator kullanicilara staff rozetini otomatik baglar.

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
  'staff_badge',
  'Yetkili Ekip',
  'Ehlibyte admin ve moderator hesaplari icin yetkili ekip rozeti.',
  'system',
  null,
  null,
  'staff_role',
  25
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

create or replace function public.sync_staff_badge_for_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  target_role text;
begin
  if tg_op = 'DELETE' then
    target_user_id := old."userId";
    target_role := 'user';
  else
    target_user_id := new."userId";
    target_role := new.role;
  end if;

  if target_user_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and target_role in ('moderator', 'admin') then
    update public.users
    set badges = case
      when 'staff_badge' = any(badges) then badges
      else array_append(badges, 'staff_badge')
    end
    where id = target_user_id;
  else
    update public.users
    set badges = array_remove(badges, 'staff_badge')
    where id = target_user_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_staff_badge_for_role_trigger on public.user_roles;
create trigger sync_staff_badge_for_role_trigger
after insert or update or delete on public.user_roles
for each row execute function public.sync_staff_badge_for_role();

update public.users
set badges = case
  when 'staff_badge' = any(badges) then badges
  else array_append(badges, 'staff_badge')
end
where id in (
  select "userId"
  from public.user_roles
  where role in ('moderator', 'admin')
);

update public.users
set badges = array_remove(badges, 'staff_badge')
where 'staff_badge' = any(badges)
  and id not in (
    select "userId"
    from public.user_roles
    where role in ('moderator', 'admin')
  );

revoke all on function public.sync_staff_badge_for_role() from public, anon, authenticated;
