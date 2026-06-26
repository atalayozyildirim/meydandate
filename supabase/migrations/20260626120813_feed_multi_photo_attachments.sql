-- Multi-photo feed posts and media attachments for comments/replies.
-- Keeps legacy image_url/image_path for older clients while new clients read arrays.

alter table public.feed_posts
  add column if not exists image_urls text[] not null default '{}'::text[],
  add column if not exists image_paths text[] not null default '{}'::text[];

update public.feed_posts
set
  image_urls = case
    when image_url is not null and cardinality(image_urls) = 0 then array[image_url]::text[]
    else image_urls
  end,
  image_paths = case
    when image_path is not null and cardinality(image_paths) = 0 then array[image_path]::text[]
    else image_paths
  end;

alter table public.feed_posts
  drop constraint if exists feed_posts_image_urls_count_check,
  add constraint feed_posts_image_urls_count_check
    check (
      cardinality(image_urls) <= 4
      and cardinality(image_paths) <= 4
      and cardinality(image_paths) <= cardinality(image_urls)
    );

alter table public.feed_posts
  drop constraint if exists feed_posts_body_length_check,
  add constraint feed_posts_body_length_check
    check (
      char_length(body) between 1 and 2000
      or cardinality(image_urls) between 1 and 4
    );

alter table public.feed_comments
  add column if not exists image_urls text[] not null default '{}'::text[],
  add column if not exists image_paths text[] not null default '{}'::text[];

alter table public.feed_comments
  drop constraint if exists feed_comments_image_urls_count_check,
  add constraint feed_comments_image_urls_count_check
    check (
      cardinality(image_urls) <= 4
      and cardinality(image_paths) <= 4
      and cardinality(image_paths) <= cardinality(image_urls)
    );

alter table public.feed_comments
  drop constraint if exists feed_comments_body_length_check,
  add constraint feed_comments_body_length_check
    check (
      char_length(body) between 1 and 1000
      or cardinality(image_urls) between 1 and 4
    );

alter table public.feed_replies
  add column if not exists image_urls text[] not null default '{}'::text[],
  add column if not exists image_paths text[] not null default '{}'::text[];

alter table public.feed_replies
  drop constraint if exists feed_replies_image_urls_count_check,
  add constraint feed_replies_image_urls_count_check
    check (
      cardinality(image_urls) <= 4
      and cardinality(image_paths) <= 4
      and cardinality(image_paths) <= cardinality(image_urls)
    );

alter table public.feed_replies
  drop constraint if exists feed_replies_body_length_check,
  add constraint feed_replies_body_length_check
    check (
      char_length(body) between 1 and 1000
      or cardinality(image_urls) between 1 and 4
    );

grant insert (author_id, body, tags, image_url, image_path, image_urls, image_paths)
on public.feed_posts to authenticated;
grant update (body, tags, image_url, image_path, image_urls, image_paths)
on public.feed_posts to authenticated;

grant insert (post_id, author_id, body, image_urls, image_paths)
on public.feed_comments to authenticated;
grant update (body, image_urls, image_paths)
on public.feed_comments to authenticated;

grant insert (comment_id, author_id, body, image_urls, image_paths)
on public.feed_replies to authenticated;
grant update (body, image_urls, image_paths)
on public.feed_replies to authenticated;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id = 'feed-post-images';
