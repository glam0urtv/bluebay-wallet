import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Virtual Wallet - Admin',
  description: 'Admin Dashboard for Virtual Wallet Loyalty System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
