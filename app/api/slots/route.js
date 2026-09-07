import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendProposalEmail } from "../../../lib/email";

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

// Crea una nuova proposta di slot da parte di un collega
export async function POST(request) {
  const body = await request.json();
  const { colleague_name, colleague_email, slot_date, slot_start, notes } = body;

  if (!colleague_name || !colleague_email || !slot_date || !slot_start) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      colleague_name,
      colleague_email,
      slot_date,
      slot_start,
      notes: notes || null,
      proposed_by: "colleague",
    })
    .select()
    .single();

  if (error) {
    // Violazione dell'indice unico = slot già occupato nel frattempo
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Questo slot è appena stato occupato da qualcun altro" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendProposalEmail(data);

  return NextResponse.json({ booking: data });
}
