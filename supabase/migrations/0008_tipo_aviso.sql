-- La app distingue avisos de horario, de servicio y generales (packages/compartido/src/servicios.ts).
create type public.tipo_aviso as enum ('horario', 'servicio', 'general');
alter table public.avisos add column tipo public.tipo_aviso not null default 'general';
