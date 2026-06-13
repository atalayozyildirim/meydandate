-- isActive kolonu authenticated role'u icin eksik SELECT grant'ini ekler.
-- Bu olmadan bot profil sorgulari 42501 (permission denied) veya bos sonuc verir.

grant select ("isActive") on public.users to authenticated;

notify pgrst, 'reload schema';
