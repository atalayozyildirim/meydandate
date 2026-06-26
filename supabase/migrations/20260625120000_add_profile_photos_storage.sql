-- Add profile photos storage bucket and policies for public photo access

-- Create the profile photos bucket
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

-- Allow authenticated users to read profile photos (public access)
drop policy if exists "Authenticated users can read profile photos"
on storage.objects;
create policy "Authenticated users can read profile photos"
on storage.objects for select to authenticated
using (bucket_id = 'profile-photos');

-- Allow users to upload their own profile photos
drop policy if exists "Users can upload their own profile photos"
on storage.objects;
create policy "Users can upload their own profile photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Allow users to update their own profile photos
drop policy if exists "Users can update their own profile photos"
on storage.objects;
create policy "Users can update their own profile photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Allow users to delete their own profile photos
drop policy if exists "Users can delete their own profile photos"
on storage.objects;
create policy "Users can delete their own profile photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
