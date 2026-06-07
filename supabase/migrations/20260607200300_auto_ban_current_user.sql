-- Otomatik moderation banı için sadece mevcut oturum sahibini kalıcı banlayan RPC.
create or replace function public.auto_ban_current_user(reason_text text)
returns public.banned_users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  safe_reason text := left(
    coalesce(nullif(trim(reason_text), ''), 'Otomatik moderation banı'),
    1000
  );
  existing_ban public.banned_users%rowtype;
  created_ban public.banned_users%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into existing_ban
  from public.banned_users
  where "userId" = current_user_id
    and ("banType" = 'permanent' or "expiresAt" > now())
  order by "createdAt" desc
  limit 1;

  if found then
    return existing_ban;
  end if;

  insert into public.banned_users (
    id,
    "userId",
    "banType",
    reason,
    "bannedBy",
    "createdAt"
  )
  values (
    gen_random_uuid()::text,
    current_user_id,
    'permanent',
    safe_reason,
    'system:auto_moderation',
    now()
  )
  returning * into created_ban;

  update public.users
  set "isActive" = false
  where id = current_user_id;

  insert into public.audit_logs (
    id,
    "userId",
    action,
    "targetType",
    "targetId",
    details,
    "createdAt"
  )
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'permanent_ban',
    'ban',
    created_ban.id,
    jsonb_build_object('reason', safe_reason, 'source', 'auto_moderation'),
    now()
  );

  return created_ban;
end;
$$;

revoke all on function public.auto_ban_current_user(text) from public, anon;
grant execute on function public.auto_ban_current_user(text) to authenticated;
