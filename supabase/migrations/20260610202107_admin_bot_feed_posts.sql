-- Admin tarafindan yonetilen Ehlibyte Bot feed kampanyalari.
create table if not exists public.bot_feed_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  tags text[] not null default array['gundem']::text[],
  cta_label text not null default 'İncele',
  is_active boolean not null default true,
  show_admob boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_feed_posts_body_length_check
    check (char_length(body) between 1 and 2000),
  constraint bot_feed_posts_body_safe_check
    check (public.is_safe_user_text(body)),
  constraint bot_feed_posts_cta_label_length_check
    check (char_length(cta_label) between 1 and 40),
  constraint bot_feed_posts_cta_label_safe_check
    check (public.is_safe_user_text(cta_label)),
  constraint bot_feed_posts_tags_check
    check (
      cardinality(tags) between 1 and 6
      and tags <@ array['muharrem', 'deyis', 'soru', 'gundem']::text[]
    ),
  constraint bot_feed_posts_window_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists bot_feed_posts_active_idx
on public.bot_feed_posts (is_active, starts_at desc, sort_order desc, updated_at desc);

create index if not exists bot_feed_posts_tags_idx
on public.bot_feed_posts using gin (tags);

drop trigger if exists set_bot_feed_posts_updated_at on public.bot_feed_posts;
create trigger set_bot_feed_posts_updated_at
before update on public.bot_feed_posts
for each row execute function public.set_updated_at();

alter table public.bot_feed_posts enable row level security;

drop policy if exists "Authenticated users can read active bot feed posts"
on public.bot_feed_posts;
create policy "Authenticated users can read active bot feed posts"
on public.bot_feed_posts for select to authenticated
using (
  (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  )
  or (select public.is_admin())
);

drop policy if exists "Admins can create bot feed posts"
on public.bot_feed_posts;
create policy "Admins can create bot feed posts"
on public.bot_feed_posts for insert to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
);

drop policy if exists "Admins can update bot feed posts"
on public.bot_feed_posts;
create policy "Admins can update bot feed posts"
on public.bot_feed_posts for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can delete bot feed posts"
on public.bot_feed_posts;
create policy "Admins can delete bot feed posts"
on public.bot_feed_posts for delete to authenticated
using ((select public.is_admin()));

revoke all on public.bot_feed_posts from anon, authenticated;
grant select, delete on public.bot_feed_posts to authenticated;
grant insert (
  body,
  tags,
  cta_label,
  is_active,
  show_admob,
  sort_order,
  starts_at,
  ends_at,
  created_by
) on public.bot_feed_posts to authenticated;
grant update (
  body,
  tags,
  cta_label,
  is_active,
  show_admob,
  sort_order,
  starts_at,
  ends_at
) on public.bot_feed_posts to authenticated;

insert into public.bot_feed_posts (
  body,
  tags,
  cta_label,
  is_active,
  show_admob,
  sort_order,
  starts_at
)
values (
  'Zülfikar Kılıcı özel rozeti mağazada. Hz. Ali''nin çift uçlu kılıcından ilham alan bu rozet profilinde özel destekçi işareti olarak görünür. Fiyat: ₺499.',
  array['gundem']::text[],
  'Mağazada ₺499',
  true,
  true,
  100,
  now()
)
on conflict do nothing;
