# Admin Bootstrap

Son kontrol: 2026-06-07

Bu uygulamada admin yetkisi `public.user_roles` tablosundan gelir. Meydan canlı yayın yönetimi ve özel davet akışı için Atalay Özyıldırım kullanıcısının `admin` rolü olması gerekir.

## Ön Koşul

Önce uygulamaya gerçek hesabınla giriş yap. `public.users` içinde adın şu şekilde olmalı:

```text
Atalay Özyıldırım
```

## Admin Rolü Verme

Supabase SQL Editor'de çalıştır:

```sql
insert into public.user_roles ("userId", role, "assignedBy")
select id, 'admin', 'bootstrap'
from public.users
where public.normalize_person_name(name) = 'atalay ozyildirim'
on conflict ("userId") do update
set role = excluded.role,
    "assignedBy" = excluded."assignedBy",
    "assignedAt" = now();
```

## Kontrol

```sql
select users.id, users.name, user_roles.role
from public.users
join public.user_roles
  on public.user_roles."userId" = public.users.id
where public.normalize_person_name(users.name) = 'atalay ozyildirim';
```

Sonuçta `role = admin` görmelisin.

## Etkisi

Admin rolü verilince:

- Meydan ekranında admin yayın paneli görünür.
- `admin_start_live_room` ve `admin_stop_live_room` RPC çağrıları çalışır.
- Zeynep Çisem isim varyantı ile gelen kullanıcıya rızalı özel davet üretilebilir.

## Güvenlik Notu

Bu SQL'i sadece kendi hesabın için çalıştır. Client içine service role key koyma. Admin rol atamasını yalnızca Supabase Dashboard SQL Editor veya güvenli backend üzerinden yap.
