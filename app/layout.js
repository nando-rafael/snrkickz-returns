import "./globals.css";

export const metadata = {
  title: "Retourneren | Snrkickz",
  description: "Start je retour of ruil bij Snrkickz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-10">{children}</div>
      </body>
    </html>
  );
}
