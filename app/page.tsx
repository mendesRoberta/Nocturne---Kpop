'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setSuccess('Registration successful! Please check your email or log in.');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen overflow-hidden flex items-center justify-center relative">
      {/* Hero Background Layer */}
      <div className="fixed inset-0 z-0">
        <Image 
          src="https://picsum.photos/seed/concert_bg/1920/1080" 
          alt="Concert background" 
          fill 
          className="object-cover opacity-40 shadow-inner"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/20"></div>
      </div>

      {/* Background Abstract Neon Shapes */}
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full"></div>
      <div className="fixed -bottom-24 -left-24 w-[30rem] h-[30rem] bg-secondary/10 blur-[150px] rounded-full"></div>

      {/* Login Shell */}
      <main className="relative z-10 w-full max-w-[1200px] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg glass-panel rounded-3xl p-10 md:p-14 shadow-[0_0_60px_rgba(223,142,255,0.06)] relative overflow-hidden"
        >
          {/* Branding Header */}
          <div className="flex flex-col items-center mb-6 md:mb-8 text-center px-4">
            <span className="text-secondary font-headline text-[10px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase mb-3 md:mb-4">Ultimate K-Pop Pulse</span>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-on-surface mb-2 text-neon-glow">NOCTURNE</h1>
            <p className="text-on-surface-variant text-sm md:text-base font-medium opacity-80">{isSignUp ? "Create your legacy." : "Step into the spotlight."}</p>
          </div>

          {/* Form UI */}
          <form className="space-y-4 md:space-y-6" onSubmit={handleAuth}>
            {!isSupabaseConfigured && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Configuração Necessária</p>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    Você precisa configurar as chaves do Supabase no menu <span className="text-white font-bold">Settings</span> para habilitar o login e salvamento real.
                  </p>
                  <a 
                    href="https://supabase.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[9px] font-bold text-secondary flex items-center gap-1 hover:underline pt-1"
                  >
                    Abrir Supabase <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </motion.div>
            )}
            
            {error && (
              <p className="text-red-400 text-[11px] font-bold text-center px-4 bg-red-400/10 py-3 rounded-full border border-red-400/20 animate-in fade-in zoom-in-95">{error}</p>
            )}
            {success && (
              <p className="text-primary text-[11px] font-bold text-center px-4 bg-primary/10 py-3 rounded-full border border-primary/20 animate-in fade-in zoom-in-95">{success}</p>
            )}
            
            {/* Email Input */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-4">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <input 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low/40 border-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-outline/40 pl-14 pr-6 py-3.5 md:py-4 rounded-full text-sm transition-all duration-300" 
                  placeholder="bias@nocturne.app" 
                  type="email" 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex justify-between items-end px-4">
                <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Security Pin</label>
                {!isSignUp && <a className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-wider hover:brightness-125 transition-all" href="#">Lost Access?</a>}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <input 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low/40 border-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-outline/40 pl-14 pr-6 py-3.5 md:py-4 rounded-full text-sm transition-all duration-300" 
                  placeholder="••••••••" 
                  type="password" 
                />
              </div>
            </div>

            {/* Action Button */}
            <button 
              disabled={isLoading}
              className="w-full group relative overflow-hidden rounded-full p-px transition-all hover:shadow-[0_0_30px_rgba(223,142,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary-container"></div>
              <div className="relative flex items-center justify-center bg-black py-4 rounded-full group-hover:bg-transparent transition-colors duration-300">
                <span className="font-headline font-extrabold text-white group-hover:text-black transition-colors text-lg tracking-tight">
                  {isLoading ? "Synchronizing..." : (isSignUp ? "Join NOCTURNE" : "Enter")}
                </span>
              </div>
            </button>
          </form>

          {/* Toggle Link */}
          <p className="mt-8 text-center text-sm font-medium text-on-surface-variant">
            {isSignUp ? "Already a fan?" : "New to the fandom?"} 
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-secondary font-bold hover:underline underline-offset-4 ml-1"
            >
              {isSignUp ? "Log into your profile" : "Claim your VIP pass"}
            </button>
          </p>
        </motion.div>

        {/* Floating Editorial Side Text */}
        <div className="hidden lg:block absolute -right-64 top-1/2 -translate-y-1/2 rotate-90 origin-left">
          <span className="font-headline text-8xl font-black text-white/5 tracking-tighter select-none uppercase">Next Generation</span>
        </div>
      </main>

      {/* Bottom Left Decorative Badge */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-10 left-10 z-20 hidden sm:flex items-center gap-4 bg-surface-container-low/80 backdrop-blur-md px-6 py-4 rounded-full border border-outline-variant/20"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-container">
            <Image 
              src="https://picsum.photos/seed/idol/100/100" 
              alt="Idol" 
              width={40} 
              height={40} 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary rounded-full border-2 border-background"></div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Trending Now</p>
          <p className="font-headline font-bold text-xs text-on-surface tracking-tight">Winter &apos;Euphoria&apos; Visuals</p>
        </div>
      </motion.div>
    </div>
  );
}
