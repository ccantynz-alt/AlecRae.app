'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface BrandingConfig {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  favicon?: string;
  hideAlecRaeBranding: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'AlecRae Voice',
  primaryColor: '#0a0a0a',
  accentColor: '#d4a853',
  hideAlecRaeBranding: false,
};

interface BrandingContextValue {
  branding: BrandingConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: async () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

/**
 * Convert a hex color to HSL components for Tailwind-compatible CSS custom properties.
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Apply branding colors as CSS custom properties on :root so they can be used
 * throughout the app without re-rendering components.
 */
function applyBrandingCSS(config: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-accent', config.accentColor);
  root.style.setProperty('--brand-primary', config.primaryColor);

  // Generate lighter/darker variants for hover states
  const hsl = hexToHSL(config.accentColor);
  if (hsl) {
    root.style.setProperty('--brand-accent-h', `${hsl.h}`);
    root.style.setProperty('--brand-accent-s', `${hsl.s}%`);
    root.style.setProperty('--brand-accent-l', `${hsl.l}%`);
    // Lighter variant for hover
    root.style.setProperty('--brand-accent-light', `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(100, hsl.l + 8)}%)`);
    // Semi-transparent variant for backgrounds
    root.style.setProperty('--brand-accent-20', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.2)`);
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/whitelabel');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const config: BrandingConfig = {
            appName: data.config.appName || DEFAULT_BRANDING.appName,
            logoUrl: data.config.logoUrl,
            primaryColor: data.config.primaryColor || DEFAULT_BRANDING.primaryColor,
            accentColor: data.config.accentColor || DEFAULT_BRANDING.accentColor,
            favicon: data.config.favicon,
            hideAlecRaeBranding: data.config.hideAlecRaeBranding ?? false,
          };
          setBranding(config);
          applyBrandingCSS(config);
          return;
        }
      }
    } catch {
      // Silently fall back to defaults — the API may not have a firm configured,
      // or the database may not be connected yet.
    }
    // Apply default branding CSS
    applyBrandingCSS(DEFAULT_BRANDING);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBranding().finally(() => setLoading(false));
  }, [fetchBranding]);

  const refresh = useCallback(async () => {
    await fetchBranding();
  }, [fetchBranding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}
