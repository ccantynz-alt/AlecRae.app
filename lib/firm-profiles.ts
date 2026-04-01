import { DocMode } from './templates';

export interface FirmProfile {
  id: string;
  name: string;
  defaultInstructions: string;
  vocabulary: string[];
  dateFormat: string;
  spellingPreference: 'US' | 'UK' | 'AU';
  defaultMode: DocMode;
  branding: {
    primaryColor?: string;
    logoUrl?: string;
    firmTagline?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type FirmProfileInput = Omit<FirmProfile, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Generate a unique ID for a new firm profile.
 */
export function generateFirmId(): string {
  return `firm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate a firm profile input, returning an array of error messages.
 * Empty array means valid.
 */
export function validateFirmProfile(input: Partial<FirmProfileInput>): string[] {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Firm name is required');
  }

  if (input.name && input.name.length > 200) {
    errors.push('Firm name must be 200 characters or fewer');
  }

  if (input.dateFormat && !isValidDateFormat(input.dateFormat)) {
    errors.push('Invalid date format. Use formats like MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD');
  }

  if (input.spellingPreference && !['US', 'UK', 'AU'].includes(input.spellingPreference)) {
    errors.push('Spelling preference must be US, UK, or AU');
  }

  if (input.vocabulary && !Array.isArray(input.vocabulary)) {
    errors.push('Vocabulary must be an array of strings');
  }

  if (input.branding?.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(input.branding.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #1a2b3c)');
  }

  return errors;
}

function isValidDateFormat(format: string): boolean {
  const validFormats = [
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'DD MMMM YYYY',
    'MMMM DD, YYYY',
    'DD.MM.YYYY',
    'D MMMM YYYY',
  ];
  return validFormats.includes(format);
}

/**
 * Create a new FirmProfile object from input data.
 */
export function createFirmProfile(input: FirmProfileInput): FirmProfile {
  const now = new Date().toISOString();
  return {
    id: generateFirmId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build custom AI instructions string from a firm profile.
 * This can be appended to the system prompt when enhancing dictation.
 */
export function buildFirmInstructions(firm: FirmProfile): string {
  const parts: string[] = [];

  if (firm.name) {
    parts.push(`Firm name: ${firm.name}`);
  }

  if (firm.spellingPreference) {
    const spellingMap = {
      US: 'American English',
      UK: 'British English',
      AU: 'Australian English',
    };
    parts.push(`Use ${spellingMap[firm.spellingPreference]} spelling conventions.`);
  }

  if (firm.dateFormat) {
    parts.push(`Format dates as: ${firm.dateFormat}`);
  }

  if (firm.vocabulary && firm.vocabulary.length > 0) {
    parts.push(`Firm-specific vocabulary (use these exact spellings): ${firm.vocabulary.join(', ')}`);
  }

  if (firm.defaultInstructions) {
    parts.push(`Additional instructions: ${firm.defaultInstructions}`);
  }

  if (firm.branding?.firmTagline) {
    parts.push(`Firm tagline (include when appropriate): ${firm.branding.firmTagline}`);
  }

  return parts.join('\n');
}
