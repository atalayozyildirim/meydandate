-- Premium boost alanını kullanıcı profilinde tutar ve Discover sıralaması için indeksler.
alter table public.users
  add column if not exists "boostedUntil" timestamptz;

create index if not exists users_boosted_until_idx
on public.users ("boostedUntil" desc)
where "boostedUntil" is not null;

grant select ("boostedUntil") on public.users to authenticated;
grant update ("boostedUntil") on public.users to authenticated;
