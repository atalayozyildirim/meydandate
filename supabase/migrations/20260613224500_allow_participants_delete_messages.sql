-- Sohbet katilimcilarinin tekil mesajlari kaydirarak silebilmesini saglar.

drop policy if exists "Participants can delete messages"
on public.messages;
create policy "Participants can delete messages"
on public.messages for delete to authenticated
using (
  exists (
    select 1
    from public.conversations as conversation
    where conversation.id = public.messages."conversationId"
      and (
        conversation."participant1Id" = (select auth.uid())
        or conversation."participant2Id" = (select auth.uid())
      )
  )
);

grant delete on public.messages to authenticated;

notify pgrst, 'reload schema';
