-- Add optional public images to feed posts and restrict uploads to each user's folder.

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'feed-post-images',
  'feed-post-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read feed post images"
on storage.objects;
create policy "Authenticated users can read feed post images"
on storage.objects for select to authenticated
using (bucket_id = 'feed-post-images');

drop policy if exists "Users can upload their own feed post images"
on storage.objects;
create policy "Users can upload their own feed post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'feed-post-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Authors and admins can delete feed post images"
on storage.objects;
create policy "Authors and admins can delete feed post images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'feed-post-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);
