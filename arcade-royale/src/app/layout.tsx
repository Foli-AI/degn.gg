import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CustomWalletProvider } from '@/components/WalletProvider';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Arcade Royale - The Future of On-Chain Gaming',
  description: 'Play. Earn. Repeat. The Future of On-Chain Arcade Gaming.',
  keywords: ['crypto', 'gaming', 'arcade', 'solana', 'blockchain', 'web3'],
  authors: [{ name: 'Arcade Royale Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <CustomWalletProvider>
          <div className="min-h-screen bg-dark-900">
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </CustomWalletProvider>
      </body>
    </html>
  );
}


