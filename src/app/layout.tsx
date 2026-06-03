import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DBs · Bases de datos, sin misterio",
    template: "%s · DBs",
  },
  description:
    "Curso interactivo de bases de datos: escribe SQL real y mira las tablas cobrar vida.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${jetBrainsMono.variable} ${sourceSerif.variable}`}
    >
      <body className="bg-cream text-ink font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Saltar al contenido
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
