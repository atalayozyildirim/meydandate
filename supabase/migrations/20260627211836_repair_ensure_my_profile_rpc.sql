-- Google/Apple OAuth sonrasi ilk profil olusturma RPC'sini remote schema'da garanti eder.
-- PostgREST bazen eski cache ile "undefined function" donebildigi icin migration
-- sonunda schema reload da tetiklenir.
create or replace function public.ensure_my_profile(
  profile_email text default null,
  profile_phone_number text default null,
  profile_name text default null,
  profile_photos jsonb default '[]'::jsonb
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  safe_email text;
  safe_phone text;
  safe_name text;
  safe_photos jsonb;
  profile_record public.users;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  safe_email := nullif(trim(coalesce(profile_email, '')), '');
  safe_phone := nullif(trim(coalesce(profile_phone_number, '')), '');
  safe_name := left(nullif(trim(coalesce(profile_name, '')), ''), 80);
  safe_photos := case
    when jsonb_typeof(coalesce(profile_photos, '[]'::jsonb)) = 'array'
      then coalesce(profile_photos, '[]'::jsonb)
    else '[]'::jsonb
  end;

  if safe_name is null then
    safe_name := 'Yeni Uye';
  end if;

  if safe_email is null then
    safe_email := current_user_id::text || '@oauth.ehlibyte.local';
  end if;

  if exists (
    select 1
    from public.users
    where email = safe_email
      and id <> current_user_id
  ) then
    safe_email := current_user_id::text || '@oauth.ehlibyte.local';
  end if;

  if safe_phone is not null and exists (
    select 1
    from public.users
    where "phoneNumber" = safe_phone
      and id <> current_user_id
  ) then
    safe_phone := null;
  end if;

  insert into public.users (
    id,
    email,
    "phoneNumber",
    name,
    age,
    city,
    bio,
    "culturalIdentity",
    "cultureImportance",
    interests,
    photos
  )
  values (
    current_user_id,
    safe_email,
    safe_phone,
    safe_name,
    18,
    '',
    '',
    'prefer_not_to_say',
    'somewhat_important',
    '{}'::text[],
    safe_photos
  )
  on conflict (id) do update
    set email = case
          when public.users.email is null or public.users.email = ''
            then excluded.email
          else public.users.email
        end,
        "phoneNumber" = case
          when public.users."phoneNumber" is null
            then excluded."phoneNumber"
          else public.users."phoneNumber"
        end,
        name = case
          when public.users.name is null
            or public.users.name = ''
            or public.users.name = 'Yeni Uye'
            then excluded.name
          else public.users.name
        end,
        photos = case
          when jsonb_array_length(coalesce(public.users.photos, '[]'::jsonb)) = 0
            then excluded.photos
          else public.users.photos
        end
  returning * into profile_record;

  return profile_record;
end;
$$;

revoke all on function public.ensure_my_profile(text, text, text, jsonb) from public, anon;
grant execute on function public.ensure_my_profile(text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
