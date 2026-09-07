-- Esegui questo script nel SQL Editor del progetto Supabase che hai già creato.
-- Aggiunge il campo note libere e il campo che indica chi ha fatto l'ultima proposta.

alter table bookings add column if not exists notes text;

alter table bookings add column if not exists proposed_by text not null default 'colleague'
  check (proposed_by in ('colleague', 'admin'));
