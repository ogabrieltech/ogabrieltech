import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puxaí | Automação de atendimento no WhatsApp",
  description: "Automatize a triagem, colete dados e direcione cada cliente para o vendedor ou setor certo pelo WhatsApp.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
