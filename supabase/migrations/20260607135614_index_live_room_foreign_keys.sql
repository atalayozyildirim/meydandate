-- Live room foreign key lookup'larini hizlandirir.
create index if not exists live_rooms_created_by_idx
on public.live_rooms (created_by)
where created_by is not null;

create index if not exists live_room_participants_user_idx
on public.live_room_participants (user_id, joined_at desc);
