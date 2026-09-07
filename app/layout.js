import "./globals.css";

export const metadata = {
  title: "Prenotazione migrazione profilo",
  description: "Prenota uno slot per la migrazione del profilo utente",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
