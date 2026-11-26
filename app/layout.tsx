import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ascend — Interactive System Architecture Playground",
  description:
    "Explore how Ascend works under the hood in plain English or deep technical detail — running 100% in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#07090F] text-zinc-100 font-sans selection:bg-sky-500/30 selection:text-sky-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
