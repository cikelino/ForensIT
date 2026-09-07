import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendConfirmationEmail, sendRejectionEmail } from "../../../lib/email";

// Restituisce i dettagli di una proposta dato il token, per mostrarli nella pagina /respond
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("colleague_name, slot_date, slot_start, status, proposed_by, notes")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
  }

  return NextResponse.json({ booking: data });
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

  const newStatus = action === "accept" ? "confirmed" : "rejected";

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("token", token)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (newStatus === "confirmed") {
    await sendConfirmationEmail(updated);
  } else {
    // Il rifiuto va comunicato a chi aveva fatto QUESTA proposta:
    // se l'ultima proposta era dell'admin, avvisiamo il collega, e viceversa.
    const recipient =
      updated.proposed_by === "admin"
        ? updated.colleague_email
        : process.env.ADMIN_EMAIL;
    await sendRejectionEmail(updated, recipient);
  }

  return NextResponse.json({ booking: updated });
}
