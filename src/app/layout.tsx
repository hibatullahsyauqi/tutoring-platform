import type { Metadata } from 'next';
import { Besley, Nunito } from 'next/font/google';
import './globals.css';

// 1. Fetch Besley for Headers
const besley = Besley({
  variable: '--font-besley',
  subsets: ['latin'],
  display: 'swap',
});

// 2. Fetch Nunito for Body & Content
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pedagogical Dashboard — Tutor\'s Command Center',
  description: 'A multi-curriculum pedagogical operating system for STEM tutors.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${besley.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}