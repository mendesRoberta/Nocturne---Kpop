export interface EditorialArticle {
  id: string;
  badge: string;
  title: string;
  summary: string;
  fullText: string;
  meta: string;
  image: string;
  tags: string[];
  initialLikes: number;
}

export interface UpcomingDrop {
  id: string;
  date: string;
  artist: string;
  title: string;
  type: string;
  image: string;
}

export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: 'art-aespa-cyber',
    badge: 'Em Alta Agora',
    title: 'Estética Neo-Cyber no K-Pop: Como a 4ª e 5ª Geração Redefiniram o Pop Global',
    summary:
      'Sintetizadores industriais, direção criativa futurista e conceitos imersivos transformaram os últimos comebacks em verdadeiras experiências audiovisuais.',
    fullText:
      'Nos últimos anos, grupos como aespa, Stray Kids e XG elevaram a barra de produção audiovisual da indústria sul-coreana. Combinando sonoridades de hyperpop, drum & bass e UK garage com narrativas visuais dignas de cinema sci-fi, o K-Pop consolidou-se como laboratório de vanguarda estética global.',
    meta: 'Há 8 min • Editorial Musical',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    tags: ['#CYBER_CONCEPT', '#KPOP_5GEN', '#PRODUCAO'],
    initialLikes: 248,
  },
  {
    id: 'art-choreo-camp',
    badge: 'Bastidores Exclusivos',
    title: 'Dentro dos Ensaios de Turnê Mundial: 14 Horas de Precisão Coreográfica em Seul',
    summary:
      'Diretores de performance revelam a preparação física, arranjos de banda ao vivo e design de iluminação para arenas esgotadas.',
    fullText:
      'A transição de coreografias pensadas para câmeras de programas musicais para estádios com mais de 50 mil fãs exige semanas de rearranjo espacial. Conversamos com coreógrafos em Seul sobre como o uso de arranjos com banda ao vivo e passarelas 360° mudou a dinâmica dos shows recentes.',
    meta: 'Há 24 min • Bastidores',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
    tags: ['#WORLD_TOUR', '#CHOREOGRAPHY', '#SEOUL'],
    initialLikes: 192,
  },
];

export const UPCOMING_DROPS: UpcomingDrop[] = [
  {
    id: 'drop-1',
    date: '14 Nov',
    artist: 'aespa',
    title: 'Midnight Protocol',
    type: 'Mini Álbum • Conceito Digital',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'drop-2',
    date: '21 Nov',
    artist: 'Stray Kids',
    title: 'Velocity Era (Special Mix)',
    type: 'Single Digital',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'drop-3',
    date: '28 Nov',
    artist: 'LE SSERAFIM',
    title: 'Crimson Horizon',
    type: 'EP • 5 Faixas',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'drop-4',
    date: '05 Dez',
    artist: 'LISA',
    title: 'Neon Mirage (Live Session)',
    type: 'Performance Especial',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'drop-5',
    date: '12 Dez',
    artist: 'ATEEZ',
    title: 'Golden Hour: Epilogue',
    type: 'Full Album (LP)',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=500&q=80',
  },
];

export const TRENDING_TAGS = [
  '#COMEBACK_RADAR',
  '#WORLD_TOUR',
  '#CYBER_CONCEPT',
  '#BSIDES_ESSENCIAIS',
  '#VOCAL_LINE',
];

export const LIVE_ACTIVITIES = [
  {
    initial: 'R',
    text: ' Marina validou KARINA via Gemini Grounding',
    time: 'Há 2 min',
    color: 'bg-primary/20 text-primary',
  },
  {
    initial: 'L',
    text: 'Lucas gerou playlist personalizada no Pulse IA',
    time: 'Há 6 min',
    color: 'bg-secondary/20 text-secondary',
  },
  {
    initial: 'K',
    text: 'K-Editorial atualizou radar de turnês em Seul',
    time: 'Há 14 min',
    color: 'bg-tertiary/20 text-tertiary',
  },
];

