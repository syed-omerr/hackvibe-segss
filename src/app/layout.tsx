import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HackVibe 2.0 — Team Registration & Segregation Portal',
  description:
    'Web portal for HackVibe 2.0 team registration, live tracking, and on-demand 12-sheet Excel generation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-violet-500/30 selection:text-violet-200`}
      >
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>HackVibe 2.0 Portal • Automated 12-Sheet Segregation</span>
            <span className="text-slate-600">Prefix: HV2-2026-OCT • Vignan Institute of Technology &amp; Science</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
