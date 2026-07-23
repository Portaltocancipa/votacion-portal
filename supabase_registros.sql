-- Módulos de Registro y actualización de Residentes / Propietarios
-- Corre esto una sola vez en el SQL Editor de Supabase.

create table if not exists residentes (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  tipo_documento text not null,
  numero_documento text not null,
  nombres text not null,
  apellidos text not null,
  telefono text,
  fecha_nacimiento date not null,
  created_at timestamptz not null default now()
);
create index if not exists residentes_correo_idx on residentes (correo);
alter table residentes enable row level security;
alter table residentes add column if not exists correo_contacto text;
alter table residentes add column if not exists es_contacto_principal boolean not null default false;

create table if not exists propietarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  tipo_documento text not null,
  numero_documento text not null,
  nombres text not null,
  apellidos text not null,
  telefono text,
  fecha_nacimiento date not null,
  created_at timestamptz not null default now()
);
create index if not exists propietarios_correo_idx on propietarios (correo);
alter table propietarios enable row level security;
alter table propietarios add column if not exists correo_contacto text;
alter table propietarios add column if not exists es_contacto_principal boolean not null default false;

-- Campos exclusivos de Propietarios (identificación del inmueble)
alter table propietarios add column if not exists numero_matricula text;
alter table propietarios add column if not exists direccion text;
alter table propietarios add column if not exists ciudad text;

-- Sin políticas para anon/authenticated: solo se accede vía los endpoints
-- de Next.js que usan SUPABASE_SERVICE_ROLE_KEY (igual que encuestas/respuestas_encuesta).
