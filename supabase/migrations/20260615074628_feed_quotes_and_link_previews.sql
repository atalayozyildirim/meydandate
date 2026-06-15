-- Add quote-post snapshots and URL previews to feed posts.

alter table public.feed_posts
  add column if not exists quoted_post_id uuid,
  add column if not exists quote_snapshot jsonb,
  add column if not exists link_preview jsonb;

alter table public.feed_posts
  drop constraint if exists feed_posts_quoted_post_id_fkey,
  add constraint feed_posts_quoted_post_id_fkey
    foreign key (quoted_post_id)
    references public.feed_posts(id)
    on delete set null;

alter table public.feed_posts
  drop constraint if exists feed_posts_quote_snapshot_shape_check,
  add constraint feed_posts_quote_snapshot_shape_check
    check (
      quote_snapshot is null
      or (
        jsonb_typeof(quote_snapshot) = 'object'
        and char_length(coalesce(quote_snapshot ->> 'id', '')) <= 64
        and char_length(coalesce(quote_snapshot ->> 'authorId', '')) <= 64
        and char_length(coalesce(quote_snapshot ->> 'authorName', '')) between 1 and 80
        and char_length(coalesce(quote_snapshot ->> 'body', '')) <= 260
        and char_length(coalesce(quote_snapshot ->> 'createdAt', '')) <= 64
        and (
          quote_snapshot ->> 'authorPhotoUrl' is null
          or (
            char_length(quote_snapshot ->> 'authorPhotoUrl') <= 2048
            and quote_snapshot ->> 'authorPhotoUrl' ~* '^https?://'
          )
        )
        and (
          quote_snapshot ->> 'imageUrl' is null
          or (
            char_length(quote_snapshot ->> 'imageUrl') <= 2048
            and quote_snapshot ->> 'imageUrl' ~* '^https?://'
          )
        )
      )
    );

alter table public.feed_posts
  drop constraint if exists feed_posts_link_preview_shape_check,
  add constraint feed_posts_link_preview_shape_check
    check (
      link_preview is null
      or (
        jsonb_typeof(link_preview) = 'object'
        and char_length(coalesce(link_preview ->> 'url', '')) between 8 and 2048
        and link_preview ->> 'url' ~* '^https?://'
        and char_length(coalesce(link_preview ->> 'title', '')) <= 140
        and char_length(coalesce(link_preview ->> 'description', '')) <= 220
        and char_length(coalesce(link_preview ->> 'siteName', '')) <= 80
        and (
          link_preview ->> 'imageUrl' is null
          or (
            char_length(link_preview ->> 'imageUrl') <= 2048
            and link_preview ->> 'imageUrl' ~* '^https?://'
          )
        )
      )
    );

create index if not exists feed_posts_quoted_post_id_idx
  on public.feed_posts (quoted_post_id)
  where quoted_post_id is not null;

grant insert (
  author_id,
  body,
  tags,
  image_url,
  image_path,
  quoted_post_id,
  quote_snapshot,
  link_preview
) on public.feed_posts to authenticated;

grant update (
  body,
  tags,
  image_url,
  image_path,
  quoted_post_id,
  quote_snapshot,
  link_preview
) on public.feed_posts to authenticated;

notify pgrst, 'reload schema';
