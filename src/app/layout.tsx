import type { Metadata } from 'next';
import { Besley, Nunito } from 'next/font/google';
import './globals.css';
import GlassPointer from '@/components/GlassPointer';
import CornerControls from '@/components/CornerControls';
import { themeBootstrapScript } from '@/lib/theme';

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
    <html lang="en" className={`${nunito.variable} ${besley.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased">
        <div className="top-fade" aria-hidden="true" />
        <GlassPointer />
        <CornerControls />
        {children}
      </body>
    </html>
  );
}