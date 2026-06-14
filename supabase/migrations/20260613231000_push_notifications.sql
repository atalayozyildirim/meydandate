-- Expo push token kaydi ve admin etkinlik bildirimleri.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_platform_check
    check (platform in ('ios', 'android', 'web', 'unknown')),
  constraint push_tokens_token_length_check
    check (char_length(token) between 20 and 512)
);

create index if not exists push_tokens_user_active_idx
on public.push_tokens (user_id, is_active);

drop trigger if exists set_push_tokens_updated_at on public.push_tokens;
create trigger set_push_tokens_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

drop policy if exists "Users can read own push tokens" on public.push_tokens;
create policy "Users can read own push tokens"
on public.push_tokens for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own push tokens" on public.push_tokens;
create policy "Users can insert own push tokens"
on public.push_tokens for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
on public.push_tokens for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.upsert_push_token(
  next_token text,
  next_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_platform text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if next_token is null or char_length(next_token) < 20 then
    raise exception 'Invalid push token';
  end if;

  normalized_platform := case
    when next_platform in ('ios', 'android', 'web') then next_platform
    else 'unknown'
  end;

  insert into public.push_tokens (user_id, token, platform, is_active)
  values ((select auth.uid()), next_token, normalized_platform, true)
  on conflict (token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    is_active = true,
    updated_at = now();
end;
$$;

revoke all on public.push_tokens from anon, authenticated;
grant select, insert, update on public.push_tokens to authenticated;

revoke all on function public.upsert_push_token(text, text) from public, anon;
grant execute on function public.upsert_push_token(text, text) to authenticated;

notify pgrst, 'reload schema';
