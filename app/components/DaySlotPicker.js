"use client";

import { useState } from "react";

// Selettore giorno/orario con navigazione a frecce. isSelected e onSelect
// sono forniti dal componente che lo usa, così può essere sia a scelta
// singola (form "Riproponi") sia a scelta multipla fino a 3 (form principale).
export default function DaySlotPicker({ grouped, isTaken, isSelected, onSelect }) {
  const [activeDay, setActiveDay] = useState(0);
  const currentDay = grouped[activeDay];

  return (
    <div>
      <div className="day-nav">
        <button
          type="button"
          className="day-nav-arrow"
          onClick={() => setActiveDay((d) => Math.max(0, d - 1))}
          disabled={activeDay === 0}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <span className="day-nav-label">{currentDay?.label}</span>
        <button
          type="button"
          className="day-nav-arrow"
          onClick={() => setActiveDay((d) => Math.min(grouped.length - 1, d + 1))}
          disabled={activeDay === grouped.length - 1}
          aria-label="Giorno successivo"
        >
          ›
        </button>
      </div>

      {currentDay && (
        <div className="slot-grid">
          {currentDay.slots.map((s) => {
            const occupied = isTaken(s.date, s.start);
            const selected = isSelected(s.date, s.start);
            return (
              <button
                type="button"
                key={`${s.date}-${s.start}`}
                disabled={occupied}
                className={`slot-btn${selected ? " selected" : ""}`}
                onClick={() => onSelect({ date: s.date, start: s.start })}
              >
                {s.start}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}