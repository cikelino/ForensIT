import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendCounterProposalEmail } from "../../../lib/email";

// Chi risponde a una proposta può, invece di accettare/rifiutare, proporre
// un altro orario: questo chiude la proposta attuale e ne apre una nuova,
// passando la palla all'altra parte.
export async function POST(request) {
  const { token, slot_date, slot_start, notes } = await request.json();

  if (!token || !slot_date || !slot_start) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const { data: original, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
  }

  if (original.status !== "proposed") {
    return NextResponse.json(
      { error: "Questa proposta è già stata gestita" },
      { status: 409 }
    );
  }

  // Chi sta rispondendo ora diventa il nuovo proponente
  const newProposedBy = original.proposed_by === "admin" ? "colleague" : "admin";

  // Libera lo slot precedente
  await supabaseAdmin
    .from("bookings")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("token", token);

  // Crea la nuova proposta
  const { data: created, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert({
      colleague_name: original.colleague_name,
      colleague_email: original.colleague_email,
      slot_date,
      slot_start,
      notes: notes || null,
      proposed_by: newProposedBy,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Questo slot è appena stato occupato da qualcun altro" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // La nuova proposta va a chi NON l'ha appena fatta
  const recipient =
    newProposedBy === "admin" ? created.colleague_email : process.env.ADMIN_EMAIL;
  await sendCounterProposalEmail(created, recipient);

  return NextResponse.json({ booking: created });
}
