-- Repair profile photo Storage bucket policies.
-- The client uploads to profile-photos/<auth.uid()>/<file>.
-- Supabase Storage upsert needs insert + select + update permissions.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read profile photos"
on storage.objects;
drop policy if exists "Users can upload their own profile photos"
on storage.objects;
drop policy if exists "Users can update their own profile photos"
on storage.objects;
drop policy if exists "Users can delete their own profile photos"
on storage.objects;

create policy "Authenticated users can read profile photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-photos');

create policy "Users can upload their own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
