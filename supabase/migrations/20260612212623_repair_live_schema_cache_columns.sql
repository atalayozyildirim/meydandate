-- Repair columns used by the mobile client and force PostgREST to refresh its schema cache.
-- Safe to run after the earlier privacy/location/feed image migrations.

alter table public.users
  add column if not exists "isDiscoverable" boolean not null default true;

grant select ("isDiscoverable") on public.users to authenticated;

create or replace function public.set_profile_discoverability(next_is_discoverable boolean)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.users;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  update public.users
  set "isDiscoverable" = coalesce(next_is_discoverable, true)
  where id = (select auth.uid())
  returning *
  into current_profile;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return current_profile;
end;
$$;

revoke all on function public.set_profile_discoverability(boolean) from public, anon;
grant execute on function public.set_profile_discoverability(boolean) to authenticated;

alter table public.feed_posts
  add column if not exists image_url text,
  add column if not exists image_path text;

alter table public.feed_posts
  drop constraint if exists feed_posts_image_url_length_check,
  add constraint feed_posts_image_url_length_check
    check (image_url is null or char_length(image_url) <= 2048);

alter table public.feed_posts
  drop constraint if exists feed_posts_image_pair_check,
  add constraint feed_posts_image_pair_check
    check (
      (image_url is null and image_path is null)
      or (image_url is not null and image_path is not null)
    );

grant insert (author_id, body, tags, image_url, image_path)
on public.feed_posts to authenticated;

grant update (body, tags, image_url, image_path)
on public.feed_posts to authenticated;

notify pgrst, 'reload schema';
