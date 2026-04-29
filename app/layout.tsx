import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapPoints — Fidelización para negocios locales",
  description: "Plataforma de fidelización con puntos para negocios locales españoles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
