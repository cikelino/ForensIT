# Prenotazione migrazione profilo

App per prenotare in tempo reale gli slot per la migrazione dei profili
utente: calendario condiviso, niente doppie prenotazioni, email automatiche
per proposta/accetta/rifiuta/conferma.

## Cosa devi fare tu (5 passaggi, ~20 minuti)

### 1. Crea un progetto Supabase (gratis)
1. Vai su https://supabase.com, crea un account e un nuovo progetto.
2. Nel progetto, apri **SQL Editor** e incolla il contenuto di
   `supabase/schema.sql`, poi esegui.
3. Vai su **Project Settings > API** e copia:
   - `Project URL` → sarà `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → sarà `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → sarà `SUPABASE_SERVICE_ROLE_KEY` (tienila segreta,
     non finisce mai nel frontend)

### 2. Crea un account Resend per le email (gratis fino a 3.000/mese)
1. Vai su https://resend.com e registrati.
2. In **API Keys**, crea una chiave → sarà `RESEND_API_KEY`.
3. Per iniziare puoi mandare email da `onboarding@resend.dev` (dominio di
   test già verificato da Resend, funziona subito). In futuro, se vuoi
   mandarle da un indirizzo aziendale, dovrai verificare il tuo dominio su
   Resend (aggiungendo record DNS) — ma per partire non è necessario.

### 3. Compila le variabili d'ambiente
Copia `.env.local.example` in un nuovo file chiamato `.env.local` e
compila tutti i valori (Supabase, Resend, la tua email, l'email di Denny).

### 4. Prova in locale
```
npm install
npm run dev
```
Apri http://localhost:3000, proponi uno slot di prova, e controlla che ti
arrivi l'email con i link Accetta/Rifiuta.

### 5. Deploy su Vercel (gratis)
1. Carica questa cartella su un repository GitHub.
2. Vai su https://vercel.com, collega il repository e fai il deploy.
3. In **Project Settings > Environment Variables** su Vercel, inserisci le
   stesse variabili di `.env.local`, ma con `NEXT_PUBLIC_BASE_URL` uguale
   all'URL che Vercel ti assegna (es. `https://tuo-progetto.vercel.app`).
4. Rideploya: da questo momento il link è quello da condividere con i
   colleghi.

## Aggiornamento: riproponi orario + note

Se hai già creato il progetto Supabase seguendo la versione precedente di
questa guida, esegui una volta sola nel **SQL Editor** di Supabase il
contenuto di `supabase/alter-add-notes-and-proposer.sql` per aggiungere i
nuovi campi alla tabella esistente. Se stai partendo da zero, `schema.sql`
li include già.

## Come funziona

- La pagina principale (`/`) mostra il calendario dei prossimi 14 giorni
  lavorativi, slot da 1 ora, 9-13 e 14-17. Gli slot già proposti o
  confermati sono disabilitati per tutti in tempo reale (tramite Supabase
  Realtime): due colleghi non possono mai prenotare lo stesso slot.
- Quando un collega propone uno slot (con eventuali note), arriva una email
  a te con un link a `/respond?token=...`.
- Da lì puoi **accettare** (parte l'email di conferma a te, al collega e a
  Denny), **rifiutare**, oppure **proporre un altro orario**: in questo
  caso la proposta precedente si chiude, lo slot vecchio si libera, e parte
  una nuova email al collega con lo stesso link `/respond` per la sua
  risposta. Il collega può a sua volta accettare, rifiutare o riproporre,
  finché uno dei due accetta. Le note inserite in ogni proposta compaiono
  sempre nell'email e nella pagina di risposta.

## Limiti attuali / possibili estensioni future
- L'accesso al calendario e alla pagina di risposta è protetto solo dal
  link, senza login: adeguato per un uso interno via email aziendale, ma
  da tenere presente.
