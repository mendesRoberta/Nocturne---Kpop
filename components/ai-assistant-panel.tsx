'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Globe,
  ExternalLink,
  Cpu,
  Clock,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import type { AssistantMessage, BiasDetails, GroundingSource } from '@/lib/types';

interface AiAssistantPanelProps {
  biases: BiasDetails[];
  aiConfigured: boolean | null;
  initialPrompt?: string | null;
  onConsumeInitialPrompt?: () => void;
}

const SUGGESTED_PROMPTS = [
  'Analise o perfil musical da minha Galeria de Biases e recomende 5 B-sides escondidas.',
  'Monte uma playlist noturna de 6 músicas que conecte o estilo dos meus biases.',
  'Quais grupos de 5ª geração combinam com meu gosto atual e por quê?',
  'Compare os conceitos visuais e vocais dos artistas da minha galeria.',
];

export function AiAssistantPanel({
  biases,
  aiConfigured,
  initialPrompt,
  onConsumeInitialPrompt,
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'fast' | 'deep'>('fast');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [previousInteractionId, setPreviousInteractionId] = useState<string | undefined>(undefined);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamStatus]);

  const handleResetChat = () => {
    setMessages([]);
    setPreviousInteractionId(undefined);
    setErrorBanner(null);
    setStreamStatus(null);
  };

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const promptText = (textOverride ?? input).trim();
      if (!promptText || isStreaming) return;

      setErrorBanner(null);
      if (!textOverride) setInput('');

      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: promptText,
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      const assistantMsgId = `ai-${Date.now() + 1}`;
      const placeholderAiMsg: AssistantMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, placeholderAiMsg]);
      setIsStreaming(true);
      setStreamStatus(
        mode === 'fast'
          ? 'Iniciando resposta rápida (Gemini 3.5 Flash-Lite)...'
          : 'Iniciando análise profunda (Gemini 3.8 Flash)...'
      );

      try {
        const response = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: promptText,
            mode,
            previousInteractionId,
            biases: biases.map((b) => ({
              name: b.name,
              group: b.group,
              trendingSong: b.trendingSong,
              position: b.position,
            })),
          }),
        });

        if (!response.ok || !response.body) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Erro HTTP ${response.status} ao comunicar com o assistente.`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const line = rawEvent.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const payload = JSON.parse(jsonStr) as {
                type: string;
                text?: string;
                label?: string;
                summary?: string;
                interactionId?: string;
                latencyMs?: number;
                totalTokens?: number;
                model?: string;
                grounded?: boolean;
                sources?: GroundingSource[];
                message?: string;
              };

              if (payload.type === 'status' && payload.label) {
                setStreamStatus(payload.label);
              } else if (payload.type === 'delta' && payload.text) {
                setStreamStatus(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: m.content + payload.text } : m
                  )
                );
              } else if (payload.type === 'thought' && payload.summary) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, thoughtSummary: (m.thoughtSummary || '') + payload.summary }
                      : m
                  )
                );
              } else if (payload.type === 'done') {
                if (payload.interactionId) {
                  setPreviousInteractionId(payload.interactionId);
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          latencyMs: payload.latencyMs,
                          totalTokens: payload.totalTokens,
                          model: payload.model,
                          grounded: payload.grounded,
                          sources: payload.sources,
                        }
                      : m
                  )
                );
              } else if (payload.type === 'error') {
                throw new Error(payload.message || 'Erro durante o streaming da resposta.');
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro inesperado ao consultar o assistente.';
        setErrorBanner(msg);
        setMessages((prev) => prev.filter((m) => !(m.id === assistantMsgId && !m.content)));
      } finally {
        setIsStreaming(false);
        setStreamStatus(null);
      }
    },
    [biases, input, isStreaming, mode, previousInteractionId]
  );

  useEffect(() => {
    if (!initialPrompt || isStreaming) return;
    const promptToRun = initialPrompt;
    const timer = setTimeout(() => {
      onConsumeInitialPrompt?.();
      void sendMessage(promptToRun);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialPrompt, isStreaming, onConsumeInitialPrompt, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Cabeçalho Técnico do Painel IA */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-primary/20 shadow-[0_0_40px_rgba(223,142,255,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-headline font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Curador IA em Streaming (SSE)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-on-surface-variant text-[10px] font-headline font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Contexto: {biases.length} {biases.length === 1 ? 'bias' : 'biases'} na galeria
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-headline font-black uppercase tracking-tighter text-white">
              NOCTURNE Pulse AI
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Roteamento multi-modelo inteligente com memória conversacional (<code className="text-primary">previous_interaction_id</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {/* Seletor de Roteamento de Modelo (Latência vs Profundidade) */}
            <div
              role="group"
              aria-label="Modo de inferência"
              className="inline-flex items-center p-1 rounded-full bg-surface-container-high border border-white/10"
            >
              <button
                type="button"
                onClick={() => setMode('fast')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-headline font-bold uppercase tracking-wider transition-all ${
                  mode === 'fast'
                    ? 'bg-secondary text-black shadow-sm'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" />
                Rápido (Flash-Lite)
              </button>
              <button
                type="button"
                onClick={() => setMode('deep')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-headline font-bold uppercase tracking-wider transition-all ${
                  mode === 'deep'
                    ? 'bg-primary text-black shadow-sm'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Profundo (3.8 Flash)
              </button>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant hover:text-white transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nova Conversa
              </button>
            )}
          </div>
        </div>

        {aiConfigured === false && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100/90 leading-relaxed">
              <strong className="text-amber-300 uppercase tracking-wider block mb-0.5">
                Chave GEMINI_API_KEY não detectada no servidor
              </strong>
              Adicione <code className="bg-black/40 px-1.5 py-0.5 rounded">GEMINI_API_KEY=...</code> no seu arquivo{' '}
              <code className="bg-black/40 px-1.5 py-0.5 rounded">.env.local</code> e reinicie o servidor.
            </div>
          </div>
        )}
      </div>

      {/* Área de Mensagens */}
      <div className="glass-panel rounded-3xl border border-outline-variant/15 min-h-[420px] max-h-[600px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
                <Cpu className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-headline font-bold text-white mb-2">
                Como posso expandir seu radar de K-Pop hoje?
              </h3>
              <p className="text-xs text-on-surface-variant max-w-md mb-6">
                Sua galeria atual ({biases.map((b) => b.name).join(', ') || 'vazia'}) é enviada automaticamente como contexto estruturado para personalizar cada resposta.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {SUGGESTED_PROMPTS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => void sendMessage(suggestion)}
                    className="p-4 rounded-2xl bg-surface-container-high/70 hover:bg-primary/15 border border-white/10 hover:border-primary/40 transition-all text-xs text-on-surface hover:text-white leading-relaxed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-black font-medium rounded-br-sm'
                      : 'bg-surface-container-high border border-white/10 text-on-surface rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content || (isStreaming ? '•••' : '')}
                  </div>

                  {/* Fontes do Google Search Grounding */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        Fontes Verificadas (Google Search)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src) => (
                          <a
                            key={src.url}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 hover:bg-secondary/20 border border-white/10 hover:border-secondary/40 text-[11px] text-on-surface-variant hover:text-white transition-all"
                          >
                            <span className="truncate max-w-[180px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Telemetria por resposta */}
                  {msg.role === 'assistant' && msg.latencyMs !== undefined && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-3 text-[10px] text-on-surface-variant/80 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-primary" />
                        {msg.model || 'gemini-3.5-flash-lite'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-secondary" />
                        {(msg.latencyMs / 1000).toFixed(2)}s
                      </span>
                      {msg.totalTokens !== undefined && <span>{msg.totalTokens} tokens</span>}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-on-surface-variant/60 mt-1 px-1">
                  {msg.role === 'user' ? 'Você' : 'Pulse AI'} • {msg.createdAt}
                </span>
              </motion.div>
            ))
          )}

          {streamStatus && (
            <div className="flex items-center gap-2.5 text-xs text-secondary font-medium px-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              <span>{streamStatus}</span>
            </div>
          )}

          {errorBanner && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-medium"
            >
              {errorBanner}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input de Chat */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-surface-container-low/80 border-t border-white/10 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            maxLength={1000}
            placeholder="Pergunte sobre comebacks, peça recomendações ou analise seus biases..."
            className="flex-1 bg-surface-container-high border border-white/10 focus:border-primary/60 focus:outline-none rounded-full px-5 py-3.5 text-sm text-white placeholder:text-outline/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            aria-label="Enviar mensagem"
            className="px-6 py-3.5 rounded-full bg-gradient-to-r from-primary to-secondary text-black font-headline font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </section>
  );
}
