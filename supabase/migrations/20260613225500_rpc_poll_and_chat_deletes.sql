-- RLS'e takilan anket olusturma ve sohbet silme islemlerini kontrollu RPC'lere tasir.

create or replace function public.create_feed_poll_for_post(
  target_post_id uuid,
  poll_question text,
  poll_options text[],
  poll_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_poll_id uuid;
  option_text text;
  option_index integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.feed_posts
    where id = target_post_id
      and author_id = (select auth.uid())
  ) then
    raise exception 'Post ownership required';
  end if;

  if poll_question is null
    or btrim(poll_question) = ''
    or char_length(btrim(poll_question)) > 1000
    or not public.is_safe_user_text(btrim(poll_question))
  then
    raise exception 'Invalid poll question';
  end if;

  if poll_options is null
    or array_length(poll_options, 1) < 2
    or array_length(poll_options, 1) > 5
  then
    raise exception 'Poll requires 2 to 5 options';
  end if;

  insert into public.feed_polls (post_id, question, ends_at)
  values (target_post_id, btrim(poll_question), poll_ends_at)
  returning id into created_poll_id;

  foreach option_text in array poll_options loop
    option_text := btrim(option_text);

    if option_text = ''
      or char_length(option_text) > 200
      or not public.is_safe_user_text(option_text)
    then
      raise exception 'Invalid poll option';
    end if;

    insert into public.feed_poll_options (poll_id, text, display_order)
    values (created_poll_id, option_text, option_index);

    option_index := option_index + 1;
  end loop;

  return created_poll_id;
end;
$$;

create or replace function public.delete_conversation_message(
  target_conversation_id uuid,
  target_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_message_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.conversations
    where id = target_conversation_id
      and (
        "participant1Id" = (select auth.uid())
        or "participant2Id" = (select auth.uid())
      )
  ) then
    raise exception 'Conversation participant required';
  end if;

  delete from public.messages
  where id = target_message_id
    and "conversationId" = target_conversation_id;

  if not found then
    raise exception 'Message not found';
  end if;

  select max("createdAt")
  into latest_message_at
  from public.messages
  where "conversationId" = target_conversation_id;

  update public.conversations
  set "lastMessageAt" = latest_message_at
  where id = target_conversation_id;
end;
$$;

create or replace function public.delete_user_conversation(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  delete from public.conversations
  where id = target_conversation_id
    and (
      "participant1Id" = (select auth.uid())
      or "participant2Id" = (select auth.uid())
    );

  if not found then
    raise exception 'Conversation not found';
  end if;
end;
$$;

revoke all on function public.create_feed_poll_for_post(uuid, text, text[], timestamptz)
from public, anon;
revoke all on function public.delete_conversation_message(uuid, uuid)
from public, anon;
revoke all on function public.delete_user_conversation(uuid)
from public, anon;

grant execute on function public.create_feed_poll_for_post(uuid, text, text[], timestamptz)
to authenticated;
grant execute on function public.delete_conversation_message(uuid, uuid)
to authenticated;
grant execute on function public.delete_user_conversation(uuid)
to authenticated;

notify pgrst, 'reload schema';
