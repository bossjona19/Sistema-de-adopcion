-- ============================================================
-- Agregar Jonathan Quintero como administrador
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

insert into public.usuarios (id, nombre, email, rol)
select
  id,
  'Jonathan Quintero',
  'quinterojonathan108@gmail.com',
  'admin'
from auth.users
where email = 'quinterojonathan108@gmail.com'
on conflict (id) do update
  set nombre = excluded.nombre,
      rol    = excluded.rol;

-- Verificar resultado:
select id, nombre, email, rol, created_at
from public.usuarios
where email = 'quinterojonathan108@gmail.com';
