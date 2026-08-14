-- Módulo de Mudanzas: preregistro (fase 1 del proceso SC-PR-01).
-- Corre esto una sola vez en el SQL Editor de Supabase.

create sequence if not exists mudanzas_numero_seq;

create table if not exists mudanzas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null default nextval('mudanzas_numero_seq'),
  correo text not null,
  unidad text not null,
  tipo_formato text not null check (tipo_formato in ('A', 'B')),
  tipo_movimiento text not null check (tipo_movimiento in ('ingreso', 'salida')),
  es_propietario boolean not null,
  fecha_mudanza date not null,
  created_at timestamptz not null default now()
);
create index if not exists mudanzas_correo_idx on mudanzas (correo);
alter table mudanzas enable row level security;

-- Sin políticas para anon/authenticated: solo se accede vía los endpoints
-- de Next.js que usan SUPABASE_SERVICE_ROLE_KEY.
