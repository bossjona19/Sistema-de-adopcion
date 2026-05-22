-- ============================================================
-- PROYECTO OMEGA — Esquema PostgreSQL (Supabase)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensión UUID
create extension if not exists "uuid-ossp";

-- ─── usuarios ───────────────────────────────────────────────
-- Nota: Supabase gestiona auth.users automáticamente.
-- Esta tabla extiende el perfil de cada administrador.
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text unique not null,
  rol         text not null default 'admin',
  created_at  timestamptz not null default now()
);

-- ─── familias ───────────────────────────────────────────────
create table if not exists public.familias (
  id               uuid primary key default uuid_generate_v4(),
  apellido         text not null,
  contacto         text,
  estado_eval      text not null default 'pendiente'
                     check (estado_eval in ('pendiente','aprobada','rechazada')),
  fecha_solicitud  date not null default current_date,
  notas            text,
  created_at       timestamptz not null default now()
);

-- ─── menores ────────────────────────────────────────────────
create table if not exists public.menores (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  edad        int  check (edad >= 0 and edad <= 17),
  estado      text not null default 'disponible'
                check (estado in ('disponible','en_proceso','adoptado')),
  foto_url    text,
  descripcion text,
  created_at  timestamptz not null default now()
);

-- ─── casos ──────────────────────────────────────────────────
create table if not exists public.casos (
  id          uuid primary key default uuid_generate_v4(),
  familia_id  uuid not null references public.familias(id) on delete restrict,
  menor_id    uuid not null references public.menores(id)  on delete restrict,
  etapa       text not null default 'solicitud'
                check (etapa in ('solicitud','evaluacion','asignacion','seguimiento','cierre')),
  usuario_id  uuid references public.usuarios(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── seguimiento ─────────────────────────────────────────────
create table if not exists public.seguimiento (
  id          uuid primary key default uuid_generate_v4(),
  caso_id     uuid not null references public.casos(id) on delete cascade,
  descripcion text not null,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references public.usuarios(id) on delete set null
);

-- ─── bitacora ────────────────────────────────────────────────
create table if not exists public.bitacora (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete set null,
  accion      text not null,
  entidad     text not null,
  fecha       timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────
-- Habilitamos RLS y solo permitimos acceso a usuarios autenticados.

alter table public.usuarios    enable row level security;
alter table public.familias    enable row level security;
alter table public.menores     enable row level security;
alter table public.casos       enable row level security;
alter table public.seguimiento enable row level security;
alter table public.bitacora    enable row level security;

-- Políticas admin: usuario autenticado puede leer/escribir todo
create policy "auth_all" on public.familias    for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.menores     for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.casos       for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.seguimiento for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.bitacora    for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.usuarios    for all using (auth.role() = 'authenticated');

-- Políticas públicas (ciudadano sin cuenta):
-- 1. Puede VER menores disponibles (galería pública)
create policy "public_read_menores" on public.menores
  for select using (estado = 'disponible');

-- 2. Puede INSERTAR una solicitud (formulario público)
create policy "public_insert_familias" on public.familias
  for insert with check (estado_eval = 'pendiente');

-- ─── Datos de ejemplo (opcional) ─────────────────────────────
/*
insert into public.familias (apellido, contacto, estado_eval, fecha_solicitud)
values
  ('González', 'gonzalez@email.com', 'aprobada', '2026-03-10'),
  ('Martínez', '+57 300 1234567',    'pendiente', '2026-04-15'),
  ('López',    'lopez@email.com',    'aprobada', '2026-05-01');

insert into public.menores (nombre, edad, estado, descripcion)
values
  ('Sofía Ramírez', 5,  'disponible', 'Niña activa y alegre, le gustan los libros.'),
  ('Carlos Pérez',  8,  'disponible', 'Niño tranquilo, apasionado por el dibujo.'),
  ('Valentina Cruz',3,  'disponible', 'Bebé en buen estado de salud.');
*/
