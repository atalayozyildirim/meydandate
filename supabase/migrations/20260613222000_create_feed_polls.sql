-- Feed anketlerini postlarla birlikte gorunur ve oylanabilir hale getirir.

create table if not exists public.feed_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.feed_posts(id) on delete cascade,
  question text not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_polls_question_length_check
    check (char_length(question) between 1 and 1000),
  constraint feed_polls_question_safe_check
    check (public.is_safe_user_text(question)),
  constraint feed_polls_ends_at_check
    check (ends_at is null or ends_at > created_at)
);

create table if not exists public.feed_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.feed_polls(id) on delete cascade,
  text text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  constraint feed_poll_options_text_length_check
    check (char_length(text) between 1 and 200),
  constraint feed_poll_options_text_safe_check
    check (public.is_safe_user_text(text)),
  constraint feed_poll_options_display_order_check
    check (display_order between 0 and 9),
  constraint feed_poll_options_poll_order_unique
    unique (poll_id, display_order),
  constraint feed_poll_options_id_poll_unique
    unique (id, poll_id)
);

create table if not exists public.feed_poll_votes (
  poll_id uuid not null references public.feed_polls(id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  constraint feed_poll_votes_option_poll_fkey
    foreign key (option_id, poll_id)
    references public.feed_poll_options(id, poll_id)
    on delete cascade
);

create index if not exists feed_polls_post_id_idx
on public.feed_polls (post_id);

create index if not exists feed_poll_options_poll_id_idx
on public.feed_poll_options (poll_id, display_order);

create index if not exists feed_poll_votes_option_id_idx
on public.feed_poll_votes (option_id);

drop trigger if exists set_feed_polls_updated_at on public.feed_polls;
create trigger set_feed_polls_updated_at
before update on public.feed_polls
for each row execute function public.set_updated_at();

alter table public.feed_polls enable row level security;
alter table public.feed_poll_options enable row level security;
alter table public.feed_poll_votes enable row level security;

drop policy if exists "Authenticated users can read feed polls"
on public.feed_polls;
create policy "Authenticated users can read feed polls"
on public.feed_polls for select to authenticated
using (true);

drop policy if exists "Post authors can create feed polls"
on public.feed_polls;
create policy "Post authors can create feed polls"
on public.feed_polls for insert to authenticated
with check (
  exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_polls.post_id
      and feed_posts.author_id = (select auth.uid())
  )
);

drop policy if exists "Authenticated users can read feed poll options"
on public.feed_poll_options;
create policy "Authenticated users can read feed poll options"
on public.feed_poll_options for select to authenticated
using (true);

drop policy if exists "Post authors can create feed poll options"
on public.feed_poll_options;
create policy "Post authors can create feed poll options"
on public.feed_poll_options for insert to authenticated
with check (
  exists (
    select 1
    from public.feed_polls
    join public.feed_posts on feed_posts.id = feed_polls.post_id
    where feed_polls.id = feed_poll_options.poll_id
      and feed_posts.author_id = (select auth.uid())
  )
);

drop policy if exists "Authenticated users can read feed poll votes"
on public.feed_poll_votes;
create policy "Authenticated users can read feed poll votes"
on public.feed_poll_votes for select to authenticated
using (true);

drop policy if exists "Users can create their own feed poll votes"
on public.feed_poll_votes;
create policy "Users can create their own feed poll votes"
on public.feed_poll_votes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own feed poll votes"
on public.feed_poll_votes;
create policy "Users can delete their own feed poll votes"
on public.feed_poll_votes for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.feed_polls from anon, authenticated;
revoke all on public.feed_poll_options from anon, authenticated;
revoke all on public.feed_poll_votes from anon, authenticated;

grant select on public.feed_polls to authenticated;
grant insert (post_id, question, ends_at) on public.feed_polls to authenticated;

grant select on public.feed_poll_options to authenticated;
grant insert (poll_id, text, display_order) on public.feed_poll_options to authenticated;

grant select, delete on public.feed_poll_votes to authenticated;
grant insert (poll_id, option_id, user_id) on public.feed_poll_votes to authenticated;

notify pgrst, 'reload schema';
