import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';
import type { GroundingSource } from '@/lib/types';

if (typeof window !== 'undefined') {
  throw new Error('lib/ai/gemini.ts deve ser importado exclusivamente no servidor (Server-Only).');
}

// Evita atrasos de até 21s em redes Windows onde IPv6 (AAAA) sofre timeout antes de cair para IPv4
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignora caso o runtime não suporte
}

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const FAST_GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Configuração oficial do SDK @google/genai v2 (Interactions API) para desativar
 * retentativas automáticas de backoff (que aguardam o header Retry-After ~60s até 4x em erros 429).
 * Isso garante fail-fast (< 1s) para nosso próprio Circuit Breaker e Model Cascade.
 */
export const NO_RETRY_OPTIONS = {
  retries: {
    strategy: 'none' as const,
  },
};

const SEARCH_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos

interface GlobalAiState {
  __nocturneGeminiClient?: GoogleGenAI;
  __nocturneGeminiKeyHash?: string;
  __nocturneSearchCooldownUntil?: number;
}

const globalForAi = globalThis as unknown as GlobalAiState;

export function isSearchGroundingAvailable(): boolean {
  if (process.env.DISABLE_GEMINI_SEARCH_GROUNDING === 'true') {
    return false;
  }
  const cooldownUntil = globalForAi.__nocturneSearchCooldownUntil ?? 0;
  return Date.now() >= cooldownUntil;
}

export function tripSearchGroundingCircuitBreaker(): void {
  globalForAi.__nocturneSearchCooldownUntil = Date.now() + SEARCH_COOLDOWN_MS;
}

export function isQuotaOrRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybeStatus = (err as { status?: number }).status;
  const maybeMsg = String((err as { message?: string }).message || '');
  return (
    maybeStatus === 429 ||
    maybeStatus === 503 ||
    /429|quota|rate.?limit|resource_exhausted|overloaded/i.test(maybeMsg)
  );
}

export function classifyGeminiError(err: unknown): { status: number; userMessage: string } {
  if (isQuotaOrRateLimitError(err)) {
    return {
      status: 429,
      userMessage:
        'Limite de requisições por minuto do plano gratuito (Free Tier) atingido. Aguarde ~30 segundos e tente novamente.',
    };
  }

  const msg = err instanceof Error ? err.message : String(err || '');
  if (/api_key_invalid|invalid api key|401|403|permission_denied/i.test(msg)) {
    return {
      status: 401,
      userMessage:
        'A chave GEMINI_API_KEY informada no .env.local foi recusada pela API do Google. Verifique se a chave foi copiada corretamente.',
    };
  }

  return {
    status: 500,
    userMessage: 'Não foi possível concluir a chamada de IA no momento. Tente novamente em instantes.',
  };
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    key &&
      key.trim().length > 10 &&
      !key.includes('sua-chave') &&
      !key.includes('your-api-key')
  );
}

/**
 * Reutiliza instância singleton do cliente GoogleGenAI em `globalThis`
 * para manter conexões HTTP/TLS Keep-Alive aquecidas entre requisições.
 */
export function getGeminiClient(): GoogleGenAI {
  const rawKey = process.env.GEMINI_API_KEY;
  const apiKey = rawKey?.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey || !isGeminiConfigured()) {
    throw new Error(
      'GEMINI_API_KEY não configurada no servidor. Defina GEMINI_API_KEY no arquivo .env.local.'
    );
  }

  const keyMarker = `${apiKey.slice(0, 6)}:${apiKey.length}`;
  if (!globalForAi.__nocturneGeminiClient || globalForAi.__nocturneGeminiKeyHash !== keyMarker) {
    globalForAi.__nocturneGeminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        retryOptions: {
          attempts: 1,
        },
      },
    });
    globalForAi.__nocturneGeminiKeyHash = keyMarker;
  }

  return globalForAi.__nocturneGeminiClient;
}

interface GenericAnnotation {
  type?: string;
  url?: string;
  title?: string;
}

interface GenericContentPart {
  type?: string;
  text?: string;
  annotations?: GenericAnnotation[];
}

interface GenericStep {
  type?: string;
  content?: GenericContentPart[];
}

export function extractGroundingTelemetry(steps: unknown): {
  grounded: boolean;
  sources: GroundingSource[];
} {
  if (!Array.isArray(steps)) {
    return { grounded: false, sources: [] };
  }

  let grounded = false;
  const seenUrls = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const rawStep of steps as GenericStep[]) {
    if (rawStep?.type === 'google_search_call' || rawStep?.type === 'google_search_result') {
      grounded = true;
    }

    if (rawStep?.type === 'model_output' && Array.isArray(rawStep.content)) {
      for (const part of rawStep.content) {
        if (Array.isArray(part.annotations)) {
          for (const ann of part.annotations) {
            if (ann?.type === 'url_citation' && ann.url && !seenUrls.has(ann.url)) {
              seenUrls.add(ann.url);
              grounded = true;
              let fallbackHost = 'Fonte Web';
              try {
                fallbackHost = new URL(ann.url).hostname;
              } catch {
                // mantém fallback
              }
              sources.push({
                title: ann.title || fallbackHost,
                url: ann.url,
              });
            }
          }
        }
      }
    }
  }

  return { grounded, sources: sources.slice(0, 5) };
}
