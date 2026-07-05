-- Karsilikli engel/sessize alma tercihlerini canli Spotify gorunurlugune uygula.

drop policy if exists "Authenticated users can read eligible Spotify presence"
on public.spotify_live_presence;

create policy "Authenticated users can read eligible Spotify presence"
on public.spotify_live_presence for select
to authenticated
using (
  expires_at > now()
  and (
    user_id = (select auth.uid())
    or (
      exists (
        select 1
        from public.users as candidate
        where candidate.id = spotify_live_presence.user_id
          and candidate."isActive" = true
          and candidate."isDiscoverable" = true
          and candidate."hasCompletedOnboarding" = true
          and candidate."profileKind" = 'member'
          and not ((select auth.uid()) = any(candidate."blockedUsers"))
          and not ((select auth.uid()) = any(candidate."mutedUsers"))
      )
      and exists (
        select 1
        from public.users as requester
        where requester.id = (select auth.uid())
          and requester."isActive" = true
          and not (spotify_live_presence.user_id = any(requester."blockedUsers"))
          and not (spotify_live_presence.user_id = any(requester."mutedUsers"))
      )
    )
  )
);

notify pgrst, 'reload schema';
