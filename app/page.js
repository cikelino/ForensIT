"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { generateUpcomingSlots } from "../lib/slots";
import Header from "./components/Header";

export default function Home() {
  const allSlots = useMemo(() => generateUpcomingSlots(14), []);
  const [taken, setTaken] = useState([]);
  const [selected, setSelected] = useState(null); // {date, start}
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

  const [activeDay, setActiveDay] = useState(0);

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

  const currentDay = grouped[activeDay];

  const selectedLabel = useMemo(() => {
    if (!selected) return null;
    const day = grouped.find((d) => d.date === selected.date);
    return day ? `${day.label} alle ${selected.start}` : null;
  }, [selected, grouped]);

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
    <>
      <Header />
      <main>
        <h1>Prenota la migrazione del profilo</h1>
        <p className="subtitle">
          Scegli un giorno e uno slot da 1 ora, dal lunedì al venerdì, tra le
          9:00 e le 17:00. Riceverai una email di conferma una volta
          accettata la proposta.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="booking-layout">
            <div className="panel">
              <div className="panel-heading">Scegli giorno e orario</div>

              <div className="day-selector">
                {grouped.map((day, i) => {
                  const [weekday, num, month] = day.label.split(" ");
                  return (
                    <button
                      type="button"
                      key={day.date}
                      className={`day-pill${i === activeDay ? " active" : ""}`}
                      onClick={() => setActiveDay(i)}
                    >
                      <span className="day-name">{weekday}</span>
                      <span>
                        {num} {month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {currentDay && (
                <div className="slot-grid">
                  {currentDay.slots.map((s) => {
                    const occupied = isTaken(s.date, s.start);
                    const isSelected =
                      selected &&
                      selected.date === s.date &&
                      selected.start === s.start;
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
              )}
            </div>

            <div className="panel summary-panel">
              <div className="panel-heading">Riepilogo</div>

              <div className="selection-summary">
                {selectedLabel ? (
                  <>
                    <strong>Slot selezionato</strong>
                    {selectedLabel}
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
                disabled={!selected || !name || !email || submitting}
              >
                {submitting ? "Invio in corso..." : "Proponi questo orario"}
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