"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { generateUpcomingSlots } from "../lib/slots";
import Header from "./components/Header";
import DaySlotPicker from "./components/DaySlotPicker";

const MAX_SLOTS = 3;

export default function Home() {
  const allSlots = useMemo(() => generateUpcomingSlots(14), []);
  const [taken, setTaken] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]); // [{date, start}, ...] fino a 3
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of allSlots) {
      if (!map.has(s.date)) map.set(s.date, { label: s.label, slots: [] });
      map.get(s.date).slots.push(s);
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  }, [allSlots]);

  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then((d) => setTaken(d.bookings || []));
  }, []);

  // Sottoscrizione realtime: qualsiasi cambio sulla tabella aggiorna la UI
  // per tutti i visitatori collegati, senza refresh.
  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetch("/api/slots")
            .then((r) => r.json())
            .then((d) => setTaken(d.bookings || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isTaken = (date, start) =>
    taken.some((b) => b.slot_date === date && b.slot_start.slice(0, 5) === start);

  const isSelected = (date, start) =>
    selectedSlots.some((s) => s.date === date && s.start === start);

  function toggleSlot(slot) {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.date === slot.date && s.start === slot.start);
      if (exists) return prev.filter((s) => !(s.date === slot.date && s.start === slot.start));
      if (prev.length >= MAX_SLOTS) return prev;
      return [...prev, slot];
    });
  }

  const selectedLabels = useMemo(() => {
    return selectedSlots.map((sel) => {
      const day = grouped.find((d) => d.date === sel.date);
      return day ? `${day.label} alle ${sel.start}` : `${sel.date} alle ${sel.start}`;
    });
  }, [selectedSlots, grouped]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedSlots.length === 0 || !name || !email) return;

    setSubmitting(true);
    setMessage(null);

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colleague_name: name,
        colleague_email: email,
        notes: notes || null,
        slots: selectedSlots,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Errore durante l'invio" });
      return;
    }

    const failedNote =
      data.failedCount > 0
        ? ` (${data.failedCount} ${data.failedCount === 1 ? "opzione era" : "opzioni erano"} nel frattempo già occupate e non sono state incluse)`
        : "";

    setMessage({
      type: "success",
      text: `Proposta inviata${failedNote}. Riceverai una email di conferma appena verrà accettata una delle opzioni.`,
    });
    setSelectedSlots([]);
    setName("");
    setEmail("");
    setNotes("");
  }

  return (
    <>
      <Header />
      <main>
        <h1>Prenota la migrazione del profilo</h1>
        <p className="subtitle">
          Scegli fino a 3 slot da 1 ora, dal lunedì al venerdì, tra le 9:00 e
          le 17:00: chi gestisce le migrazioni sceglierà quella più comoda
          tra le opzioni che proponi. Riceverai una email di conferma una
          volta scelto uno degli orari.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="booking-layout">
            <div className="panel">
              <div className="panel-heading">
                Scegli fino a {MAX_SLOTS} orari ({selectedSlots.length}/{MAX_SLOTS})
              </div>
              <DaySlotPicker
                grouped={grouped}
                isTaken={isTaken}
                isSelected={isSelected}
                onSelect={toggleSlot}
              />
            </div>

            <div className="panel summary-panel">
              <div className="panel-heading">Riepilogo</div>

              <div className="selection-summary">
                {selectedLabels.length > 0 ? (
                  <>
                    <strong>
                      {selectedLabels.length}{" "}
                      {selectedLabels.length === 1 ? "orario selezionato" : "orari selezionati"}
                    </strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {selectedLabels.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <span className="empty">Nessuno slot selezionato</span>
                )}
              </div>

              <div className="field">
                <label>Nome e cognome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                />
              </div>
              <div className="field">
                <label>Email aziendale</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.rossi@majorbit.com"
                  required
                />
              </div>
              <div className="field">
                <label>Note aggiuntive (facoltativo)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Es. preferenze di orario, vincoli particolari..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={selectedSlots.length === 0 || !name || !email || submitting}
              >
                {submitting
                  ? "Invio in corso..."
                  : selectedSlots.length > 1
                  ? "Proponi questi orari"
                  : "Proponi questo orario"}
              </button>

              {message && (
                <div className={`message ${message.type}`}>{message.text}</div>
              )}
            </div>
          </div>
        </form>
      </main>
    </>
  );
}