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
  title: 'NOCTURNE | K-Pop Editorial Feed',
  description: 'Experience the next generation of K-Pop editorial content.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} font-body bg-[#0e0e13] text-[#f9f5fd] antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
