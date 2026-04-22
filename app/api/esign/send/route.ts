import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  isEsignConfigured,
  createDocusignEnvelope,
  createAdobesignEnvelope,
  type SignProvider,
  type SignRecipient,
} from '@/lib/esign';

const limiter = createRateLimiter({ maxRequests: 10, windowSeconds: 60 });

interface SendBody {
  provider: SignProvider;
  subject: string;
  message?: string;
  recipients: SignRecipient[];
  documentName: string;
  documentContent: string;
}

export async function POST(request: NextRequest) {
  // Rate limit
  const limited = limiter(request);
  if (limited) return limited;

  // Auth required
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check provider is configured
  const config = isEsignConfigured();
  if (!config.anyConfigured) {
    return NextResponse.json(
      {
        error:
          'E-signature not configured. Set DOCUSIGN_INTEGRATION_KEY or ADOBESIGN_INTEGRATION_KEY to enable.',
        code: 'ESIGN_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  // Parse body
  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  const { provider, subject, message, recipients, documentName, documentContent } = body;

  if (!provider || (provider !== 'docusign' && provider !== 'adobesign')) {
    return NextResponse.json(
      { error: 'Invalid provider. Must be "docusign" or "adobesign".' },
      { status: 400 }
    );
  }

  if (!subject?.trim()) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { error: 'At least one recipient is required' },
      { status: 400 }
    );
  }

  for (const r of recipients) {
    if (!r.name?.trim() || !r.email?.trim()) {
      return NextResponse.json(
        { error: 'Each recipient must have a name and email' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
      return NextResponse.json(
        { error: `Invalid email address: ${r.email}` },
        { status: 400 }
      );
    }
  }

  if (!documentName?.trim()) {
    return NextResponse.json({ error: 'documentName is required' }, { status: 400 });
  }

  if (!documentContent?.trim()) {
    return NextResponse.json({ error: 'documentContent is required' }, { status: 400 });
  }

  // Check the requested provider is configured
  if (provider === 'docusign' && !config.docusign) {
    return NextResponse.json(
      {
        error: 'DocuSign is not configured. Set DOCUSIGN_INTEGRATION_KEY to enable.',
        code: 'DOCUSIGN_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  if (provider === 'adobesign' && !config.adobesign) {
    return NextResponse.json(
      {
        error: 'Adobe Sign is not configured. Set ADOBESIGN_INTEGRATION_KEY to enable.',
        code: 'ADOBESIGN_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  // Send the envelope
  try {
    const envelope = { provider, subject, message, recipients, documentName, documentContent };

    const result =
      provider === 'docusign'
        ? await createDocusignEnvelope(envelope)
        : await createAdobesignEnvelope(envelope);

    return NextResponse.json({
      envelopeId: result.envelopeId,
      statusUrl: result.statusUrl,
      provider,
    });
  } catch (err: unknown) {
    console.error('[esign/send] error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to send envelope',
        code: 'ESIGN_SEND_ERROR',
      },
      { status: 500 }
    );
  }
}
