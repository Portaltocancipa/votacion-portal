-- Hora de inicio de la mudanza, para poder validar el horario permitido
-- (lunes a viernes 8:00-16:00, sábados 8:00-12:00). Nullable a nivel de base
-- para no romper filas ya creadas antes de este cambio; se exige en la app.
-- Correr en el SQL Editor de Supabase.

alter table mudanzas add column if not exists hora_inicio time;
