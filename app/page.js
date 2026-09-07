"use client";

import { useEffect, useMemo, useState } from "react";
import { generateUpcomingSlots } from "../lib/slots";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const allSlots = useMemo(() => generateUpcomingSlots(14), []);
  const [taken, setTaken] = useState([]); // [{slot_date, slot_start, status}]
  const [selected, setSelected] = useState(null); // {date, start}
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // {type, text}

  // Carica lo stato iniziale degli slot occupati
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

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of allSlots) {
      if (!map.has(s.date)) map.set(s.date, { label: s.label, slots: [] });
      map.get(s.date).slots.push(s);
    }
    return Array.from(map.values());
  }, [allSlots]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || !name || !email) return;

    setSubmitting(true);
    setMessage(null);

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colleague_name: name,
        colleague_email: email,
        slot_date: selected.date,
        slot_start: selected.start,
        notes: notes || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Errore durante l'invio" });
      return;
    }

    setMessage({
      type: "success",
      text: "Proposta inviata. Riceverai una email di conferma appena verrà accettata.",
    });
    setSelected(null);
    setName("");
    setEmail("");
    setNotes("");
  }

  return (
    <main>
      <h1>Prenota la migrazione del profilo</h1>
      <p className="subtitle">
        Scegli uno slot da 1 ora, dal lunedì al venerdì, 9:00-13:00 e
        14:00-17:00. Riceverai una email di conferma una volta accettata la
        proposta.
      </p>

      <form onSubmit={handleSubmit}>
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

        {grouped.map((day) => (
          <div className="day-block" key={day.label}>
            <div className="day-label">{day.label}</div>
            <div className="slot-grid">
              {day.slots.map((s) => {
                const occupied = isTaken(s.date, s.start);
                const isSelected =
                  selected && selected.date === s.date && selected.start === s.start;
                return (
                  <button
                    type="button"
                    key={`${s.date}-${s.start}`}
                    disabled={occupied}
                    className={`slot-btn${isSelected ? " selected" : ""}`}
                    onClick={() => setSelected({ date: s.date, start: s.start })}
                  >
                    {s.start}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="submit-btn"
          disabled={!selected || !name || !email || submitting}
        >
          {submitting ? "Invio in corso..." : "Proponi questo orario"}
        </button>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}
      </form>
    </main>
  );
}