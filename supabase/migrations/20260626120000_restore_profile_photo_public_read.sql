-- Profile photos are shown in feed, chat and live UI via unauthenticated Image requests.
-- Public bucket URLs must be readable without a Supabase session.

drop policy if exists "Profile photos are publicly readable"
on storage.objects;

create policy "Profile photos are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'profile-photos');

notify pgrst, 'reload schema';
