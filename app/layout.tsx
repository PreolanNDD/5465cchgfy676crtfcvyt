import './globals.css';
import type { Metadata } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const dmSerifDisplay = DM_Serif_Display({ 
  weight: ['400'], 
  subsets: ['latin'],
  variable: '--font-dm-serif',
});

export const metadata: Metadata = {
  title: 'PIDMe - Tune Your Life',
  description: 'A personal optimization platform inspired by PID controllers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerifDisplay.variable} bg-background text-primary-text font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}