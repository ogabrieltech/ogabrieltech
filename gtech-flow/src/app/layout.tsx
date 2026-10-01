import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTECH Flow | Automação de atendimento no WhatsApp",
  description: "Configure fluxos de atendimento, direcione clientes e organize leads pelo WhatsApp.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
