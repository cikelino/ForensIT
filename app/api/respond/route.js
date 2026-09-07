import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendConfirmationEmail, sendRejectionEmail } from "../../../lib/email";

// Restituisce i dettagli di una proposta dato il token, più le eventuali
// opzioni "sorelle" (stesso group_id) ancora in attesa di risposta.
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("colleague_name, slot_date, slot_start, status, proposed_by, notes, token, group_id")
    .eq("token", token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
  }

  let siblings = [];
  if (booking.group_id) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select("token, slot_date, slot_start, status")
      .eq("group_id", booking.group_id)
      .eq("status", "proposed")
      .neq("token", token);
    siblings = data || [];
  }

  return NextResponse.json({ booking, siblings });
}

export async function POST(request) {
  const { token, action } = await request.json();

  if (!token || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
  }

  if (booking.status !== "proposed") {
    return NextResponse.json(
      { error: "Questa proposta è già stata gestita" },
      { status: 409 }
    );
  }

  if (action === "accept") {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed", responded_at: new Date().toISOString() })
      .eq("token", token)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Le altre opzioni proposte insieme a questa (se presenti) si liberano
    if (booking.group_id) {
      await supabaseAdmin
        .from("bookings")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("group_id", booking.group_id)
        .eq("status", "proposed");
    }

    await sendConfirmationEmail(updated);
    return NextResponse.json({ booking: updated });
  }

  // action === "reject": se la proposta faceva parte di un gruppo di
  // opzioni, le rifiutiamo tutte insieme (nessuna delle alternative andava
  // bene); altrimenti rifiutiamo solo questa.
  if (booking.group_id) {
    await supabaseAdmin
      .from("bookings")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("group_id", booking.group_id)
      .eq("status", "proposed");
  } else {
    await supabaseAdmin
      .from("bookings")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("token", token);
  }

  const recipient =
    booking.proposed_by === "admin" ? booking.colleague_email : process.env.ADMIN_EMAIL;
  await sendRejectionEmail(booking, recipient);

  return NextResponse.json({ ok: true });
}