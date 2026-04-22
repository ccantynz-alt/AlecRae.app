import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPTS, DocMode } from '@/lib/templates';
import { rateLimiters } from '@/lib/rate-limit';
import { requireEnhanceEnv } from '@/lib/env-check';

export const maxDuration = 120;

// Complex legal/accounting modes that benefit from extended thinking
// Claude will reason through document structure, legal analysis, and formatting
// before producing output — dramatically better quality for complex documents
const THINKING_MODES = new Set<DocMode>([
  'legal-memo',
  'court-filing',
  'demand-letter',
  'deposition-summary',
  'engagement-letter',
  'tax-advisory',
  'audit-opinion',
]);

// Higher token limits for document types that tend to be long
const TOKEN_LIMITS: Partial<Record<DocMode, number>> = {
  'court-filing': 16384,
  'legal-memo': 16384,
  'demand-letter': 12288,
  'deposition-summary': 16384,
  'engagement-letter': 12288,
  'tax-advisory': 12288,
  'audit-opinion': 12288,
  'accounting-report': 12288,
};

const DEFAULT_MAX_TOKENS = 8192;

export async function POST(request: NextRequest) {
  const limited = rateLimiters.enhance(request);
  if (limited) return limited;

  const env = requireEnhanceEnv();
  if (!env.ok) {
    return new Response(
      JSON.stringify({ error: env.message, code: env.code, missing: env.missing }),
      {
        status: env.status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { text, mode = 'general', customInstructions = '' } = await request.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const docMode = (mode as DocMode) in SYSTEM_PROMPTS ? (mode as DocMode) : 'general';
    const systemPrompt = SYSTEM_PROMPTS[docMode];
    const fullSystem = customInstructions
      ? `${systemPrompt}\n\nADDITIONAL USER INSTRUCTIONS:\n${customInstructions}`
      : systemPrompt;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const maxTokens = TOKEN_LIMITS[docMode] || DEFAULT_MAX_TOKENS;
    const useThinking = THINKING_MODES.has(docMode);

    const encoder = new TextEncoder();

    if (useThinking) {
      // Extended thinking for complex legal/accounting documents
      // Claude thinks through the document structure, legal reasoning, and formatting
      // before producing the final output — results in dramatically better quality
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        thinking: {
          type: 'enabled',
          budget_tokens: 4096,
        },
        system: fullSystem,
        messages: [
          {
            role: 'user',
            content: `Here is the raw dictation to clean up and format:\n\n${text}`,
          },
        ],
      });

      // Extract the text content (skip thinking blocks — those are internal reasoning)
      let resultText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          resultText += block.text;
        }
      }

      // Stream the pre-computed result for consistent UX
      const readableStream = new ReadableStream({
        start(controller) {
          const chunkSize = 20;
          let offset = 0;
          const sendChunk = () => {
            if (offset >= resultText.length) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
            const chunk = resultText.slice(offset, offset + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            offset += chunkSize;
            sendChunk();
          };
          sendChunk();
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Standard streaming for simpler modes (general, email, meeting notes, legal letter)
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: fullSystem,
      messages: [
        {
          role: 'user',
          content: `Here is the raw dictation to clean up and format:\n\n${text}`,
        },
      ],
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          console.error('Enhancement stream error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Enhancement stream failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Enhancement error:', error);
    return new Response(
      JSON.stringify({ error: 'Enhancement failed', code: 'ENHANCEMENT_ERROR' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
