// Genera gli slot orari disponibili per i prossimi `days` giorni lavorativi.
// Orari: 9:00-13:00 e 14:00-17:00, slot da 1 ora, esclusi sabato/domenica.

export function generateUpcomingSlots(days = 14) {
  const hours = [9, 10, 11, 12, 14, 15, 16];
  const slots = [];
  const today = new Date();
  let added = 0;
  let offset = 0;

  while (added < days) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    offset += 1;

    const day = d.getDay(); // 0 = domenica, 6 = sabato
    if (day === 0 || day === 6) continue;

    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    for (const h of hours) {
      slots.push({
        date: dateStr,
        start: `${String(h).padStart(2, "0")}:00`,
        label: d.toLocaleDateString("it-IT", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      });
    }
    added += 1;
  }

  return slots;
}
