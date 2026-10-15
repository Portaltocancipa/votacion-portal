-- Permite precargar residentes/propietarios desde el directorio de Nova/
-- propietarios oficiales (sin documento, fecha de nacimiento ni matrícula
-- -- esos datos los completa cada persona cuando entra a la app). Los
-- registros reales que la gente diligencia desde el formulario siguen
-- exigiendo esos campos a nivel de aplicación (validarRegistro() en
-- lib/registros.ts); aquí solo se relaja la base para permitir la carga
-- inicial.
alter table residentes alter column tipo_documento drop not null;
alter table residentes alter column numero_documento drop not null;
alter table residentes alter column fecha_nacimiento drop not null;
alter table residentes alter column correo drop not null;

alter table propietarios alter column tipo_documento drop not null;
alter table propietarios alter column numero_documento drop not null;
alter table propietarios alter column fecha_nacimiento drop not null;
alter table propietarios alter column correo drop not null;

-- Marca las filas cargadas desde el directorio (no diligenciadas por la
-- persona misma), para que el panel de admin las distinga de un registro
-- real.
alter table residentes add column if not exists precargado boolean not null default false;
alter table propietarios add column if not exists precargado boolean not null default false;
