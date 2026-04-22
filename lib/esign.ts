/**
 * E-Signature Handoff — lib/esign.ts
 *
 * Env-var gated integration for DocuSign eSignature REST v2.1 and Adobe Sign.
 * When integration keys are absent, all functions return clean stubs so the
 * feature degrades gracefully without crashing.
 *
 * Required env vars:
 *   DOCUSIGN_INTEGRATION_KEY  — DocuSign Integration Key (client_id)
 *   DOCUSIGN_SECRET_KEY       — DocuSign RSA private key (PEM, for JWT auth)
 *   DOCUSIGN_ACCOUNT_ID       — DocuSign Account GUID
 *   DOCUSIGN_USER_ID          — DocuSign Impersonated User GUID (for JWT grant)
 *   DOCUSIGN_BASE_URL         — e.g. https://na4.docusign.net (optional, defaults to demo)
 *
 *   ADOBESIGN_INTEGRATION_KEY — Adobe Sign API application ID
 *   ADOBESIGN_CLIENT_SECRET   — Adobe Sign OAuth2 client secret
 *   ADOBESIGN_ACCESS_TOKEN    — Pre-issued access token (alternative to full OAuth flow)
 *   ADOBESIGN_API_BASE        — e.g. https://api.na1.adobesign.com (optional, defaults to na1)
 */

/* -------------------------------------------------------------------------- */
/*  Exported types                                                            */
/* -------------------------------------------------------------------------- */

export type SignProvider = 'docusign' | 'adobesign';

export type SignRecipient = {
  name: string;
  email: string;
  /** Defaults to 'signer' when omitted. */
  role?: 'signer' | 'cc' | 'witness';
};

export type SignEnvelope = {
  provider: SignProvider;
  subject: string;
  message?: string;
  recipients: SignRecipient[];
  documentName: string;
  /** UTF-8 text content of the document to send. Will be base64-encoded for the API. */
  documentContent: string;
};

export type EnvelopeResult = {
  envelopeId: string;
  statusUrl: string;
};

export type EnvelopeStatus = {
  status:
    | 'created'
    | 'sent'
    | 'delivered'
    | 'completed'
    | 'declined'
    | 'voided'
    | 'unknown';
  signedAt?: string; // ISO-8601
};

/* -------------------------------------------------------------------------- */
/*  Configuration detection                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns which providers are configured via environment variables.
 * Safe to call on the server only (reads process.env).
 */
export function isEsignConfigured(provider?: SignProvider): {
  docusign: boolean;
  adobesign: boolean;
  anyConfigured: boolean;
} {
  const docusign = !!(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_ACCOUNT_ID &&
    process.env.DOCUSIGN_USER_ID
  );
  const adobesign = !!(
    process.env.ADOBESIGN_INTEGRATION_KEY &&
    (process.env.ADOBESIGN_ACCESS_TOKEN || process.env.ADOBESIGN_CLIENT_SECRET)
  );

  return {
    docusign,
    adobesign,
    anyConfigured: docusign || adobesign,
  };
}

/** Returns an array of the providers that are configured. */
export function getConfiguredProviders(): SignProvider[] {
  const { docusign, adobesign } = isEsignConfigured();
  const out: SignProvider[] = [];
  if (docusign) out.push('docusign');
  if (adobesign) out.push('adobesign');
  return out;
}

/* -------------------------------------------------------------------------- */
/*  DocuSign helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Obtain a DocuSign access token via JWT Grant (OAuth 2.0 JWT Bearer flow).
 *
 * In production this requires:
 *   1. An RSA key pair generated in the DocuSign admin console.
 *   2. The private key stored in DOCUSIGN_SECRET_KEY.
 *   3. The user having granted consent for the integration key.
 *
 * Here we generate a standard JWT and exchange it against the DocuSign auth
 * server. This follows the shape of the DocuSign eSignature v2.1 JWT grant.
 */
async function getDocusignAccessToken(): Promise<string> {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
  const userId = process.env.DOCUSIGN_USER_ID!;
  const rsaKey = process.env.DOCUSIGN_SECRET_KEY; // PEM-formatted RSA private key

  const oauthBase = process.env.DOCUSIGN_OAUTH_BASE || 'https://account-d.docusign.com';

  if (!rsaKey) {
    // Fallback: some integrations use a pre-issued access token stored directly
    const directToken = process.env.DOCUSIGN_ACCESS_TOKEN;
    if (directToken) return directToken;
    throw new Error('DOCUSIGN_SECRET_KEY or DOCUSIGN_ACCESS_TOKEN is required');
  }

  // Build the JWT assertion (RS256) — in Next.js we use the jose library
  // which is already a project dependency (used in auth.ts).
  const { SignJWT, importPKCS8 } = await import('jose');

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(rsaKey, 'RS256');

  const assertion = await new SignJWT({
    iss: integrationKey,
    sub: userId,
    aud: oauthBase.replace('https://', ''),
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);

  const tokenRes = await fetch(`${oauthBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`DocuSign token exchange failed: ${tokenRes.status} ${body}`);
  }

  const data = (await tokenRes.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Convert a role string to the DocuSign recipientType / routingOrder mapping.
 */
function docusignRecipients(recipients: SignRecipient[]) {
  const signers: object[] = [];
  const carbonCopies: object[] = [];
  const witnesses: object[] = [];

  recipients.forEach((r, i) => {
    const base = {
      name: r.name,
      email: r.email,
      recipientId: String(i + 1),
      routingOrder: String(i + 1),
    };
    switch (r.role ?? 'signer') {
      case 'cc':
        carbonCopies.push(base);
        break;
      case 'witness':
        witnesses.push(base);
        break;
      default:
        signers.push({
          ...base,
          tabs: {
            signHereTabs: [{ anchorString: '/sig/', anchorYOffset: '-5', anchorUnits: 'pixels' }],
          },
        });
    }
  });

  return { signers, carbonCopies, witnesses };
}

/**
 * Create a DocuSign envelope and send it for signature.
 *
 * Follows the DocuSign eSignature REST API v2.1 shape:
 *   POST /restapi/v2.1/accounts/{accountId}/envelopes
 *
 * When DOCUSIGN_INTEGRATION_KEY is not set, returns a clean stub so the
 * application continues to function without crashing.
 */
export async function createDocusignEnvelope(
  env: SignEnvelope
): Promise<EnvelopeResult> {
  // ── Stub path ──────────────────────────────────────────────────────────────
  if (!process.env.DOCUSIGN_INTEGRATION_KEY) {
    const stubId = `stub-ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      envelopeId: stubId,
      statusUrl: `https://appdemo.docusign.com/envelopes/${stubId}`,
    };
  }

  // ── Real path ──────────────────────────────────────────────────────────────
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl =
    process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net';
  const apiUrl = `${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes`;

  const accessToken = await getDocusignAccessToken();

  // Encode document content as base64
  const documentBase64 = Buffer.from(env.documentContent, 'utf-8').toString('base64');

  const { signers, carbonCopies, witnesses } = docusignRecipients(env.recipients);

  const envelopeDefinition = {
    emailSubject: env.subject,
    emailBlurb: env.message ?? '',
    status: 'sent', // 'sent' delivers immediately; use 'created' for draft
    documents: [
      {
        documentId: '1',
        name: env.documentName.endsWith('.txt') ? env.documentName : `${env.documentName}.txt`,
        documentBase64,
        fileExtension: 'txt',
      },
    ],
    recipients: {
      signers,
      carbonCopies,
      witnesses,
    },
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(envelopeDefinition),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DocuSign envelope creation failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { envelopeId: string };
  return {
    envelopeId: data.envelopeId,
    statusUrl: `${baseUrl}/envelopes/${data.envelopeId}`,
  };
}

/**
 * Get the status of a DocuSign envelope.
 * GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}
 */
export async function getDocusignStatus(envelopeId: string): Promise<EnvelopeStatus> {
  if (!process.env.DOCUSIGN_INTEGRATION_KEY) {
    return { status: 'sent' };
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net';
  const accessToken = await getDocusignAccessToken();

  const res = await fetch(
    `${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
  );

  if (!res.ok) {
    return { status: 'unknown' };
  }

  const data = (await res.json()) as {
    status: string;
    completedDateTime?: string;
  };

  const statusMap: Record<string, EnvelopeStatus['status']> = {
    created: 'created',
    sent: 'sent',
    delivered: 'delivered',
    completed: 'completed',
    declined: 'declined',
    voided: 'voided',
  };

  return {
    status: statusMap[data.status] ?? 'unknown',
    signedAt: data.completedDateTime,
  };
}

/* -------------------------------------------------------------------------- */
/*  Adobe Sign helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Obtain an Adobe Sign access token.
 *
 * Adobe Sign uses OAuth 2.0. For server-to-server integrations the recommended
 * approach is a pre-issued access token with long-lived refresh. We support:
 *   1. Pre-issued token via ADOBESIGN_ACCESS_TOKEN (simplest).
 *   2. OAuth client-credentials flow via ADOBESIGN_INTEGRATION_KEY + ADOBESIGN_CLIENT_SECRET.
 *
 * The OAuth endpoint follows the Adobe Sign OAuth v2 specification.
 */
async function getAdobesignAccessToken(): Promise<string> {
  const directToken = process.env.ADOBESIGN_ACCESS_TOKEN;
  if (directToken) return directToken;

  const clientId = process.env.ADOBESIGN_INTEGRATION_KEY!;
  const clientSecret = process.env.ADOBESIGN_CLIENT_SECRET!;
  const apiBase = process.env.ADOBESIGN_API_BASE || 'https://api.na1.adobesign.com';

  const tokenRes = await fetch(`${apiBase}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'agreement_send:account agreement_read:account',
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Adobe Sign token exchange failed: ${tokenRes.status} ${body}`);
  }

  const data = (await tokenRes.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Upload a transient document to Adobe Sign and return its transientDocumentId.
 * POST /api/rest/v6/transientDocuments
 */
async function uploadAdobesignDocument(
  content: string,
  fileName: string,
  accessToken: string,
  apiBase: string
): Promise<string> {
  const blob = new Blob([content], { type: 'text/plain' });
  const form = new FormData();
  form.append('File-Name', fileName.endsWith('.txt') ? fileName : `${fileName}.txt`);
  form.append('Mime-Type', 'text/plain');
  form.append('File', blob, fileName);

  const res = await fetch(`${apiBase}/api/rest/v6/transientDocuments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adobe Sign document upload failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { transientDocumentId: string };
  return data.transientDocumentId;
}

/**
 * Create an Adobe Sign agreement and send it for signature.
 *
 * Follows the Adobe Sign REST API v6 shape:
 *   POST /api/rest/v6/agreements
 *
 * When ADOBESIGN_INTEGRATION_KEY is not set, returns a clean stub.
 */
export async function createAdobesignEnvelope(
  env: SignEnvelope
): Promise<EnvelopeResult> {
  // ── Stub path ──────────────────────────────────────────────────────────────
  if (!process.env.ADOBESIGN_INTEGRATION_KEY) {
    const stubId = `stub-as-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      envelopeId: stubId,
      statusUrl: `https://secure.na1.adobesign.com/account/agreements/${stubId}`,
    };
  }

  // ── Real path ──────────────────────────────────────────────────────────────
  const apiBase = process.env.ADOBESIGN_API_BASE || 'https://api.na1.adobesign.com';
  const accessToken = await getAdobesignAccessToken();

  // Upload the document as a transient document
  const transientDocumentId = await uploadAdobesignDocument(
    env.documentContent,
    env.documentName,
    accessToken,
    apiBase
  );

  // Build participant sets — Adobe Sign groups recipients into sets
  const participantSetsInfo = env.recipients.map((r, i) => {
    const role = r.role ?? 'signer';
    const adobeRole =
      role === 'cc' ? 'CC' : role === 'witness' ? 'NOTARY' : 'SIGNER';
    return {
      order: i + 1,
      role: adobeRole,
      memberInfos: [{ name: r.name, email: r.email }],
    };
  });

  const agreementInfo = {
    fileInfos: [{ transientDocumentId }],
    name: env.subject,
    message: env.message ?? '',
    participantSetsInfo,
    signatureType: 'ESIGN',
    state: 'IN_PROCESS', // Send immediately; use 'AUTHORING' for draft
  };

  const res = await fetch(`${apiBase}/api/rest/v6/agreements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(agreementInfo),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adobe Sign agreement creation failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return {
    envelopeId: data.id,
    statusUrl: `${apiBase}/account/agreements/${data.id}`,
  };
}

/**
 * Get the status of an Adobe Sign agreement.
 * GET /api/rest/v6/agreements/{agreementId}
 */
export async function getAdobesignStatus(agreementId: string): Promise<EnvelopeStatus> {
  if (!process.env.ADOBESIGN_INTEGRATION_KEY) {
    return { status: 'sent' };
  }

  const apiBase = process.env.ADOBESIGN_API_BASE || 'https://api.na1.adobesign.com';
  const accessToken = await getAdobesignAccessToken();

  const res = await fetch(`${apiBase}/api/rest/v6/agreements/${agreementId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return { status: 'unknown' };
  }

  const data = (await res.json()) as {
    status: string;
    signedDate?: string;
  };

  const statusMap: Record<string, EnvelopeStatus['status']> = {
    OUT_FOR_SIGNATURE: 'sent',
    OUT_FOR_DELIVERY: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'voided',
    DECLINED: 'declined',
    DRAFT: 'created',
    AUTHORING: 'created',
    IN_PROCESS: 'sent',
    WAITING_FOR_REVIEW: 'delivered',
  };

  return {
    status: statusMap[data.status] ?? 'unknown',
    signedAt: data.signedDate,
  };
}
