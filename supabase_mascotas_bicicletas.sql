-- Módulos de Mascotas y Bicicletas (dentro de Residentes)
-- + campo "inmueble arrendado" en Residentes
-- Corre esto una sola vez en el SQL Editor de Supabase.

alter table residentes add column if not exists inmueble_arrendado text;

create table if not exists mascotas (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  unidad text not null,
  especie text not null,
  nombre text not null,
  raza text not null,
  edad text not null,
  tamano text not null,
  eliminado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mascotas_correo_idx on mascotas (correo);
alter table mascotas enable row level security;

create table if not exists bicicletas (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  unidad text not null,
  color text not null,
  marca text not null,
  en_bicicletero text not null,
  numero_asignado text,
  eliminado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bicicletas_correo_idx on bicicletas (correo);
alter table bicicletas enable row level security;

-- Sin políticas para anon/authenticated: solo se accede vía los endpoints
-- de Next.js que usan SUPABASE_SERVICE_ROLE_KEY.
