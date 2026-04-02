import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPTS, DocMode } from '@/lib/templates';
import { CONSUMER_SYSTEM_PROMPTS, ConsumerMode } from '@/lib/consumer-modes';
import { buildGrammarPrompt, GrammarConfig } from '@/lib/grammar-engine';
import { getLanguage } from '@/lib/languages';

export const maxDuration = 60;

type AllModes = DocMode | ConsumerMode;

export async function POST(request: NextRequest) {
  try {
    const { text, mode = 'general', customInstructions = '', grammarConfig, language } = await request.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get system prompt from professional or consumer modes
    const systemPrompt = SYSTEM_PROMPTS[mode as DocMode]
      || CONSUMER_SYSTEM_PROMPTS[mode as ConsumerMode]
      || SYSTEM_PROMPTS['general'];

    // Build the full system prompt with optional grammar config and language
    let fullSystem = systemPrompt;

    // Add language context if specified
    if (language) {
      const lang = getLanguage(language);
      if (lang) {
        fullSystem += `\n\nLANGUAGE: Output in ${lang.name} (${lang.nativeName}). ${lang.grammarNotes}`;
      }
    }

    // Add grammar rules if configured
    if (grammarConfig) {
      fullSystem += buildGrammarPrompt(grammarConfig as GrammarConfig);
    }

    // Add custom instructions
    if (customInstructions) {
      fullSystem += `\n\nADDITIONAL USER INSTRUCTIONS:\n${customInstructions}`;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Stream the response for real-time display
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: fullSystem,
      messages: [
        {
          role: 'user',
          content: `Here is the raw dictation to clean up and format:\n\n${text}`,
        },
      ],
    });

    const encoder = new TextEncoder();

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
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
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
  } catch (error: any) {
    console.error('Enhancement error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Enhancement failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
