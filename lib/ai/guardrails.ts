/**
 * Camada de Guardrails & Segurança para Endpoints de IA (Server-Side)
 * - Rate limiting em memória (janela deslizante por IP)
 * - Sanitização de caracteres de controle
 * - Detecção heurística de tentativas de Prompt Injection / Jailbreak
 */

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

const WINDOW_MS = 60_000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 20;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'anonymous';
  }
  return request.headers.get('x-real-ip') || 'anonymous';
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    rateBuckets.set(ip, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  rateBuckets.set(ip, bucket);
  return { allowed: true };
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /ignore\s+(todas\s+as\s+|as\s+)?(instru[cç][oõ]es|regras)\s+(anteriores|acima)/i,
  /disregard\s+(all\s+)?(previous|system)\s+(instructions|prompt)/i,
  /system[_\s-]*instruction/i,
  /<\s*\/?\s*(system|developer|instruction)\s*>/i,
  /you\s+are\s+now\s+(in\s+)?(developer|dan|jailbreak)\s+mode/i,
  /esque[cç]a\s+tudo\s+o?\s*que\s+foi\s+dito/i,
  /retorne\s+isKpopIdol\s*:\s*true/i,
];

export function sanitizeUserText(raw: string): string {
  // Remove caracteres de controle invisíveis preservando acentuação, Hangul e pontuação normal
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function detectPromptInjection(input: string): { blocked: boolean; reason?: string } {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason:
          'Entrada bloqueada pelo guardrail de segurança: padrão suspeito de manipulação de prompt (Prompt Injection).',
      };
    }
  }
  return { blocked: false };
}

