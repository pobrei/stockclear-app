import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockClear | Omnichannel Dead-Stock Intelligence SaaS',
  description:
    'Identify stagnant inventory (>60-90 days), calculate sell-through velocity, recover trapped capital, and execute clearance markdown campaigns.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased flex selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
