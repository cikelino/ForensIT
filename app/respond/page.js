"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { generateUpcomingSlots } from "../../lib/slots";

export default function RespondPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const allSlots = useMemo(() => generateUpcomingSlots(14), []);

  const [booking, setBooking] = useState(null);
  const [taken, setTaken] = useState([]);
  const [view, setView] = useState("loading"); // loading | idle | counter | loading-action | done | error
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [counterNotes, setCounterNotes] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/respond?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setView("error");
          setResult(d.error);
        } else {
          setBooking(d.booking);
          setView(d.booking.status === "proposed" ? "idle" : "done");
          setResult(d.booking.status);
        }
      });
  }, [token]);

  useEffect(() => {
    if (view !== "counter") return;
    fetch("/api/slots")
      .then((r) => r.json())
      .then((d) => setTaken(d.bookings || []));
  }, [view]);

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

  async function respond(action) {
    setView("loading-action");
    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    const data = await res.json();

    if (!res.ok) {
      setView("error");
      setResult(data.error);
      return;
    }

    setView("done");
    setResult(action);
  }

  async function submitCounter(e) {
    e.preventDefault();
    if (!selected) return;

    setView("loading-action");
    const res = await fetch("/api/counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        slot_date: selected.date,
        slot_start: selected.start,
        notes: counterNotes || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setView("error");
      setResult(data.error);
      return;
    }

    setView("done");
    setResult("counter");
  }

  if (!token) {
    return (
      <main>
        <div className="card">Link non valido: manca il token della proposta.</div>
      </main>
    );
  }

  if (view === "loading") {
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Gestisci la proposta</h1>
      <p className="subtitle">
        Accetta per confermare lo slot, rifiuta per liberarlo, oppure proponi
        un altro orario: la richiesta passerà all'altra parte.
      </p>

      {booking && (
        <div className="info-box">
          <strong>{booking.colleague_name}</strong>
          {new Date(`${booking.slot_date}T${booking.slot_start}`).toLocaleDateString(
            "it-IT",
            { weekday: "long", day: "numeric", month: "long" }
          )}{" "}
          alle {booking.slot_start.slice(0, 5)}
          {booking.notes && (
            <div style={{ marginTop: 8 }}>
              <strong>Note:</strong> {booking.notes}
            </div>
          )}
        </div>
      )}

      <div className="card">
        {view === "idle" && (
          <>
            <div className="actions">
              <button className="accept" onClick={() => respond("accept")}>
                Accetta
              </button>
              <button className="reject" onClick={() => respond("reject")}>
                Rifiuta
              </button>
            </div>
            <button className="link-btn" onClick={() => setView("counter")}>
              Proponi un altro orario
            </button>
          </>
        )}

        {view === "counter" && (
          <form onSubmit={submitCounter}>
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

            <div className="field">
              <label>Note (facoltativo)</label>
              <textarea
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={!selected}>
              Invia la nuova proposta
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => setView("idle")}
            >
              Annulla
            </button>
          </form>
        )}

        {view === "loading-action" && <p>Invio in corso...</p>}

        {view === "done" && result === "accept" && (
          <div className="message success">
            Proposta accettata. Email di conferma inviata a te, al collega e a
            Denny.
          </div>
        )}

        {view === "done" && result === "reject" && (
          <div className="message success">Proposta rifiutata.</div>
        )}

        {view === "done" && result === "counter" && (
          <div className="message success">
            Nuova proposta inviata. Riceverai una risposta a breve.
          </div>
        )}

        {view === "done" && !["accept", "reject", "counter"].includes(result) && (
          <div className="message">Questa proposta è già stata gestita.</div>
        )}

        {view === "error" && <div className="message error">{result}</div>}
      </div>
    </main>
  );
}
