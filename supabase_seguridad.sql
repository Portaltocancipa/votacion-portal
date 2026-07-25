-- Corre esto una sola vez en el SQL Editor de Supabase.

-- 1) Bloqueo temporal por intentos fallidos de token en /api/validar.
-- Un PIN de 4 dígitos (10.000 combinaciones) es adivinable por fuerza bruta
-- si no hay límite de intentos. Bloquea 15 minutos tras 5 fallos seguidos.
create table if not exists intentos_login (
  correo text primary key,
  intentos int not null default 0,
  bloqueado_hasta timestamptz
);
alter table intentos_login enable row level security;
-- Sin políticas para anon/authenticated: solo se accede vía endpoints de
-- Next.js con SUPABASE_SERVICE_ROLE_KEY (igual que las demás tablas).

-- 2) Límite de 4 parqueaderos por cuenta, atómico (evita condición de
-- carrera si dos envíos casi simultáneos pasan el conteo antes de insertar).
-- Mismo patrón que next_receipt_serial en el proyecto pos-tocancipa:
-- pg_advisory_xact_lock mantiene el candado hasta que termina la transacción,
-- que incluye tanto el conteo como el insert.
create or replace function crear_parqueadero_atomico(
  p_correo text,
  p_unidad text,
  p_numero_parqueadero text,
  p_nombres text,
  p_apellidos text,
  p_placa text,
  p_marca text,
  p_modelo text,
  p_tipo_vehiculo text,
  p_max int default 4
)
returns parqueaderos
language plpgsql
as $$
declare
  v_count int;
  v_row parqueaderos;
begin
  perform pg_advisory_xact_lock(hashtext(lower(p_correo)));

  select count(*) into v_count
  from parqueaderos
  where correo = lower(p_correo) and eliminado = false;

  if v_count >= p_max then
    raise exception 'Ya alcanzaste el máximo de % vehículos registrados.', p_max;
  end if;

  insert into parqueaderos (correo, unidad, numero_parqueadero, nombres, apellidos, placa, marca, modelo, tipo_vehiculo)
  values (lower(p_correo), p_unidad, p_numero_parqueadero, p_nombres, p_apellidos, p_placa, p_marca, p_modelo, p_tipo_vehiculo)
  returning * into v_row;

  return v_row;
end;
$$;
