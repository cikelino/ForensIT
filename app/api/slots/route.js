import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendProposalEmail } from "../../../lib/email";

const MAX_SLOTS = 3;

// Restituisce tutti gli slot attualmente occupati (proposti o confermati)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("slot_date, slot_start, status")
    .in("status", ["proposed", "confirmed"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bookings: data });
}

// Crea fino a 3 proposte di slot da parte di un collega, collegate tra loro
// da un group_id in modo che l'admin possa scegliere quale confermare.
export async function POST(request) {
  const body = await request.json();
  const { colleague_name, colleague_email, notes, slots } = body;

  if (
    !colleague_name ||
    !colleague_email ||
    !Array.isArray(slots) ||
    slots.length === 0 ||
    slots.length > MAX_SLOTS
  ) {
    return NextResponse.json({ error: "Dati mancanti o non validi" }, { status: 400 });
  }

  const group_id = slots.length > 1 ? crypto.randomUUID() : null;
  const inserted = [];
  let failedCount = 0;

  for (const s of slots) {
    if (!s.date || !s.start) continue;

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        colleague_name,
        colleague_email,
        slot_date: s.date,
        slot_start: s.start,
        notes: notes || null,
        proposed_by: "colleague",
        group_id,
      })
      .select()
      .single();

    if (error) {
      // Violazione dell'indice unico = slot già occupato nel frattempo:
      // lo saltiamo e proseguiamo con gli altri.
      if (error.code === "23505") {
        failedCount += 1;
        continue;
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    inserted.push(data);
  }

  if (inserted.length === 0) {
    return NextResponse.json(
      { error: "Gli slot selezionati sono appena stati occupati da qualcun altro" },
      { status: 409 }
    );
  }

  await sendProposalEmail(inserted);

  return NextResponse.json({ bookings: inserted, failedCount });
}