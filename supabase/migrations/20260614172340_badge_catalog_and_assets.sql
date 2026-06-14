-- Badge catalog, task claims, and paid badge recording.

create table if not exists public.badge_catalog (
  badge_key text primary key,
  title text not null,
  description text not null,
  acquisition_type text not null,
  price_label text,
  revenuecat_product_id text unique,
  task_code text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint badge_catalog_acquisition_type_check
    check (acquisition_type in ('paid', 'task', 'membership', 'system')),
  constraint badge_catalog_paid_product_check
    check (
      acquisition_type <> 'paid'
      or (
        price_label is not null
        and revenuecat_product_id is not null
      )
    )
);

create table if not exists public.user_badge_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_key text not null references public.badge_catalog(badge_key) on delete restrict,
  source text not null,
  receipt_id text,
  created_at timestamptz not null default now(),
  constraint user_badge_claims_source_check
    check (source in ('task', 'paid', 'membership', 'system', 'admin')),
  constraint user_badge_claims_unique_user_badge unique (user_id, badge_key)
);

create index if not exists user_badge_claims_user_created_idx
on public.user_badge_claims (user_id, created_at desc);

drop trigger if exists set_badge_catalog_updated_at on public.badge_catalog;
create trigger set_badge_catalog_updated_at
before update on public.badge_catalog
for each row execute function public.set_updated_at();

alter table public.badge_catalog enable row level security;
alter table public.user_badge_claims enable row level security;

drop policy if exists "Authenticated users can read active badge catalog"
on public.badge_catalog;
create policy "Authenticated users can read active badge catalog"
on public.badge_catalog for select to authenticated
using (is_active = true);

drop policy if exists "Users can read own badge claims"
on public.user_badge_claims;
create policy "Users can read own badge claims"
on public.user_badge_claims for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_moderator()));

revoke all on public.badge_catalog from anon, authenticated;
revoke all on public.user_badge_claims from anon, authenticated;
grant select on public.badge_catalog to authenticated;
grant select on public.user_badge_claims to authenticated;

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
values
  (
    'community_member',
    'Topluluk Üyesi',
    'Ehlibyte topluluğuna katılım rozeti.',
    'system',
    null,
    null,
    null,
    10
  ),
  (
    'verified_profile',
    'Doğrulanmış Profil',
    'Güvenilir profil işareti.',
    'system',
    null,
    null,
    null,
    20
  ),
  (
    'active_user',
    'Aktif Kullanıcı',
    'Düzenli kullanım ve topluluk katılımı rozeti.',
    'task',
    null,
    null,
    'active_profile',
    30
  ),
  (
    'premium_member',
    'Premium Üye',
    'Premium üyelikle gelen özel rozet.',
    'membership',
    null,
    null,
    'premium_subscription',
    40
  ),
  (
    'muharrem_follower',
    'Muharrem Takipçisi',
    'Muharrem dönemini takip eden destekçi rozeti.',
    'paid',
    '₺49',
    'ehlibyte.badge.muharrem_follower',
    null,
    50
  ),
  (
    'muharrem_orucu_2026',
    'Muharrem Orucu 2026',
    '2026 Muharrem orucu takvimini tamamlayanlara verilir.',
    'task',
    null,
    null,
    'muharrem_2026_complete',
    60
  ),
  (
    'asure_lokmasi',
    'Aşure Lokması',
    'Muharrem 2026 rozetinden sonra kazanılan Aşure hatırası.',
    'task',
    null,
    null,
    'muharrem_asure',
    70
  ),
  (
    'ilk_eslesme',
    'İlk Eşleşme',
    'İlk karşılıklı eşleşmeyi yapanlara verilir.',
    'task',
    null,
    null,
    'first_match',
    80
  ),
  (
    'populer_profil',
    'Popüler Profil',
    'Keşfette en az 50 Fire alan profillere verilir.',
    'task',
    null,
    null,
    'fire_50',
    90
  ),
  (
    'cem_room_supporter',
    'Cem Odası Destekçisi',
    'Sanal Cem odalarına destek rozeti.',
    'paid',
    '₺79',
    'ehlibyte.badge.cem_room_supporter',
    null,
    100
  ),
  (
    'culture_guardian',
    'Yol Erkânı Destekçisi',
    'Topluluk saygısı ve güvenliği için özel destek rozeti.',
    'paid',
    '₺99',
    'ehlibyte.badge.culture_guardian',
    null,
    110
  ),
  (
    'zulfiqar_sword',
    'Zülfikar Kılıcı',
    'Hz. Ali’nin çift uçlu kılıcından ilham alan özel destek rozeti.',
    'paid',
    '₺499',
    'ehlibyte.badge.zulfiqar_sword',
    null,
    120
  ),
  (
    'haci_bektas_veli',
    'Hacı Bektaş Veli',
    'Hünkâr Hacı Bektaş Veli hatırasını taşıyan özel rozet.',
    'paid',
    '₺399',
    'ehlibyte.badge.haci_bektas_veli',
    null,
    130
  ),
  (
    'la_fetta_illa',
    'La Fetta İlla',
    'La feta illa Ali, la seyfe illa Zülfikar sözünden ilham alan özel rozet.',
    'paid',
    '₺299',
    'ehlibyte.badge.la_fetta_illa',
    null,
    140
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

create or replace function public.claim_task_badge(next_badge text)
returns setof public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_profile public.users%rowtype;
  normalized_badge text := trim(coalesce(next_badge, ''));
  task_code text;
  can_claim boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into current_profile
  from public.users
  where id = current_user_id
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  select badge_catalog.task_code
  into task_code
  from public.badge_catalog
  where badge_key = normalized_badge
    and acquisition_type = 'task'
    and is_active = true;

  if task_code is null then
    raise exception 'Badge is not claimable as a task';
  end if;

  if normalized_badge = any(current_profile.badges) then
    return query select * from public.users where id = current_user_id;
    return;
  end if;

  can_claim := case task_code
    when 'muharrem_asure' then 'muharrem_orucu_2026' = any(current_profile.badges)
    when 'first_match' then exists (
      select 1
      from public.matches
      where "user1Id" = current_user_id
         or "user2Id" = current_user_id
    )
    when 'fire_50' then coalesce(current_profile."fireScore", 0) >= 50
    when 'active_profile' then current_profile."hasCompletedOnboarding" = true
    else false
  end;

  if not can_claim then
    raise exception 'Badge task is not completed';
  end if;

  update public.users
  set badges = array_append(badges, normalized_badge)
  where id = current_user_id
    and not (normalized_badge = any(badges));

  insert into public.user_badge_claims (user_id, badge_key, source)
  values (current_user_id, normalized_badge, 'task')
  on conflict (user_id, badge_key) do nothing;

  return query select * from public.users where id = current_user_id;
end;
$$;

create or replace function public.record_paid_badge_purchase(
  target_user_id uuid,
  next_badge text,
  next_receipt_id text default null
)
returns setof public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_badge text := trim(coalesce(next_badge, ''));
  badge_source text;
begin
  select acquisition_type
  into badge_source
  from public.badge_catalog
  where badge_key = normalized_badge
    and acquisition_type in ('paid', 'membership')
    and is_active = true;

  if target_user_id is null or badge_source is null then
    raise exception 'Invalid paid badge purchase';
  end if;

  update public.users
  set badges = case
    when normalized_badge = any(badges) then badges
    else array_append(badges, normalized_badge)
  end,
      "isPremium" = case
        when normalized_badge = 'premium_member' then true
        else "isPremium"
      end
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.user_badge_claims (
    user_id,
    badge_key,
    source,
    receipt_id
  )
  values (
    target_user_id,
    normalized_badge,
    badge_source,
    nullif(trim(coalesce(next_receipt_id, '')), '')
  )
  on conflict (user_id, badge_key) do update
  set receipt_id = coalesce(excluded.receipt_id, public.user_badge_claims.receipt_id);

  return query select * from public.users where id = target_user_id;
end;
$$;

create or replace function public.claim_muharrem_2026_badge()
returns setof public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.users
  set badges = case
    when 'muharrem_orucu_2026' = any(badges) then badges
    else array_append(badges, 'muharrem_orucu_2026')
  end
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.user_badge_claims (user_id, badge_key, source)
  values (current_user_id, 'muharrem_orucu_2026', 'task')
  on conflict (user_id, badge_key) do nothing;

  return query select * from public.users where id = current_user_id;
end;
$$;

revoke all on function public.claim_task_badge(text)
from public, anon;
revoke all on function public.record_paid_badge_purchase(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.claim_muharrem_2026_badge()
from public, anon;

grant execute on function public.claim_task_badge(text)
to authenticated;
grant execute on function public.record_paid_badge_purchase(uuid, text, text)
to service_role;
grant execute on function public.claim_muharrem_2026_badge()
to authenticated;

notify pgrst, 'reload schema';
