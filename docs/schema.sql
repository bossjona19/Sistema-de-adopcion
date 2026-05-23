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
  id                   uuid primary key default uuid_generate_v4(),
  apellido             text not null,
  contacto             text,
  estado_eval          text not null default 'pendiente'
                         check (estado_eval in ('pendiente','aprobada','rechazada')),
  fecha_solicitud      date not null default current_date,
  notas                text,
  -- Datos personales del solicitante (formulario público expandido v2)
  nombre_completo      text,
  cedula               text,
  fecha_nacimiento     date,
  email                text,
  telefono             text,
  direccion            text,
  -- Información familiar
  estado_civil         text check (estado_civil in ('soltero','casado','union_libre','divorciado','viudo')),
  num_hijos            int  check (num_hijos >= 0),
  num_personas_hogar   int  check (num_personas_hogar >= 1),
  ocupacion            text,
  ingresos_aprox       text,
  -- Motivación
  motivacion           text,
  experiencia_ninos    text,
  preferencia_edad     text,
  -- Aceptación de condiciones
  acepta_seguimiento   boolean not null default false,
  acepta_evaluacion    boolean not null default false,
  acepta_terminos      boolean not null default false,
  created_at           timestamptz not null default now()
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
-- Puede INSERTAR una solicitud (formulario público)
-- NOTA: La galería pública de menores fue eliminada por razones de privacidad (LOPD/ASVS L3).
--       Los datos de menores solo son accesibles por personal autenticado.
create policy "public_insert_familias" on public.familias
  for insert with check (estado_eval = 'pendiente');

-- ─── Datos de ejemplo (opcional) ─────────────────────────────
/*
insert into public.familias (apellido, contacto, estado_eval, fecha_solicitud)
values
  ('González', 'gonzalez@email.com', 'aprobada', '2026-03-10'),
  ('Martínez', '+507 300 1234567',   'pendiente', '2026-04-15'),
  ('López',    'lopez@email.com',    'aprobada', '2026-05-01');

insert into public.menores (nombre, edad, estado, descripcion)
values
  ('M.R.',  5,  'disponible', 'Expediente #001'),
  ('C.P.',  8,  'disponible', 'Expediente #002'),
  ('V.C.',  3,  'disponible', 'Expediente #003');
*/

-- ─── Migración v1 → v2: columnas nuevas en familias ──────────
-- Ejecutar SOLO si la tabla ya existía (upgrade desde versión anterior).
/*
alter table public.familias add column if not exists nombre_completo    text;
alter table public.familias add column if not exists cedula             text;
alter table public.familias add column if not exists fecha_nacimiento   date;
alter table public.familias add column if not exists email              text;
alter table public.familias add column if not exists telefono           text;
alter table public.familias add column if not exists direccion          text;
alter table public.familias add column if not exists estado_civil       text;
alter table public.familias add column if not exists num_hijos          int;
alter table public.familias add column if not exists num_personas_hogar int;
alter table public.familias add column if not exists ocupacion          text;
alter table public.familias add column if not exists ingresos_aprox     text;
alter table public.familias add column if not exists motivacion         text;
alter table public.familias add column if not exists experiencia_ninos  text;
alter table public.familias add column if not exists preferencia_edad   text;
alter table public.familias add column if not exists acepta_seguimiento boolean not null default false;
alter table public.familias add column if not exists acepta_evaluacion  boolean not null default false;
alter table public.familias add column if not exists acepta_terminos    boolean not null default false;
-- Eliminar política de galería pública si existía:
drop policy if exists "public_read_menores" on public.menores;
*/
