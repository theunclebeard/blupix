import type { Metadata } from 'next';
import { Press_Start_2P } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

export const metadata: Metadata = {
  title: 'BluAgent — Blupets AI Agents & Ascension Chronicle',
  description:
    'Every Blupet has a vibe-aligned AI agent. Merge to remember the dead. Ascend to remember everyone who ever held you.',
  openGraph: {
    title: 'BluAgent',
    description: 'Every merge writes history. Every ascension unlocks a smarter agent.',
    siteName: 'BluAgent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelFont.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0a1628] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
