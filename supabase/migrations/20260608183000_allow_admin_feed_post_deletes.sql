-- Allow post authors and admins to delete feed posts.
-- Child comments/replies/likes/reports are removed by existing ON DELETE CASCADE FKs.

drop policy if exists "Users can delete their own feed posts" on public.feed_posts;

create policy "Authors and admins can delete feed posts"
on public.feed_posts for delete to authenticated
using (
  (select auth.uid()) = author_id
  or (select public.is_admin())
);
