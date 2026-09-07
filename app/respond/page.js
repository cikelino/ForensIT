"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { generateUpcomingSlots } from "../../lib/slots";
import Header from "../components/Header";
import DaySlotPicker from "../components/DaySlotPicker";

export default function RespondPage() {
  return (
    <Suspense
      fallback={
        <main>
          <p>Caricamento...</p>
        </main>
      }
    >
      <RespondContent />
    </Suspense>
  );
}

function optionLabel(booking) {
  const d = new Date(`${booking.slot_date}T${booking.slot_start}`);
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) + ` alle ${booking.slot_start.slice(0, 5)}`;
}

function RespondContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const allSlots = useMemo(() => generateUpcomingSlots(14), []);

  const [booking, setBooking] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [chosenToken, setChosenToken] = useState(null);
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
          setSiblings(d.siblings || []);
          setChosenToken(d.booking.token);
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

  const isSelected = (date, start) =>
    selected && selected.date === date && selected.start === start;

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of allSlots) {
      if (!map.has(s.date)) map.set(s.date, { label: s.label, slots: [] });
      map.get(s.date).slots.push(s);
    }
    return Array.from(map.values());
  }, [allSlots]);

  // Tutte le opzioni proposte insieme (quella del link + le sorelle),
  // usate per far scegliere quale confermare quando sono più di una.
  const allOptions = useMemo(() => {
    if (!booking) return [];
    const self = { token: booking.token, slot_date: booking.slot_date, slot_start: booking.slot_start };
    return [self, ...siblings];
  }, [booking, siblings]);

  async function respond(action, targetToken) {
    setView("loading-action");
    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: targetToken || token, action }),
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
      <>
        <Header />
        <main>
          <div className="card">Link non valido: manca il token della proposta.</div>
        </main>
      </>
    );
  }

  if (view === "loading") {
    return (
      <>
        <Header />
        <main>
          <p>Caricamento...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <h1>Gestisci la proposta</h1>
        <p className="subtitle">
          Accetta l'orario scelto per confermarlo, rifiuta per liberare
          tutte le opzioni, oppure proponi un altro orario.
        </p>

        {booking && (
          <div className="info-box">
            <strong>{booking.colleague_name}</strong>
            {allOptions.length > 1 ? (
              <>
                {allOptions.length} orari proposti — scegli quale confermare
              </>
            ) : (
              optionLabel(booking)
            )}
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
              {allOptions.length > 1 && (
                <div className="option-list">
                  {allOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.token}
                      className={`option-btn${opt.token === chosenToken ? " selected" : ""}`}
                      onClick={() => setChosenToken(opt.token)}
                    >
                      {optionLabel(opt)}
                    </button>
                  ))}
                </div>
              )}

              <div className="actions">
                <button className="accept" onClick={() => respond("accept", chosenToken)}>
                  Accetta
                </button>
                <button className="reject" onClick={() => respond("reject")}>
                  Rifiuta {allOptions.length > 1 ? "tutte" : ""}
                </button>
              </div>
              <button className="link-btn" onClick={() => setView("counter")}>
                Proponi un altro orario
              </button>
            </>
          )}

          {view === "counter" && (
            <form onSubmit={submitCounter}>
              <DaySlotPicker
                grouped={grouped}
                isTaken={isTaken}
                isSelected={isSelected}
                onSelect={setSelected}
              />

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
    </>
  );
}