// Festività nazionali italiane 2026 (formato YYYY-MM-DD)
const HOLIDAYS_2026 = new Set([
  "2026-01-01", // Capodanno
  "2026-01-06", // Epifania
  "2026-04-06", // Lunedì dell'Angelo (Pasquetta)
  "2026-04-25", // Festa della Liberazione
  "2026-05-01", // Festa dei Lavoratori
  "2026-06-02", // Festa della Repubblica
  "2026-08-15", // Ferragosto
  "2026-11-01", // Ognissanti
  "2026-12-08", // Immacolata Concezione
  "2026-12-25", // Natale
  "2026-12-26", // Santo Stefano
]);

// Ultimo giorno disponibile per la migrazione
const END_DATE = new Date(2026, 9, 31); // mese 9 = ottobre (0-indicizzato)

// Genera gli slot orari disponibili da oggi fino al 31 ottobre 2026.
// Orari: 9:00-13:00 e 14:00-17:00 (compreso), slot da 1 ora,
// esclusi sabato, domenica e le festività nazionali.
export function generateUpcomingSlots() {
  const hours = [9, 10, 11, 12, 14, 15, 16, 17];
  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);

  while (cursor <= END_DATE) {
    const day = cursor.getDay(); // 0 = domenica, 6 = sabato
    const dateStr = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
    const isWeekend = day === 0 || day === 6;
    const isHoliday = HOLIDAYS_2026.has(dateStr);

    if (!isWeekend && !isHoliday) {
      for (const h of hours) {
        slots.push({
          date: dateStr,
          start: `${String(h).padStart(2, "0")}:00`,
          label: cursor.toLocaleDateString("it-IT", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}