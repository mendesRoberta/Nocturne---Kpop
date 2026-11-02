import { NextResponse } from 'next/server';
import { FAST_GEMINI_MODEL, GEMINI_MODEL, isGeminiConfigured } from '@/lib/ai/gemini';

export async function GET() {
  return NextResponse.json({
    configured: isGeminiConfigured(),
    model: GEMINI_MODEL,
    fastModel: FAST_GEMINI_MODEL,
    api: 'Interactions API (@google/genai v2)',
    capabilities: [
      'multi_model_routing',
      'google_search_grounding_circuit_breaker',
      'structured_outputs_json_schema',
      'stateful_multi_turn_streaming',
      'prompt_injection_guardrails',
    ],
  });
}
