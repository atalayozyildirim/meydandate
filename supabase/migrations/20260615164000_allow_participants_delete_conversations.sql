-- Allow authenticated participants to delete their own conversations directly.
-- This keeps chat deletion working even before RPC helpers are available remotely.

drop policy if exists "Participants can delete conversations"
on public.conversations;

create policy "Participants can delete conversations"
on public.conversations for delete to authenticated
using (
  "participant1Id" = (select auth.uid())
  or "participant2Id" = (select auth.uid())
);

grant delete on public.conversations to authenticated;

notify pgrst, 'reload schema';
