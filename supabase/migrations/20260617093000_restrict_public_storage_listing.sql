-- Public bucket URL erişimini korurken storage.objects listeleme politikasını kapat.

drop policy if exists "Authenticated users can read feed post images"
on storage.objects;

drop policy if exists "Profile photos are publicly readable"
on storage.objects;

notify pgrst, 'reload schema';
