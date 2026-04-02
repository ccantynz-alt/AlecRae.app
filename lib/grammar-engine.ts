export interface GrammarConfig {
  language: string;
  profession: 'legal' | 'accounting' | 'general';
  strictness: 'standard' | 'formal' | 'court';
  spellingPreference: 'US' | 'UK' | 'AU' | 'NZ' | 'auto';
  dateFormat: string;
  numberFormat: 'US' | 'EU';
  citationStyle: 'bluebook' | 'oscola' | 'aglc' | 'mcgill' | 'none';
  currencyFormat: string;
  honorifics: boolean;
  oxfordComma: boolean;
}

export const DEFAULT_GRAMMAR_CONFIG: GrammarConfig = {
  language: 'en-US',
  profession: 'legal',
  strictness: 'formal',
  spellingPreference: 'US',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: 'US',
  citationStyle: 'bluebook',
  currencyFormat: 'USD',
  honorifics: true,
  oxfordComma: true,
};

export function buildGrammarPrompt(config: GrammarConfig): string {
  const sections: string[] = [];

  // Spelling rules
  const spellingRules: Record<string, string> = {
    US: 'Use American English spelling: analyze, organize, honor, defense, judgment (without e), center, color, favor, program.',
    UK: 'Use British English spelling: analyse, organise, honour, defence, judgement (with e in non-legal), centre, colour, favour, programme.',
    AU: 'Use Australian English spelling (follows British conventions): analyse, organise, honour, defence, centre, colour. Use "judgment" (no e) in legal contexts per Australian court convention.',
    NZ: 'Use New Zealand English spelling (follows British conventions): analyse, organise, honour, defence, centre, colour. Similar to AU conventions.',
  };
  if (config.spellingPreference !== 'auto' && spellingRules[config.spellingPreference]) {
    sections.push(`SPELLING: ${spellingRules[config.spellingPreference]}`);
  }

  // Citation style
  const citationRules: Record<string, string> = {
    bluebook: 'CITATIONS: Follow The Bluebook (US). Italicize case names. Use volume-reporter-page format (e.g., 347 U.S. 483). Abbreviate court names per Bluebook tables. Use "Id." for immediately preceding citation. Use supra/infra for cross-references.',
    oscola: 'CITATIONS: Follow OSCOLA (UK). Use footnotes, not in-text citations. Case names in italics. Neutral citations where available (e.g., [2023] UKSC 1). No full stops in abbreviations. Use (n X) for cross-references to footnotes.',
    aglc: 'CITATIONS: Follow AGLC (Australian). Use footnotes. Case names in italics. Medium neutral citations (e.g., [2023] HCA 1). Pinpoint references with specific paragraph numbers. Use above/below n X for cross-references.',
    mcgill: 'CITATIONS: Follow McGill Guide (Canadian). Bilingual citation where applicable. Case names in italics. Use neutral citations (e.g., 2023 SCC 1). Include parallel citations for official reporters.',
    none: '',
  };
  if (citationRules[config.citationStyle]) {
    sections.push(citationRules[config.citationStyle]);
  }

  // Date and number formatting
  sections.push(`DATE FORMAT: Always format dates as ${config.dateFormat}. Be consistent throughout the document.`);
  if (config.numberFormat === 'US') {
    sections.push('NUMBER FORMAT: Use US conventions — comma as thousands separator, period as decimal (e.g., 1,000,000.50). Use $ before amounts.');
  } else {
    sections.push('NUMBER FORMAT: Use European conventions — period or space as thousands separator, comma as decimal (e.g., 1.000.000,50 or 1 000 000,50).');
  }

  // Formality level
  const formalityRules: Record<string, string> = {
    standard: 'TONE: Professional but accessible. Clear, direct sentences. Avoid unnecessary jargon when a plain-language equivalent exists.',
    formal: 'TONE: Formal professional register. Use precise legal/accounting terminology. Avoid contractions. Full sentences with proper subordinate clauses. Address parties by full title.',
    court: 'TONE: Highest formality — court filing register. Use "COMES NOW," "WHEREFORE," "respectfully submits." Number all paragraphs. No contractions. Refer to parties by their litigation role (Plaintiff, Defendant). Use "the Court" with capital C.',
  };
  sections.push(formalityRules[config.strictness]);

  // Profession-specific rules
  if (config.profession === 'legal') {
    sections.push('LEGAL GRAMMAR: Use active voice where possible (except in court filings where passive is conventional). "Which" for non-restrictive clauses, "that" for restrictive. Avoid "said" and "aforementioned" — use "the" or "this." Use "shall" for obligations, "may" for permissions, "must" for requirements.');
  } else if (config.profession === 'accounting') {
    sections.push('ACCOUNTING GRAMMAR: Use precise quantitative language. "Approximately" when estimates. "As of [date]" for point-in-time references. Spell out numbers below 10, use digits for 10+. Use "fiscal year" not "financial year" (US) or vice versa (UK). Format currency amounts consistently with two decimal places.');
  }

  // Oxford comma
  if (config.oxfordComma) {
    sections.push('PUNCTUATION: Use the Oxford comma (serial comma) in lists (e.g., "A, B, and C").');
  } else {
    sections.push('PUNCTUATION: Do NOT use the Oxford comma in lists (e.g., "A, B and C").');
  }

  // Honorifics
  if (config.honorifics) {
    sections.push('HONORIFICS: Use appropriate titles (Mr., Ms., Dr., Hon., J., etc.). In legal contexts, refer to judges as "the Honorable [Name]" or "Justice [Name]." Use Esq. for attorneys where conventional.');
  }

  return '\n\nGRAMMAR & FORMATTING RULES:\n' + sections.filter(Boolean).join('\n');
}
