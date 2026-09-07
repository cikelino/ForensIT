-- Esegui questo script una sola volta dentro Supabase (SQL Editor)

create extension if not exists "pgcrypto";

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  colleague_name text not null,
  colleague_email text not null,
  slot_date date not null,
  slot_start time not null, -- es. 09:00:00
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'rejected')),
  proposed_by text not null default 'colleague' check (proposed_by in ('colleague', 'admin')),
  notes text,
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- Indice per le query di disponibilità
create index if not exists bookings_date_idx on bookings (slot_date);

-- Uno slot può avere al massimo UNA prenotazione attiva (proposta o confermata)
-- contemporaneamente: questo impedisce le doppie prenotazioni.
create unique index if not exists bookings_active_slot_idx
  on bookings (slot_date, slot_start)
  where status in ('proposed', 'confirmed');

-- Attiva il realtime sulla tabella (necessario per la sincronizzazione live)
alter publication supabase_realtime add table bookings;

-- Row Level Security: consentiamo lettura pubblica e inserimento pubblico
-- (l'app è ad uso interno, protetta solo dal link; per un uso più sensibile
-- si potrebbe aggiungere autenticazione in futuro)
alter table bookings enable row level security;

create policy "Lettura pubblica" on bookings
  for select using (true);

create policy "Inserimento pubblico" on bookings
  for insert with check (true);

create policy "Aggiornamento pubblico" on bookings
  for update using (true);
