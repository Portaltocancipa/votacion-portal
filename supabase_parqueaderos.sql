-- Módulo de Parqueadero
-- Corre esto una sola vez en el SQL Editor de Supabase.

create table if not exists parqueaderos (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  unidad text not null,
  numero_parqueadero text not null,
  nombres text not null,
  apellidos text not null,
  placa text not null,
  marca text not null,
  modelo text not null,
  tipo_vehiculo text not null check (tipo_vehiculo in ('Carro', 'Moto')),
  eliminado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists parqueaderos_correo_idx on parqueaderos (correo);
alter table parqueaderos enable row level security;

-- Sin políticas para anon/authenticated: solo se accede vía los endpoints
-- de Next.js que usan SUPABASE_SERVICE_ROLE_KEY.
