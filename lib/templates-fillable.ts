import { DocMode } from './templates';

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  mode: DocMode;
  category: 'legal' | 'accounting' | 'general';
  description: string;
  fields: TemplateField[];
  template: string;
}

export const BUILT_IN_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'legal-letter-template',
    name: 'Legal Letter',
    mode: 'legal-letter',
    category: 'legal',
    description: 'Formal legal correspondence with proper letterhead structure and professional formatting.',
    fields: [
      { id: 'sender_firm', label: 'Sender Firm', type: 'text', placeholder: 'Smith & Associates LLP', required: true },
      { id: 'sender_address', label: 'Sender Address', type: 'textarea', placeholder: '123 Main Street\nSuite 400\nNew York, NY 10001', required: true },
      { id: 'recipient_name', label: 'Recipient Name', type: 'text', placeholder: 'Jane Doe', required: true },
      { id: 'recipient_address', label: 'Recipient Address', type: 'textarea', placeholder: '456 Oak Avenue\nLos Angeles, CA 90001', required: true },
      { id: 're_line', label: 'RE Line', type: 'text', placeholder: 'Matter of Estate of John Smith', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
    ],
    template: `{{sender_firm}}
{{sender_address}}

{{date}}

{{recipient_name}}
{{recipient_address}}

RE: {{re_line}}

Dear {{recipient_name}}:

[DICTATED CONTENT]

Sincerely,

{{sender_firm}}`,
  },
  {
    id: 'court-filing-caption',
    name: 'Court Filing Caption',
    mode: 'court-filing',
    category: 'legal',
    description: 'Court document with proper caption, case number, and party designations.',
    fields: [
      { id: 'court_name', label: 'Court Name', type: 'text', placeholder: 'United States District Court for the Southern District of New York', required: true },
      { id: 'case_number', label: 'Case Number', type: 'text', placeholder: 'Case No. 24-cv-01234', required: true },
      { id: 'plaintiff', label: 'Plaintiff', type: 'text', placeholder: 'JOHN SMITH', required: true },
      { id: 'defendant', label: 'Defendant', type: 'text', placeholder: 'ACME CORPORATION', required: true },
      { id: 'document_title', label: 'Document Title', type: 'text', placeholder: 'MOTION FOR SUMMARY JUDGMENT', required: true },
    ],
    template: `IN THE {{court_name}}

{{plaintiff}},
    Plaintiff,

v.                                              {{case_number}}

{{defendant}},
    Defendant.

______________________________________________

{{document_title}}
______________________________________________

[DICTATED CONTENT]

WHEREFORE, for the foregoing reasons, the undersigned respectfully requests that this Court grant the relief requested herein.

Respectfully submitted,

______________________________
Attorney for Plaintiff
Date: _______________`,
  },
  {
    id: 'engagement-letter-template',
    name: 'Engagement Letter',
    mode: 'engagement-letter',
    category: 'legal',
    description: 'Client engagement terms including scope, fees, and retainer information.',
    fields: [
      { id: 'firm_name', label: 'Firm Name', type: 'text', placeholder: 'Smith & Associates LLP', required: true },
      { id: 'client_name', label: 'Client Name', type: 'text', placeholder: 'Jane Doe', required: true },
      { id: 'matter_description', label: 'Matter Description', type: 'textarea', placeholder: 'Representation in connection with...', required: true },
      {
        id: 'fee_type',
        label: 'Fee Type',
        type: 'select',
        options: ['Hourly', 'Flat Fee', 'Contingency'],
        required: true,
      },
      { id: 'rate_amount', label: 'Rate / Amount', type: 'text', placeholder: '$450/hour or $5,000 flat', required: true },
      { id: 'retainer_amount', label: 'Retainer Amount', type: 'text', placeholder: '$10,000', required: false },
    ],
    template: `{{firm_name}}

Date: [DATE]

{{client_name}}

RE: Engagement Letter

Dear {{client_name}}:

Thank you for selecting {{firm_name}} to represent you. This letter confirms the terms of our engagement.

SCOPE OF ENGAGEMENT
{{matter_description}}

FEE ARRANGEMENT
Fee Type: {{fee_type}}
Rate: {{rate_amount}}
Retainer: {{retainer_amount}}

[DICTATED CONTENT]

TERMS AND CONDITIONS
1. Our representation is limited to the matter described above.
2. You agree to cooperate fully and provide all necessary information.
3. Either party may terminate this engagement upon written notice.

Please sign below to acknowledge your agreement to these terms.

Sincerely,

{{firm_name}}

ACKNOWLEDGED AND AGREED:

______________________________
{{client_name}}
Date: _______________`,
  },
  {
    id: 'demand-letter-template',
    name: 'Demand Letter',
    mode: 'demand-letter',
    category: 'legal',
    description: 'Pre-litigation demand with specific amounts, deadlines, and consequences.',
    fields: [
      { id: 'firm_name', label: 'Firm Name', type: 'text', placeholder: 'Smith & Associates LLP', required: true },
      { id: 'client_name', label: 'Client Name', type: 'text', placeholder: 'John Smith', required: true },
      { id: 'opposing_party', label: 'Opposing Party', type: 'text', placeholder: 'Acme Corporation', required: true },
      { id: 'demand_amount', label: 'Demand Amount', type: 'text', placeholder: '$50,000.00', required: true },
      { id: 'deadline_date', label: 'Deadline Date', type: 'date', required: true },
      {
        id: 'method_of_service',
        label: 'Method of Service',
        type: 'select',
        options: ['Certified Mail, Return Receipt Requested', 'Hand Delivery', 'Email', 'FedEx Overnight'],
        required: true,
      },
    ],
    template: `{{firm_name}}

[DATE]

VIA {{method_of_service}}

{{opposing_party}}

RE: Demand on Behalf of {{client_name}}

Dear {{opposing_party}}:

Please be advised that this firm represents {{client_name}} in connection with the above-referenced matter.

[DICTATED CONTENT]

DEMAND
Based on the foregoing, we hereby demand payment in the amount of {{demand_amount}} on or before {{deadline_date}}.

Failure to satisfy this demand within the stated timeframe will leave our client with no alternative but to pursue all available legal remedies, including but not limited to the filing of a civil action, without further notice to you.

Please direct all communications regarding this matter to the undersigned.

Very truly yours,

{{firm_name}}

cc: {{client_name}}`,
  },
  {
    id: 'tax-advisory-template',
    name: 'Tax Advisory',
    mode: 'tax-advisory',
    category: 'accounting',
    description: 'Tax position analysis with IRC references, jurisdiction details, and Circular 230 disclaimer.',
    fields: [
      { id: 'firm_name', label: 'Firm Name', type: 'text', placeholder: 'Smith & Associates CPAs', required: true },
      { id: 'client_name', label: 'Client Name', type: 'text', placeholder: 'Jane Doe', required: true },
      { id: 'tax_year', label: 'Tax Year', type: 'text', placeholder: '2025', required: true },
      { id: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'Federal / State of New York', required: true },
      {
        id: 'circular_230_disclaimer',
        label: 'Include Circular 230 Disclaimer',
        type: 'select',
        options: ['Yes', 'No'],
        required: true,
      },
    ],
    template: `{{firm_name}}

PRIVILEGED AND CONFIDENTIAL
TAX ADVISORY MEMORANDUM

TO: {{client_name}}
FROM: {{firm_name}}
DATE: [DATE]
RE: Tax Advisory — Tax Year {{tax_year}}
JURISDICTION: {{jurisdiction}}

I. ISSUE

[DICTATED CONTENT]

II. SHORT ANSWER

III. ANALYSIS

IV. CONCLUSION

V. RECOMMENDATIONS

{{circular_230_disclaimer === 'Yes' ? 'CIRCULAR 230 DISCLOSURE: Pursuant to Treasury Department Circular 230, unless expressly stated otherwise, any tax advice contained in this communication (including any attachments) is not intended or written to be used, and cannot be used, for the purpose of (i) avoiding penalties that may be imposed under the Internal Revenue Code or (ii) promoting, marketing, or recommending to another party any transaction or matter addressed herein.' : ''}}

{{firm_name}}`,
  },
  {
    id: 'audit-opinion-template',
    name: 'Audit Opinion',
    mode: 'audit-opinion',
    category: 'accounting',
    description: 'Audit opinion letter with AICPA standards format, scope, and opinion paragraphs.',
    fields: [
      { id: 'firm_name', label: 'Firm Name', type: 'text', placeholder: 'Smith & Associates CPAs', required: true },
      { id: 'client_company', label: 'Client Company', type: 'text', placeholder: 'Acme Corporation', required: true },
      { id: 'fiscal_year_end', label: 'Fiscal Year End', type: 'date', required: true },
      {
        id: 'opinion_type',
        label: 'Opinion Type',
        type: 'select',
        options: ['Unqualified (Clean)', 'Qualified', 'Adverse', 'Disclaimer of Opinion'],
        required: true,
      },
    ],
    template: `INDEPENDENT AUDITOR'S REPORT

To the Board of Directors and Shareholders of {{client_company}}:

Opinion

We have audited the financial statements of {{client_company}}, which comprise the balance sheet as of {{fiscal_year_end}}, and the related statements of income, comprehensive income, stockholders' equity, and cash flows for the year then ended, and the related notes to the financial statements.

Opinion Type: {{opinion_type}}

[DICTATED CONTENT]

Basis for Opinion

We conducted our audit in accordance with auditing standards generally accepted in the United States of America (GAAS). Our responsibilities under those standards are further described in the Auditor's Responsibilities for the Audit of the Financial Statements section of our report. We are required to be independent of {{client_company}} and to meet our other ethical responsibilities, in accordance with the relevant ethical requirements relating to our audit. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our audit opinion.

Responsibilities of Management for the Financial Statements

Management is responsible for the preparation and fair presentation of the financial statements in accordance with accounting principles generally accepted in the United States of America, and for the design, implementation, and maintenance of internal control relevant to the preparation and fair presentation of financial statements that are free from material misstatement, whether due to fraud or error.

Auditor's Responsibilities for the Audit of the Financial Statements

Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion.

{{firm_name}}
[DATE]`,
  },
];

/**
 * Fill a document template with the provided field values.
 * Replaces all {{field_id}} placeholders with corresponding values.
 * Handles conditional expressions like {{field === 'value' ? 'text' : 'alt'}}.
 */
export function fillTemplate(
  template: DocumentTemplate,
  values: Record<string, string>
): string {
  let result = template.template;

  // Handle conditional expressions: {{field === 'value' ? 'text_if_true' : 'text_if_false'}}
  const conditionalPattern = /\{\{(\w+)\s*===\s*'([^']+)'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}\}/g;
  result = result.replace(conditionalPattern, (_match, fieldId, compareVal, trueText, falseText) => {
    const fieldValue = values[fieldId] || '';
    return fieldValue === compareVal ? trueText : falseText;
  });

  // Replace simple {{field_id}} placeholders
  const placeholderPattern = /\{\{(\w+)\}\}/g;
  result = result.replace(placeholderPattern, (_match, fieldId) => {
    return values[fieldId] || `[${fieldId.toUpperCase()}]`;
  });

  return result;
}

/**
 * Get all templates for a specific document mode.
 */
export function getTemplatesForMode(mode: DocMode): DocumentTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.mode === mode);
}

/**
 * Get all templates for a specific category.
 */
export function getTemplatesByCategory(
  category: 'legal' | 'accounting' | 'general'
): DocumentTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a template by its ID.
 */
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}
