create table if not exists public.user_fire_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  receipt_id text,
  created_at timestamptz not null default now(),
  constraint user_fire_purchases_amount_check check (amount in (100, 500, 1500))
);

create index if not exists user_fire_purchases_user_created_idx
on public.user_fire_purchases (user_id, created_at desc);

create unique index if not exists user_fire_purchases_receipt_idx
on public.user_fire_purchases (receipt_id)
where receipt_id is not null;

alter table public.user_fire_purchases enable row level security;

drop policy if exists "Users can read own fire purchases"
on public.user_fire_purchases;
create policy "Users can read own fire purchases"
on public.user_fire_purchases for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_moderator()));

revoke all on public.user_fire_purchases from anon, authenticated;
grant select on public.user_fire_purchases to authenticated;

create or replace function public.record_fire_package_purchase(
  target_user_id uuid,
  package_amount integer,
  next_receipt_id text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_balance integer;
  normalized_receipt text := nullif(trim(coalesce(next_receipt_id, '')), '');
begin
  if target_user_id is null then
    raise exception 'Profile is required';
  end if;

  if package_amount not in (100, 500, 1500) then
    raise exception 'Invalid Fire package';
  end if;

  if normalized_receipt is not null and exists (
    select 1
    from public.user_fire_purchases
    where receipt_id = normalized_receipt
  ) then
    select balance
    into next_balance
    from public.user_fire_wallets
    where user_id = target_user_id;

    return coalesce(next_balance, 0);
  end if;

  if not exists (
    select 1
    from public.users
    where id = target_user_id
      and "isActive" = true
  ) then
    raise exception 'Profile not found';
  end if;

  insert into public.user_fire_wallets (user_id, balance)
  values (target_user_id, package_amount)
  on conflict (user_id) do update
    set balance = public.user_fire_wallets.balance + excluded.balance,
        updated_at = now()
  returning balance into next_balance;

  insert into public.user_fire_purchases (user_id, amount, receipt_id)
  values (target_user_id, package_amount, normalized_receipt);

  return next_balance;
end;
$$;

revoke all on function public.purchase_fire_package(integer)
from public, anon, authenticated;
revoke all on function public.record_fire_package_purchase(uuid, integer, text)
from public, anon, authenticated;
grant execute on function public.record_fire_package_purchase(uuid, integer, text)
to service_role;

notify pgrst, 'reload schema';
