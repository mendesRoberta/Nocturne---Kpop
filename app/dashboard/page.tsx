'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  isDemoModeEnabled,
  setDemoMode,
  loadDemoBiases,
  saveDemoBiases,
  resetDemoBiases,
  buildFallbackBiasAvatar,
  DEMO_LIKES_KEY,
} from '@/lib/demo-data';
import {
  EDITORIAL_ARTICLES,
  UPCOMING_DROPS,
  TRENDING_TAGS,
  LIVE_ACTIVITIES,
  type EditorialArticle,
} from '@/lib/editorial-data';
import type { BiasDetails, BiasValidationResponse } from '@/lib/types';
import { AiAssistantPanel } from '@/components/ai-assistant-panel';
import {
  Search,
  Bell,
  LayoutDashboard,
  Image as ImageIcon,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
  Heart,
  Share2,
  Menu,
  X,
  Info,
  Sparkles,
  Globe,
  ExternalLink,
  Cpu,
  RotateCcw,
  LogOut,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

type DashboardView = 'feed' | 'gallery' | 'assistant' | 'profile';

interface AuthUserSummary {
  id: string;
  email?: string;
  isDemo: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUserSummary | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const [biases, setBiases] = useState<BiasDetails[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBias, setSelectedBias] = useState<BiasDetails | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<EditorialArticle | null>(null);

  const [newBiasName, setNewBiasName] = useState('');
  const [newBiasImage, setNewBiasImage] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(DEMO_LIKES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignora erro de leitura
    }
    return [];
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);

  const dropsScrollRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fechar modais com tecla Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setSelectedBias(null);
        setSelectedArticle(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Verificar status do servidor de IA
  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setAiConfigured(Boolean(data.configured));
      })
      .catch(() => {
        setAiConfigured(false);
      });
  }, []);

  // Autenticação (Supabase Real ou Modo Demo) e carregamento inicial
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isSupabaseConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (!isMounted) return;
          setDemoMode(false);
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            isDemo: false,
          });

          const { data, error } = await supabase
            .from('biases')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && isMounted) {
            setBiases(
              data.map((b: Record<string, unknown>) => ({
                id: String(b.id),
                name: String(b.name || ''),
                image: String(b.image || buildFallbackBiasAvatar(String(b.name || 'idol'))),
                fullName: b.full_name ? String(b.full_name) : undefined,
                group: b.group_name ? String(b.group_name) : undefined,
                age: typeof b.age === 'number' ? b.age : undefined,
                trendingSong: b.trending_song ? String(b.trending_song) : undefined,
                position: b.position ? String(b.position) : undefined,
                agency: b.agency ? String(b.agency) : undefined,
                bioSummary: b.bio_summary ? String(b.bio_summary) : undefined,
              }))
            );
          }
          setAuthReady(true);
          return;
        }
      }

      if (isDemoModeEnabled()) {
        if (!isMounted) return;
        setCurrentUser({
          id: 'demo-visitor',
          email: 'visitante@portfolio.demo',
          isDemo: true,
        });
        setBiases(loadDemoBiases());
        setAuthReady(true);
        return;
      }

      router.replace('/');
    };

    void initialize();

    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            isDemo: false,
          });
        } else if (!isDemoModeEnabled()) {
          router.replace('/');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [router]);

  const navigateView = (view: DashboardView) => {
    setCurrentView(view);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const askAiAboutTopic = (prompt: string) => {
    setSelectedBias(null);
    setSelectedArticle(null);
    setAssistantInitialPrompt(prompt);
    navigateView('assistant');
  };

  const toggleLike = (itemId: string) => {
    setLikedIds((prev) => {
      const next = prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      try {
        window.localStorage.setItem(DEMO_LIKES_KEY, JSON.stringify(next));
      } catch {
        // ignora erro de armazenamento
      }
      return next;
    });
  };

  const handleShare = async (title: string) => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: `NOCTURNE • ${title}`, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title} — ${shareUrl}`);
        showToast('Link copiado para a área de transferência!');
      }
    } catch {
      // cancelado pelo usuário
    }
  };

  const scrollDrops = (direction: 'left' | 'right') => {
    if (!dropsScrollRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    dropsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const removeBias = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (currentUser?.isDemo) {
        const updated = biases.filter((b) => b.id !== id);
        setBiases(updated);
        saveDemoBiases(updated);
      } else {
        const { error } = await supabase.from('biases').delete().eq('id', id);
        if (error) throw error;
        setBiases((prev) => prev.filter((b) => b.id !== id));
      }
      if (selectedBias?.id === id) setSelectedBias(null);
      showToast('Bias removido da sua galeria.');
    } catch (err) {
      console.error('Erro ao remover bias:', err);
      showToast('Erro ao remover bias.');
    }
  };

  const handleLogout = async () => {
    setDemoMode(false);
    if (isSupabaseConfigured && !currentUser?.isDemo) {
      await supabase.auth.signOut();
    }
    router.push('/');
  };

  const handleResetDemo = () => {
    const fresh = resetDemoBiases();
    setBiases(fresh);
    showToast('Galeria de demonstração restaurada para o padrão inicial!');
  };

  const handleAddBias = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentUser) {
      setValidationError('Sessão inválida. Faça login ou ative o Modo Demo.');
      return;
    }

    const candidateName = newBiasName.trim();
    if (!candidateName) {
      setValidationError('Digite o nome do idol.');
      return;
    }

    setIsValidating(true);

    try {
      const res = await fetch('/api/ai/validate-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName }),
      });

      const result = (await res.json()) as BiasValidationResponse;

      if (!res.ok || !result.isKpopIdol) {
        setValidationError(
          result.errorMsg ||
            'Este nome não foi reconhecido como um idol de K-Pop. O NOCTURNE aceita apenas artistas da indústria K-Pop.'
        );
        return;
      }

      const finalName = result.stageName || candidateName;
      const finalImage = newBiasImage.trim() || buildFallbackBiasAvatar(finalName);

      if (currentUser.isDemo) {
        const createdBias: BiasDetails = {
          id: `demo-${Date.now()}`,
          name: finalName,
          image: finalImage,
          fullName: result.fullName,
          group: result.group,
          age: result.age,
          trendingSong: result.trendingSong,
          position: result.position,
          agency: result.agency,
          bioSummary: result.bioSummary,
          sources: result.telemetry?.sources,
        };
        const updated = [createdBias, ...biases];
        setBiases(updated);
        saveDemoBiases(updated);
      } else {
        const basePayload = {
          user_id: currentUser.id,
          name: finalName,
          image: finalImage,
          full_name: result.fullName,
          group_name: result.group,
          age: result.age,
          trending_song: result.trendingSong,
          position: result.position,
        };

        // Tenta inserir com colunas estendidas; se o banco antigo não tiver, faz fallback automático
        let { data, error: insertError } = await supabase
          .from('biases')
          .insert({
            ...basePayload,
            agency: result.agency,
            bio_summary: result.bioSummary,
          })
          .select()
          .single();

        if (insertError) {
          const fallbackInsert = await supabase
            .from('biases')
            .insert(basePayload)
            .select()
            .single();
          data = fallbackInsert.data;
          insertError = fallbackInsert.error;
        }

        if (insertError || !data) throw insertError || new Error('Falha ao salvar no banco.');

        const createdBias: BiasDetails = {
          id: data.id,
          name: data.name,
          image: data.image,
          fullName: data.full_name,
          group: data.group_name,
          age: data.age,
          trendingSong: data.trending_song,
          position: data.position,
          agency: result.agency,
          bioSummary: result.bioSummary,
          sources: result.telemetry?.sources,
        };

        setBiases((prev) => [createdBias, ...prev]);
      }

      setNewBiasName('');
      setNewBiasImage('');
      setIsAddModalOpen(false);
      setCurrentView('gallery');

      const latencySec = result.telemetry?.latencyMs
        ? `${(result.telemetry.latencyMs / 1000).toFixed(1)}s`
        : '';
      showToast(
        `${finalName} verificado via Gemini 3.8 Flash ${latencySec ? `(${latencySec})` : ''}!`
      );
    } catch (err) {
      console.error('Erro ao validar ou salvar bias:', err);
      setValidationError('Falha ao processar o bias. Verifique sua conexão e tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  // Filtragem em tempo real pela barra de busca
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBiases = useMemo(() => {
    if (!normalizedQuery) return biases;
    return biases.filter(
      (b) =>
        b.name.toLowerCase().includes(normalizedQuery) ||
        (b.group && b.group.toLowerCase().includes(normalizedQuery)) ||
        (b.fullName && b.fullName.toLowerCase().includes(normalizedQuery)) ||
        (b.trendingSong && b.trendingSong.toLowerCase().includes(normalizedQuery)) ||
        (b.agency && b.agency.toLowerCase().includes(normalizedQuery))
    );
  }, [biases, normalizedQuery]);

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return EDITORIAL_ARTICLES;
    return EDITORIAL_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(normalizedQuery) ||
        a.summary.toLowerCase().includes(normalizedQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
    );
  }, [normalizedQuery]);

  const filteredDrops = useMemo(() => {
    if (!normalizedQuery) return UPCOMING_DROPS;
    return UPCOMING_DROPS.filter(
      (d) =>
        d.title.toLowerCase().includes(normalizedQuery) ||
        d.artist.toLowerCase().includes(normalizedQuery) ||
        d.type.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="font-headline text-xs font-bold uppercase tracking-[0.25em] text-on-surface-variant">
          Inicializando NOCTURNE...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast de Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[150] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-container-highest/95 backdrop-blur-xl border border-primary/40 shadow-2xl text-xs font-medium text-white"
          >
            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabeçalho Fixo */}
      <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-outline-variant/15">
        <div className="flex justify-between items-center px-4 md:px-8 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 transition-all rounded-full text-primary"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <button
                type="button"
                onClick={() => navigateView('feed')}
                className="text-2xl font-black tracking-tighter text-primary uppercase font-headline"
              >
                NOCTURNE
              </button>
              {currentUser?.isDemo && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
                  Modo Demo
                </span>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-6 font-headline tracking-tight text-sm">
              <button
                type="button"
                onClick={() => navigateView('feed')}
                className={`${
                  currentView === 'feed'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-white'
                } font-medium transition-all pb-1`}
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => navigateView('gallery')}
                className={`${
                  currentView === 'gallery'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-white'
                } font-medium transition-all pb-1`}
              >
                Galeria ({biases.length})
              </button>
              <button
                type="button"
                onClick={() => navigateView('assistant')}
                className={`${
                  currentView === 'assistant'
                    ? 'text-secondary border-b-2 border-secondary'
                    : 'text-on-surface-variant hover:text-white'
                } font-medium transition-all pb-1 inline-flex items-center gap-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                Pulse IA
              </button>
              <button
                type="button"
                onClick={() => navigateView('profile')}
                className={`${
                  currentView === 'profile'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-white'
                } font-medium transition-all pb-1`}
              >
                Perfil & IA
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicador de Status da IA */}
            {aiConfigured !== null && (
              <button
                type="button"
                onClick={() => navigateView('profile')}
                title="Ver status e arquitetura de Inteligência Artificial"
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider border transition-all ${
                  aiConfigured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    aiConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {aiConfigured ? 'Gemini 3.8 Online' : 'Configurar API IA'}
              </button>
            )}

            {/* Busca Desktop */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-low/60 border border-white/10 focus:border-primary/60 focus:outline-none rounded-full pl-10 pr-8 py-2 w-44 lg:w-60 text-xs font-body text-white placeholder:text-on-surface-variant/60"
                placeholder="Buscar bias, grupo, artigo..."
                type="text"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botão Busca Mobile */}
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              className="p-2 hover:bg-white/5 transition-all rounded-full sm:hidden"
            >
              <Search className="w-5 h-5 text-on-surface-variant" />
            </button>

            {/* Botão Notificações */}
            <button
              type="button"
              aria-label="Notificações"
              onClick={() =>
                showToast('Radar atualizado: Google Search Grounding ativo para novos comebacks.')
              }
              className="p-2 hover:bg-white/5 transition-all rounded-full relative"
            >
              <Bell className="w-5 h-5 text-on-surface-variant" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-surface" />
            </button>

            {/* Avatar / Perfil */}
            <button
              type="button"
              onClick={() => navigateView('profile')}
              aria-label="Abrir perfil"
              className="w-9 h-9 rounded-full overflow-hidden border border-primary/40 flex items-center justify-center bg-primary/15 text-primary font-headline font-black text-xs shrink-0 hover:scale-105 transition-transform"
            >
              {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'N'}
            </button>
          </div>
        </div>

        {/* Barra de Busca Mobile Expansível */}
        {isMobileSearchOpen && (
          <div className="px-4 pb-3 sm:hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-high border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                placeholder="Buscar bias, grupo ou artigo..."
                type="text"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="flex pt-24 px-4 md:px-8 gap-6 max-w-full overflow-x-hidden flex-1">
        {/* Sidebar Lateral */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[45] lg:hidden"
              />
              <motion.aside
                key="sidebar"
                initial={{ width: 0, opacity: 0, x: -20 }}
                animate={{
                  width: isMobile ? 280 : 256,
                  opacity: 1,
                  x: 0,
                }}
                exit={{ width: 0, opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                className="fixed lg:sticky top-0 lg:top-24 left-0 h-screen lg:h-[calc(100vh-120px)] bg-surface-container-low/95 lg:bg-surface-container-low/60 backdrop-blur-2xl shadow-2xl border-r lg:border border-outline-variant/15 z-50 lg:z-40 rounded-r-3xl lg:rounded-2xl overflow-hidden shrink-0"
              >
                <div className="flex flex-col h-full py-8">
                  <div className="px-6 lg:hidden mb-8 flex justify-between items-center">
                    <span className="text-xl font-black tracking-tighter text-primary uppercase font-headline">
                      NOCTURNE
                    </span>
                    <button
                      type="button"
                      aria-label="Fechar menu"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <X className="w-6 h-6 text-on-surface-variant" />
                    </button>
                  </div>

                  <div className="px-6 mb-8 hidden lg:block">
                    <p className="font-headline font-bold uppercase tracking-widest text-[10px] text-primary mb-1">
                      Curadoria & IA
                    </p>
                    <p className="text-lg font-black text-white font-headline">NAVEGAÇÃO</p>
                  </div>

                  <nav className="flex flex-col gap-1 font-headline font-bold uppercase tracking-widest text-xs">
                    <button
                      type="button"
                      onClick={() => navigateView('feed')}
                      className={`flex items-center gap-4 py-3.5 px-6 transition-all ${
                        currentView === 'feed'
                          ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                          : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Feed Editorial</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateView('gallery')}
                      className={`flex items-center gap-4 py-3.5 px-6 transition-all ${
                        currentView === 'gallery'
                          ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                          : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Galeria ({biases.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateView('assistant')}
                      className={`flex items-center gap-4 py-3.5 px-6 transition-all ${
                        currentView === 'assistant'
                          ? 'bg-gradient-to-r from-secondary/20 to-transparent text-secondary border-l-4 border-secondary'
                          : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Pulse IA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateView('profile')}
                      className={`flex items-center gap-4 py-3.5 px-6 transition-all ${
                        currentView === 'profile'
                          ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                          : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Perfil & Arquitetura</span>
                    </button>
                  </nav>

                  <div className="mt-auto px-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(true);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className="w-full py-3.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-black font-headline font-bold text-xs tracking-wider uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                    >
                      + Validar Novo Bias
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Conteúdo Principal */}
        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          {currentView === 'feed' && (
            <>
              {/* Hero Banner */}
              <section className="mb-10">
                <div className="relative w-full h-[380px] md:h-[440px] rounded-3xl overflow-hidden group border border-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1920&q=80"
                    alt="Show K-Pop em arena iluminada"
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  <div className="absolute bottom-8 left-6 right-6 md:bottom-10 md:left-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-secondary text-black text-[10px] font-bold tracking-widest uppercase mb-3">
                      <Sparkles className="w-3 h-3" />
                      Curadoria Assistida por IA
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter mb-3">
                      RADAR DE COMEBACKS & BIAS HUB
                    </h2>
                    <p className="text-sm md:text-base text-on-surface-variant font-body mb-6 max-w-xl">
                      Valide artistas reais via Google Search Grounding, descubra B-sides personalizadas e acompanhe os lançamentos mais quentes do K-Pop.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 rounded-full bg-primary text-black font-headline font-bold uppercase text-xs md:text-sm tracking-tight hover:brightness-110 transition-all"
                      >
                        Validar Bias com IA
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateView('assistant')}
                        className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white font-headline font-bold uppercase text-xs md:text-sm tracking-tight hover:bg-white/20 transition-all inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-secondary" />
                        Abrir Pulse IA
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Grid Editorial */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredArticles.map((article) => {
                  const isLiked = likedIds.includes(article.id);
                  return (
                    <article
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="bg-surface-container-high rounded-2xl overflow-hidden group border border-outline-variant/15 hover:border-primary/30 transition-all cursor-pointer flex flex-col"
                    >
                      <div className="relative h-56">
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-tertiary rounded-full text-[10px] font-black uppercase text-black">
                            {article.badge}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-headline font-bold mb-2 leading-snug text-white group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-on-surface-variant text-xs leading-relaxed mb-4 line-clamp-3">
                            {article.summary}
                          </p>
                        </div>
                        <div
                          className="flex items-center justify-between pt-3 border-t border-white/5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
                            {article.meta}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              aria-label="Curtir artigo"
                              onClick={() => toggleLike(article.id)}
                              className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isLiked ? 'text-primary fill-primary' : ''
                                }`}
                              />
                              <span>{article.initialLikes + (isLiked ? 1 : 0)}</span>
                            </button>
                            <button
                              type="button"
                              aria-label="Compartilhar artigo"
                              onClick={() => void handleShare(article.title)}
                              className="text-on-surface-variant hover:text-white transition-colors"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Card Pulso da Galeria + IA */}
                <div className="bg-surface-container-high rounded-2xl overflow-hidden flex flex-col border border-primary/20">
                  <div className="p-7 flex-1 flex flex-col justify-center text-center bg-gradient-to-br from-primary/15 via-transparent to-secondary/10">
                    <Zap className="w-11 h-11 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-headline font-extrabold mb-2 italic tracking-tighter uppercase text-white">
                      Pulso da Sua Galeria
                    </h3>
                    <p className="text-on-surface-variant text-xs font-body mb-6 leading-relaxed">
                      Você possui <strong className="text-white">{biases.length}</strong>{' '}
                      {biases.length === 1 ? 'artista verificado' : 'artistas verificados'} prontos para alimentar recomendações contextuais no Pulse IA.
                    </p>
                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(20, biases.length * 20))}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        askAiAboutTopic(
                          'Analise o perfil musical da minha Galeria de Biases atual e sugira 5 músicas perfeitas para mim.'
                        )
                      }
                      className="mt-3 py-3 px-5 rounded-full bg-white/10 hover:bg-primary hover:text-black text-white font-headline font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Gerar Análise Musical com IA
                    </button>
                  </div>
                </div>
              </div>

              {/* Próximos Lançamentos */}
              <section className="mt-14">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tighter flex items-center gap-3">
                    <span className="w-8 h-[2px] bg-primary" />
                    Próximos Lançamentos
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Rolar lançamentos para a esquerda"
                      onClick={() => scrollDrops('left')}
                      className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Rolar lançamentos para a direita"
                      onClick={() => scrollDrops('right')}
                      className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div
                  ref={dropsScrollRef}
                  className="flex gap-5 overflow-x-auto no-scrollbar pb-4 scroll-smooth"
                >
                  {filteredDrops.map((drop) => (
                    <div
                      key={drop.id}
                      onClick={() =>
                        askAiAboutTopic(
                          `O que há de mais recente sobre o grupo/artista ${drop.artist} e seus últimos lançamentos?`
                        )
                      }
                      className="min-w-[250px] bg-surface-container-high p-4 rounded-2xl border border-outline-variant/15 group cursor-pointer hover:border-primary/40 transition-all"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-4 relative">
                        <Image
                          src={drop.image}
                          alt={drop.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                        {drop.date} • {drop.artist}
                      </p>
                      <h4 className="font-headline font-bold text-white uppercase truncate">
                        {drop.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant font-body mt-0.5">
                        {drop.type}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {currentView === 'gallery' && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl md:text-5xl font-headline font-black uppercase tracking-tighter flex items-center gap-3">
                    <span className="w-8 md:w-12 h-[3px] bg-secondary" />
                    Galeria de Biases
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Cada idol adicionado passa por verificação factual via Gemini 3.8 Flash + Google Search Grounding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-7 py-3.5 rounded-full bg-secondary text-black font-headline font-bold uppercase text-xs md:text-sm tracking-tight hover:brightness-110 transition-all self-start sm:self-auto shrink-0"
                >
                  + Adicionar Novo Bias
                </button>
              </div>

              {filteredBiases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-3xl border border-outline-variant/15 text-center px-6">
                  <ImageIcon className="w-14 h-14 text-on-surface-variant mb-4 opacity-30" />
                  <p className="text-on-surface-variant font-headline font-bold uppercase tracking-widest text-sm">
                    {normalizedQuery
                      ? 'Nenhum bias encontrado para essa busca'
                      : 'Sua galeria está vazia'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      normalizedQuery ? setSearchQuery('') : setIsAddModalOpen(true)
                    }
                    className="mt-5 text-primary text-sm font-bold hover:underline"
                  >
                    {normalizedQuery ? 'Limpar filtro de busca' : 'Adicionar seu primeiro bias'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredBiases.map((bias) => (
                    <motion.div
                      key={bias.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedBias(bias)}
                      className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-outline-variant/20 cursor-pointer shadow-lg hover:border-primary/40 transition-all bg-surface-container-high"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bias.image}
                        alt={bias.name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = buildFallbackBiasAvatar(bias.name);
                          if (target.src !== fallback) target.src = fallback;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-between p-4">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-[9px] font-headline font-bold uppercase tracking-wider text-secondary border border-secondary/30">
                            {bias.group || 'Solo'}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remover ${bias.name}`}
                            onClick={(e) => void removeBias(bias.id, e)}
                            className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <p className="text-white font-headline font-black text-xl uppercase tracking-tight">
                            {bias.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <p className="text-secondary text-[10px] font-bold uppercase tracking-widest truncate">
                              {bias.trendingSong || 'Ver Detalhes'}
                            </p>
                            <Info className="w-3 h-3 text-secondary shrink-0" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {currentView === 'assistant' && (
            <AiAssistantPanel
              biases={biases}
              aiConfigured={aiConfigured}
              initialPrompt={assistantInitialPrompt}
              onConsumeInitialPrompt={() => setAssistantInitialPrompt(null)}
            />
          )}

          {currentView === 'profile' && (
            <section className="space-y-6">
              <div className="glass-panel rounded-3xl p-8 border border-outline-variant/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-headline font-black text-2xl">
                      {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'N'}
                    </div>
                    <div>
                      <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
                        {currentUser?.isDemo ? 'Sessão Visitante / Portfólio' : 'Conta Autenticada Supabase'}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-headline font-black text-white">
                        {currentUser?.email || 'Usuário NOCTURNE'}
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {biases.length} {biases.length === 1 ? 'bias salvo' : 'biases salvos'} •{' '}
                        {likedIds.length} {likedIds.length === 1 ? 'artigo curtido' : 'artigos curtidos'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {currentUser?.isDemo && (
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-headline font-bold uppercase tracking-wider text-white transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar Biases Demo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-headline font-bold uppercase tracking-wider text-red-300 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Encerrar Sessão
                    </button>
                  </div>
                </div>
              </div>

              {/* Painel de Arquitetura AI Engineering */}
              <div className="glass-panel rounded-3xl p-8 border border-primary/20">
                <div className="flex items-center gap-2.5 mb-6">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-headline font-black uppercase tracking-tight text-white">
                    Arquitetura de Engenharia de IA
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-surface-container-high border border-white/10">
                    <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-primary mb-1">
                      Modelo & SDK Oficial
                    </p>
                    <p className="text-base font-headline font-bold text-white">
                      gemini-3.8-flash • @google/genai v2 (Interactions API)
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                      Execução 100% Server-Side em Route Handlers do Next.js, isolando a{' '}
                      <code>GEMINI_API_KEY</code> do navegador.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-container-high border border-white/10">
                    <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary mb-1">
                      Grounding Factual em Tempo Real
                    </p>
                    <p className="text-base font-headline font-bold text-white">
                      Google Search Tool + Citações Verificáveis
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                      Mitiga alucinações e corte de conhecimento ao buscar lançamentos atuais, agências e idade real diretamente na web.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-container-high border border-white/10">
                    <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-tertiary mb-1">
                      Structured Outputs & Validação Dupla
                    </p>
                    <p className="text-base font-headline font-bold text-white">
                      JSON Schema Nativo + Validação Zod
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                      Garante contratos determinísticos entre o LLM e o banco de dados PostgreSQL/Supabase com Row Level Security.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-container-high border border-white/10">
                    <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-emerald-400 mb-1">
                      Segurança & Estado Multi-Turn
                    </p>
                    <p className="text-base font-headline font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Guardrails Anti-Injection + SSE Streaming
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                      Rate limiting por IP, sanitização contra Prompt Injection e histórico stateful via{' '}
                      <code>previous_interaction_id</code>.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Barra Direita de Tendências */}
        <aside className="hidden xl:block w-80 shrink-0 sticky top-24 h-[calc(100vh-120px)]">
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/15">
              <h3 className="text-xs font-black tracking-widest uppercase text-on-surface-variant mb-4">
                Tópicos para Explorar com IA
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      askAiAboutTopic(
                        `Explique a tendência ${tag} no K-Pop atual e dê exemplos relacionados aos meus biases.`
                      )
                    }
                    className="px-3.5 py-2 rounded-full bg-surface-container text-[11px] font-bold text-white hover:bg-primary/20 hover:text-primary cursor-pointer transition-all border border-outline-variant/25"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/15">
              <h3 className="text-xs font-black tracking-widest uppercase text-on-surface-variant mb-5">
                Atividade da Comunidade
              </h3>
              <div className="space-y-5">
                {LIVE_ACTIVITIES.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${act.color}`}
                    >
                      {act.initial}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-snug">{act.text}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
                        {act.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal: Adicionar Novo Bias */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isValidating && setIsAddModalOpen(false)}
              className="absolute inset-0 bg-background/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-primary/25 shadow-[0_0_50px_rgba(223,142,255,0.12)]"
            >
              <button
                type="button"
                aria-label="Fechar modal"
                disabled={isValidating}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary mb-2">
                <Globe className="w-3 h-3" />
                Verificação Factual Gemini 3.8 Flash
              </span>
              <h3 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tighter mb-2 text-primary">
                Adicionar Seu Bias
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed mb-6">
                Digite apenas o nome do idol. A IA verifica se é um artista real de K-Pop no Google Search e preenche grupo, agência, idade, hit atual e bio automaticamente.
              </p>

              <form onSubmit={handleAddBias} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="bias-name-input"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-4 block"
                  >
                    Nome do Idol *
                  </label>
                  <input
                    id="bias-name-input"
                    required
                    maxLength={80}
                    value={newBiasName}
                    onChange={(e) => setNewBiasName(e.target.value)}
                    className="w-full bg-surface-container-low/60 border border-white/10 focus:border-primary/60 focus:outline-none rounded-full px-6 py-3.5 text-sm text-white"
                    placeholder="Ex: Winter, Hanni, Bang Chan, Taemin..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="bias-image-input"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-4 block"
                  >
                    URL da Foto (Opcional)
                  </label>
                  <input
                    id="bias-image-input"
                    type="url"
                    value={newBiasImage}
                    onChange={(e) => setNewBiasImage(e.target.value)}
                    className="w-full bg-surface-container-low/60 border border-white/10 focus:border-primary/60 focus:outline-none rounded-full px-6 py-3.5 text-sm text-white"
                    placeholder="https://images.unsplash.com/... (ou deixe em branco)"
                  />
                </div>

                {validationError && (
                  <p
                    role="alert"
                    className="text-red-300 text-xs font-semibold px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/25 leading-relaxed"
                  >
                    {validationError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isValidating}
                  className="w-full py-4 rounded-full bg-primary text-black font-headline font-bold uppercase text-xs md:text-sm tracking-tight hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span>Verificando no Google Search...</span>
                    </>
                  ) : (
                    'Validar e Salvar Bias'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Detalhes do Bias */}
      <AnimatePresence>
        {selectedBias && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBias(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              className="relative w-full max-w-4xl glass-panel rounded-3xl overflow-hidden border border-primary/25 shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden"
            >
              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSelectedBias(null)}
                className="absolute top-5 right-5 z-[120] p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full md:w-5/12 relative aspect-[4/5] md:aspect-auto overflow-hidden bg-surface-container-high">
                <div className="absolute inset-0 md:hidden bg-gradient-to-t from-background to-transparent z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedBias.image}
                  alt={selectedBias.name}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = buildFallbackBiasAvatar(selectedBias.name);
                    if (target.src !== fallback) target.src = fallback;
                  }}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full md:w-7/12 p-7 md:p-10 flex flex-col justify-center bg-surface-container-low/60 relative z-20 -mt-12 md:mt-0 overflow-y-auto">
                <p className="text-primary font-headline font-black text-xs uppercase tracking-[0.25em] mb-1">
                  {selectedBias.group || 'Artista Solo'}
                  {selectedBias.agency ? ` • ${selectedBias.agency}` : ''}
                </p>
                <h2 className="text-4xl md:text-5xl font-headline font-black text-white uppercase tracking-tighter leading-none mb-4">
                  {selectedBias.name}
                </h2>

                {selectedBias.bioSummary && (
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mb-6 border-l-2 border-secondary pl-3.5">
                    {selectedBias.bioSummary}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <DetailItem label="Nome Completo" value={selectedBias.fullName || 'Não informado'} />
                  <DetailItem label="Posição" value={selectedBias.position || 'Artista'} />
                  <DetailItem
                    label="Idade"
                    value={selectedBias.age ? `${selectedBias.age} anos` : 'Não informada'}
                  />
                  <DetailItem
                    label="Faixa em Destaque"
                    value={selectedBias.trendingSong || 'Single Oficial'}
                    highlight
                  />
                </div>

                {selectedBias.sources && selectedBias.sources.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                      <Globe className="w-3 h-3" />
                      Fontes Verificadas (Google Search)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBias.sources.map((src) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-secondary/20 border border-white/10 text-[11px] text-on-surface-variant hover:text-white transition-all"
                        >
                          <span className="truncate max-w-[160px]">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const query = `${selectedBias.name} ${selectedBias.trendingSong || ''} official mv`;
                      window.open(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
                        '_blank'
                      );
                    }}
                    className="flex-1 min-w-[160px] py-3.5 px-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-black font-headline font-black uppercase text-xs tracking-wider hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                  >
                    Assistir M/V no YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      askAiAboutTopic(
                        `Recomende 5 músicas e B-sides imperdíveis para quem tem ${selectedBias.name} (${selectedBias.group || 'K-Pop'}) como bias, e conte novidades recentes sobre sua carreira.`
                      )
                    }
                    className="flex-1 min-w-[160px] py-3.5 px-5 rounded-full bg-secondary/15 hover:bg-secondary/25 border border-secondary/35 text-secondary font-headline font-bold uppercase text-xs tracking-wider transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Recomendações IA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Leitura de Artigo Editorial */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-background/85 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden border border-white/15 shadow-2xl"
            >
              <button
                type="button"
                aria-label="Fechar artigo"
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/60 rounded-full text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative h-60 w-full">
                <Image
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              </div>
              <div className="p-8 -mt-8 relative z-10">
                <span className="px-3 py-1 bg-tertiary rounded-full text-[10px] font-black uppercase text-black">
                  {selectedArticle.badge}
                </span>
                <h3 className="text-2xl md:text-3xl font-headline font-black text-white mt-3 mb-4 leading-tight">
                  {selectedArticle.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                  {selectedArticle.fullText}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    askAiAboutTopic(
                      `Aprofunde o tema "${selectedArticle.title}" com exemplos reais recentes de grupos de K-Pop.`
                    )
                  }
                  className="px-6 py-3 rounded-full bg-secondary text-black font-headline font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:brightness-110 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Explorar Tema no Pulse IA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navegação Inferior Mobile */}
      <nav
        aria-label="Navegação inferior"
        className="md:hidden fixed bottom-5 left-5 right-5 h-16 glass-panel rounded-full flex items-center justify-around z-50 border border-white/15"
      >
        <button
          type="button"
          aria-label="Feed"
          onClick={() => navigateView('feed')}
          className="p-2"
        >
          <LayoutDashboard
            className={`w-5 h-5 ${
              currentView === 'feed' ? 'text-primary' : 'text-on-surface-variant'
            }`}
          />
        </button>
        <button
          type="button"
          aria-label="Galeria"
          onClick={() => navigateView('gallery')}
          className="p-2"
        >
          <ImageIcon
            className={`w-5 h-5 ${
              currentView === 'gallery' ? 'text-primary' : 'text-on-surface-variant'
            }`}
          />
        </button>
        <button
          type="button"
          aria-label="Pulse IA"
          onClick={() => navigateView('assistant')}
          className="p-2"
        >
          <Sparkles
            className={`w-5 h-5 ${
              currentView === 'assistant' ? 'text-secondary' : 'text-on-surface-variant'
            }`}
          />
        </button>
        <button
          type="button"
          aria-label="Perfil"
          onClick={() => navigateView('profile')}
          className="p-2"
        >
          <User
            className={`w-5 h-5 ${
              currentView === 'profile' ? 'text-primary' : 'text-on-surface-variant'
            }`}
          />
        </button>
      </nav>
    </div>
  );
}

function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
        {label}
      </span>
      <span
        className={`text-base md:text-lg font-headline font-bold uppercase ${
          highlight ? 'text-secondary italic' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
