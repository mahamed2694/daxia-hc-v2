import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daxia People Analytics",
  description: "Controle de Absenteísmo e Horas Extras",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
