-- Add profileKind column to users table
alter table public.users
  add column if not exists "profileKind" text not null default 'member';

do $$
begin
  alter table public.users
    add constraint users_profile_kind_check
    check ("profileKind" in ('member', 'starter', 'ai_starter'));
exception
  when duplicate_object then null;
end $$;

update public.users
set "profileKind" = 'starter'
where id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid
);

create index if not exists users_discover_member_idx
on public.users ("profileKind", "isActive", "isDiscoverable", "hasPassedEntryTest", "hasCompletedOnboarding", "createdAt" desc);

grant select ("profileKind") on public.users to authenticated;

notify pgrst, 'reload schema';
