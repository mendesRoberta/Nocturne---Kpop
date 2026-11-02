import type { Metadata } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'NOCTURNE | K-Pop Editorial & Inteligência Artificial',
  description:
    'Plataforma editorial de K-Pop com curadoria inteligente via Google Gemini 3.8 Flash, Interactions API, Google Search Grounding e Assistente IA em Streaming.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} font-body bg-[#0e0e13] text-[#f9f5fd] antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
