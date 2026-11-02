import type { BiasDetails } from './types';

export const DEMO_SESSION_KEY = 'nocturne_demo_mode';
export const DEMO_BIASES_KEY = 'nocturne_demo_biases_v1';
export const DEMO_LIKES_KEY = 'nocturne_liked_items_v1';

export const INITIAL_DEMO_BIASES: BiasDetails[] = [
  {
    id: 'demo-lisa',
    name: 'LISA',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    fullName: 'Lalisa Manobal',
    group: 'BLACKPINK / Solo (LLOUD)',
    age: 29,
    trendingSong: 'Rockstar / Born Again',
    position: 'Main Dancer, Lead Rapper, Sub-Vocalist',
    agency: 'LLOUD / YG Entertainment',
    bioSummary:
      'Ícone global tailandesa do BLACKPINK e fundadora da LLOUD, reconhecida por performances de alto impacto, recordes solo internacionais e presença editorial na moda.',
  },
  {
    id: 'demo-jungkook',
    name: 'JUNGKOOK',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    fullName: 'Jeon Jung-kook',
    group: 'BTS',
    age: 29,
    trendingSong: 'Standing Next to You / Seven',
    position: 'Main Vocalist, Lead Dancer, Center',
    agency: 'BIGHIT MUSIC (HYBE)',
    bioSummary:
      'Conhecido como "Golden Maknae" do BTS, consolidou carreira solo histórica no pop global com o álbum GOLDEN no topo das paradas mundiais.',
  },
  {
    id: 'demo-karina',
    name: 'KARINA',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    fullName: 'Yu Ji-min',
    group: 'aespa',
    age: 26,
    trendingSong: 'UP (Solo) / Whiplash',
    position: 'Leader, Main Dancer, Lead Rapper, Sub-Vocalist',
    agency: 'SM Entertainment',
    bioSummary:
      'Líder do aespa, referência estética futurista da 4ª geração do K-Pop, combinando conceitos cyberpunk/hyperpop com domínio de palco e hits virais.',
  },
  {
    id: 'demo-felix',
    name: 'FELIX',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    fullName: 'Lee Yong-bok',
    group: 'Stray Kids',
    age: 26,
    trendingSong: 'Chk Chk Boom / Unfair',
    position: 'Dancer, Rapper, Vocalist (DanceRACHA)',
    agency: 'JYP Entertainment',
    bioSummary:
      'Integrante australiano-coreano do Stray Kids famoso pelo timbre grave inconfundível, carisma intenso de palco e protagonismo em passarelas da alta-costura.',
  },
];

export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEMO_SESSION_KEY) === 'true';
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(DEMO_SESSION_KEY, 'true');
  } else {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
  }
}

export function loadDemoBiases(): BiasDetails[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_BIASES;
  try {
    const raw = window.localStorage.getItem(DEMO_BIASES_KEY);
    if (!raw) {
      window.localStorage.setItem(DEMO_BIASES_KEY, JSON.stringify(INITIAL_DEMO_BIASES));
      return INITIAL_DEMO_BIASES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_BIASES;
  } catch {
    return INITIAL_DEMO_BIASES;
  }
}

export function saveDemoBiases(biases: BiasDetails[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_BIASES_KEY, JSON.stringify(biases));
  } catch (err) {
    console.error('Erro ao salvar dados no localStorage:', err);
  }
}

export function resetDemoBiases(): BiasDetails[] {
  saveDemoBiases(INITIAL_DEMO_BIASES);
  return INITIAL_DEMO_BIASES;
}

export function buildFallbackBiasAvatar(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase() || 'kpop-stage');
  return `https://picsum.photos/seed/${seed}/800/800`;
}

