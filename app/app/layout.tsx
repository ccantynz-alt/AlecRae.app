'use client';

import { BrandingProvider } from '@/lib/BrandingContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      {children}
    </BrandingProvider>
  );
}
