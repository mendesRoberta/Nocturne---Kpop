'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemoModeEnabled, setDemoMode } from '@/lib/demo-data';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      if (isDemoModeEnabled()) {
        router.replace('/dashboard');
        return;
      }
      if (!isSupabaseConfigured) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      }
    };

    checkExistingSession();
  }, [router]);

  const handleEnterDemo = () => {
    setDemoMode(true);
    router.push('/dashboard');
  };

  const handlePasswordReset = async () => {
    setError('');
    setSuccess('');

    if (!isSupabaseConfigured) {
      setError('O Supabase não está configurado. Utilize o Modo Demo abaixo para explorar o projeto.');
      return;
    }

    if (!email.trim()) {
      setError('Digite seu e-mail no campo acima para receber o link de recuperação.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setSuccess('Link de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail de recuperação.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isSupabaseConfigured) {
      setError(
        'As credenciais do Supabase não estão configuradas neste ambiente. Clique em "Explorar Modo Demo" abaixo para testar todas as funcionalidades!'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        setSuccess('Cadastro realizado com sucesso! Verifique seu e-mail ou faça login.');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        setDemoMode(false);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro durante a autenticação.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen overflow-x-hidden flex items-center justify-center relative py-10">
      {/* Camada de Fundo Hero */}
      <div className="fixed inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1920&q=80"
          alt="Palco de show K-Pop"
          fill
          priority
          className="object-cover opacity-35 shadow-inner"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/40" />
      </div>

      {/* Luzes Neon Abstratas */}
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-[30rem] h-[30rem] bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Card Principal */}
      <main className="relative z-10 w-full max-w-[1200px] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-lg glass-panel rounded-3xl p-8 md:p-12 shadow-[0_0_60px_rgba(223,142,255,0.08)] border border-white/10 relative overflow-hidden"
        >
          {/* Cabeçalho da Marca */}
          <div className="flex flex-col items-center mb-6 text-center px-2">
            <span className="inline-flex items-center gap-1.5 text-secondary font-headline text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-3 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
              <Sparkles className="w-3.5 h-3.5" />
              Pulso Editorial K-Pop + IA
            </span>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-on-surface mb-2 text-neon-glow">
              NOCTURNE
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base font-medium opacity-85">
              {isSignUp ? 'Crie seu perfil editorial de fã.' : 'Entre no radar inteligente do K-Pop.'}
            </p>
          </div>

          {/* Botão Rápido de Modo Demo para Recrutadores */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleEnterDemo}
              className="w-full group flex items-center justify-between px-5 py-3.5 rounded-2xl bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-headline font-extrabold uppercase tracking-wider text-secondary">
                    Explorar Modo Demo Instantâneo
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Acesso imediato sem cadastro — ideal para avaliação de portfólio
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="w-full border-t border-white/10" />
            <span className="px-3 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant bg-[#16161d] rounded-full">
              ou acesse sua conta
            </span>
          </div>

          {/* Formulário de Autenticação */}
          <form className="space-y-4 md:space-y-5" onSubmit={handleAuth}>
            {!isSupabaseConfigured && (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3.5 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Banco Supabase opcional não detectado no <code className="text-primary">.env.local</code>. Use o{' '}
                  <button
                    type="button"
                    onClick={handleEnterDemo}
                    className="text-secondary font-bold hover:underline"
                  >
                    Modo Demo
                  </button>{' '}
                  acima para testar a Galeria e a IA!
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="text-red-300 text-xs font-semibold text-center px-4 bg-red-500/10 py-3 rounded-2xl border border-red-500/20"
              >
                {error}
              </p>
            )}
            {success && (
              <p
                role="status"
                className="text-primary text-xs font-semibold text-center px-4 bg-primary/10 py-3 rounded-2xl border border-primary/20"
              >
                {success}
              </p>
            )}

            {/* E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email-input"
                className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4 block"
              >
                Endereço de E-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <input
                  id="email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low/60 border border-white/10 focus:border-primary/60 focus:outline-none text-on-surface placeholder:text-outline/50 pl-13 pr-6 py-3.5 rounded-full text-sm transition-all duration-300"
                  placeholder="voce@nocturne.app"
                  type="email"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-4">
                <label
                  htmlFor="password-input"
                  className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest"
                >
                  Senha de Acesso
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-[10px] font-bold text-primary uppercase tracking-wider hover:brightness-125 transition-all"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <input
                  id="password-input"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low/60 border border-white/10 focus:border-primary/60 focus:outline-none text-on-surface placeholder:text-outline/50 pl-13 pr-12 py-3.5 rounded-full text-sm transition-all duration-300"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão Principal */}
            <button
              disabled={isLoading}
              className="w-full group relative overflow-hidden rounded-full p-px transition-all hover:shadow-[0_0_30px_rgba(223,142,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary-container" />
              <div className="relative flex items-center justify-center bg-black py-3.5 rounded-full group-hover:bg-transparent transition-colors duration-300">
                <span className="font-headline font-extrabold text-white group-hover:text-black transition-colors text-base tracking-tight">
                  {isLoading
                    ? 'Sincronizando...'
                    : isSignUp
                      ? 'Criar Conta no NOCTURNE'
                      : 'Entrar na Plataforma'}
                </span>
              </div>
            </button>
          </form>

          {/* Alternar Login/Cadastro */}
          <p className="mt-6 text-center text-sm font-medium text-on-surface-variant">
            {isSignUp ? 'Já possui perfil?' : 'Novo no fandom?'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-secondary font-bold hover:underline underline-offset-4 ml-1.5"
            >
              {isSignUp ? 'Fazer login' : 'Criar conta gratuita'}
            </button>
          </p>
        </motion.div>

        {/* Texto Lateral Editorial */}
        <div className="hidden lg:block absolute -right-64 top-1/2 -translate-y-1/2 rotate-90 origin-left pointer-events-none">
          <span className="font-headline text-8xl font-black text-white/5 tracking-tighter select-none uppercase">
            AI Powered
          </span>
        </div>
      </main>

      {/* Selo Técnico Inferior Esquerdo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-6 left-6 z-20 hidden sm:flex items-center gap-3.5 bg-surface-container-low/85 backdrop-blur-md px-5 py-3.5 rounded-full border border-outline-variant/25"
      >
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            Arquitetura de IA Ativa
          </p>
          <p className="font-headline font-bold text-xs text-on-surface tracking-tight">
            Gemini 3.8 Flash • Interactions API • Search Grounding
          </p>
        </div>
      </motion.div>
    </div>
  );
}
