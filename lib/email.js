import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `Major Bit - Migrazione <${process.env.GMAIL_USER}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // la tua email (Gabriele)
const MANAGER_EMAIL = process.env.MANAGER_EMAIL; // email di Denny
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL; // es. https://tuo-progetto.vercel.app

function formatSlot(date, start) {
  const d = new Date(`${date}T${start}`);
  const dateLabel = d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${dateLabel} alle ${start}`;
}

function notesBlock(notes) {
  if (!notes) return "";
  return `<p><strong>Note:</strong> ${notes}</p>`;
}

async function send(payload, label) {
  try {
    const info = await transporter.sendMail(payload);
    console.log(`Gmail OK (${label}), id:`, info.messageId);
  } catch (error) {
    console.error(`GMAIL ERROR (${label}):`, error);
  }
}

// Email inviata a te (admin) quando un collega propone uno o più slot
export async function sendProposalEmail(bookings) {
  const first = bookings[0];
  const multi = bookings.length > 1;

  const optionsHtml = bookings
    .map((b) => {
      const slotLabel = formatSlot(b.slot_date, b.slot_start);
      const respondUrl = `${BASE_URL}/respond?token=${b.token}`;
      return `<li><strong>${slotLabel}</strong> — <a href="${respondUrl}">gestisci questa opzione</a></li>`;
    })
    .join("");

  const subject = multi
    ? `Nuova proposta (${bookings.length} opzioni): ${first.colleague_name}`
    : `Nuova proposta: ${first.colleague_name} - ${formatSlot(first.slot_date, first.slot_start)}`;

  await send(
    {
      from: FROM,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <p>${first.colleague_name} (${first.colleague_email}) ha proposto ${
        multi ? "i seguenti orari" : "il seguente orario"
      } per la migrazione:</p>
        <ul>${optionsHtml}</ul>
        ${notesBlock(first.notes)}
        ${
          multi
            ? "<p>Aprendo una qualsiasi delle opzioni potrai vedere anche le altre nella stessa pagina e scegliere quella che preferisci.</p>"
            : ""
        }
      `,
    },
    "sendProposalEmail"
  );
}

// Email inviata alla parte che deve rispondere a una CONTROPROPOSTA
export async function sendCounterProposalEmail(booking, recipientEmail) {
  const slotLabel = formatSlot(booking.slot_date, booking.slot_start);
  const respondUrl = `${BASE_URL}/respond?token=${booking.token}`;
  const proposerLabel = booking.proposed_by === "admin" ? "Gabriele" : booking.colleague_name;

  await send(
    {
      from: FROM,
      to: recipientEmail,
      subject: `Nuova proposta di orario: ${slotLabel}`,
      html: `
        <p>${proposerLabel} ha proposto un nuovo orario per la migrazione del profilo di <strong>${booking.colleague_name}</strong>:</p>
        <p><strong>${slotLabel}</strong></p>
        ${notesBlock(booking.notes)}
        <p><a href="${respondUrl}">Apri la pagina per accettare, rifiutare o proporre un altro orario</a></p>
      `,
    },
    "sendCounterProposalEmail"
  );
}

// Email di conferma inviata a te, al collega e a Denny quando lo slot è confermato
export async function sendConfirmationEmail(booking) {
  const slotLabel = formatSlot(booking.slot_date, booking.slot_start);

  await send(
    {
      from: FROM,
      to: [ADMIN_EMAIL, booking.colleague_email, MANAGER_EMAIL].filter(Boolean),
      subject: `Confermato: migrazione profilo - ${slotLabel}`,
      html: `
        <p>La migrazione del profilo di <strong>${booking.colleague_name}</strong> è confermata per:</p>
        <p><strong>${slotLabel}</strong></p>
        ${notesBlock(booking.notes)}
        <p>Sede di Roma. In caso di imprevisti, avvisare quanto prima.</p>
      `,
    },
    "sendConfirmationEmail"
  );
}

// Email inviata a chi aveva fatto l'ultima proposta, quando questa viene rifiutata
export async function sendRejectionEmail(booking, recipientEmail) {
  const slotLabel = formatSlot(booking.slot_date, booking.slot_start);

  await send(
    {
      from: FROM,
      to: recipientEmail,
      subject: `Slot non disponibile: ${slotLabel}`,
      html: `
        <p>Lo slot proposto (${slotLabel}) purtroppo non va bene. Torna sul calendario per proporne un altro.</p>
        <p><a href="${BASE_URL}">Apri il calendario</a></p>
      `,
    },
    "sendRejectionEmail"
  );
}