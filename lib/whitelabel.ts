import { query } from './db';

export interface WhiteLabelConfig {
  firmId: string;
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  favicon?: string;
  customDomain?: string;
  hideAlecRaeBranding: boolean;
}

const DEFAULT_CONFIG: Omit<WhiteLabelConfig, 'firmId'> = {
  appName: 'AlecRae Voice',
  primaryColor: '#0a0a0a',
  accentColor: '#d4a853',
  hideAlecRaeBranding: false,
};

/**
 * Retrieve the white-label config for a firm, or null if none exists.
 */
export async function getWhiteLabelConfig(firmId: string): Promise<WhiteLabelConfig | null> {
  const rows = await query(
    `SELECT branding FROM firms WHERE id = $1`,
    [firmId]
  );

  if (rows.length === 0) return null;

  const branding = rows[0].branding as Record<string, unknown> | null;
  if (!branding || Object.keys(branding).length === 0) {
    return { firmId, ...DEFAULT_CONFIG };
  }

  return {
    firmId,
    appName: (branding.appName as string) || DEFAULT_CONFIG.appName,
    logoUrl: branding.logoUrl as string | undefined,
    primaryColor: (branding.primaryColor as string) || DEFAULT_CONFIG.primaryColor,
    accentColor: (branding.accentColor as string) || DEFAULT_CONFIG.accentColor,
    favicon: branding.favicon as string | undefined,
    customDomain: branding.customDomain as string | undefined,
    hideAlecRaeBranding: (branding.hideAlecRaeBranding as boolean) ?? false,
  };
}

/**
 * Update (or create) the white-label config for a firm.
 */
export async function updateWhiteLabelConfig(
  firmId: string,
  config: Partial<Omit<WhiteLabelConfig, 'firmId'>>
): Promise<WhiteLabelConfig> {
  // Ensure firm exists
  const existing = await query(`SELECT branding FROM firms WHERE id = $1`, [firmId]);

  if (existing.length === 0) {
    throw new Error('Firm not found');
  }

  const currentBranding = (existing[0].branding as Record<string, unknown>) || {};
  const merged = { ...currentBranding, ...config };

  await query(`UPDATE firms SET branding = $1 WHERE id = $2`, [
    JSON.stringify(merged),
    firmId,
  ]);

  return {
    firmId,
    appName: (merged.appName as string) || DEFAULT_CONFIG.appName,
    logoUrl: merged.logoUrl as string | undefined,
    primaryColor: (merged.primaryColor as string) || DEFAULT_CONFIG.primaryColor,
    accentColor: (merged.accentColor as string) || DEFAULT_CONFIG.accentColor,
    favicon: merged.favicon as string | undefined,
    customDomain: merged.customDomain as string | undefined,
    hideAlecRaeBranding: (merged.hideAlecRaeBranding as boolean) ?? false,
  };
}
