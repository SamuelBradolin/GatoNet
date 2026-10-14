export interface TestChannel {
  id: string;
  name: string;
  category: 'Abertos' | 'Esportes' | 'Notícias' | 'Desenhos' | 'Documentários' | string;
  quality: string;
  streamUrl: string;
  description?: string;
  logoUrl?: string;
  active: boolean;
  tickerText?: string;
  tickerEnabled?: boolean;
}

export const DEFAULT_CHANNELS: TestChannel[] = [
  {
    id: 'abertos-01',
    name: 'Canais Abertos Nacionais HD',
    category: 'Abertos',
    quality: '1080p FHD',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'Transmissão de demonstração para validação de canais abertos e estabilidade de sinal.',
    active: true,
    tickerText: '🔴 AO VIVO: Grade nacional completa em 1080p FHD • Servidor sem travamentos • Teste instantâneo 24h',
    tickerEnabled: true,
  },
  {
    id: 'esportes-01',
    name: 'Canal Esportes Demo 60FPS',
    category: 'Esportes',
    quality: '4K Ultra HD',
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/200034/test/master.m3u8',
    description: 'Fluxo em alta taxa de quadros (60fps) otimizado para transmissões de futebol e lutas.',
    active: true,
    tickerText: '⚽ FUTEBOL AO VIVO: Rodada dos campeonatos europeus e estaduais com taxa de 60 FPS • Transmissão em 4K Ultra HD',
    tickerEnabled: true,
  },
  {
    id: 'noticias-01',
    name: 'Notícias & Plantão 24 Horas',
    category: 'Notícias',
    quality: '1080p FHD',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    description: 'Transmissão contínua para simulação de plantões jornalísticos e variedades.',
    active: true,
    tickerText: '📰 PLANTÃO DE NOTÍCIAS 24H: Cobertura em tempo real dos principais fatos do Brasil e do Mundo • Alta definição',
    tickerEnabled: true,
  },
  {
    id: 'desenhos-01',
    name: 'Desenhos & Conteúdo Kids',
    category: 'Desenhos',
    quality: '1080p FHD',
    streamUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    description: 'Grade de desenhos animados infantis com áudio e vídeo de alta fidelidade.',
    active: true,
    tickerText: '🎨 KIDS & ANIMAÇÕES: Programação infantil livre com alta qualidade de áudio e vídeo • Diversão para toda a família',
    tickerEnabled: false,
  },
  {
    id: 'documentarios-01',
    name: 'Documentários & Natureza',
    category: 'Documentários',
    quality: '4K Ultra HD',
    streamUrl: 'https://playertest.longtailvideo.com/adaptive/oceans/oceans.m3u8',
    description: 'Imagens de fauna e paisagens em altíssima resolução para teste de taxa de bits.',
    active: true,
    tickerText: '🌿 NATUREZA & CIÊNCIA: Expedições globais e vida selvagem em 4K Ultra HD • Cores e definição cinematográfica',
    tickerEnabled: false,
  },
];

export interface CustomCard {
  id: string;
  badge?: string; // Ex: 'Odds 2.45', 'Bilhete Pronto', 'Green Garantido', 'Super Cotação'
  title: string;
  description: string;
  highlightText?: string; // Ex: 'Retorno 3.80x' ou 'Odd 1.95'
  imageUrl?: string; // Imagem do Card (upload ou URL)
  buttonText?: string; // Ex: 'Acessar Bilhete', 'Ver Palpite', 'Copiar Código'
  linkUrl?: string; // Ex: link de aposta ou canal
  themeColor?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'blue';
  active: boolean;
}

export type BannerPositionId =
  | 'top_player'
  | 'header_beside_logo'
  | 'below_player'
  | 'above_channels'
  | 'below_channels';

export type BannerContentType = 'image' | 'script';

export interface SiteBannerItem {
  id: BannerPositionId;
  name: string;
  descriptionHelp?: string;
  enabled: boolean;
  contentType: BannerContentType;
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  scriptCode?: string;
  refreshIntervalSeconds?: number; // Tempo de Rotação do Anúncio (em segundos)
}

export const BANNER_POSITIONS: { id: BannerPositionId; name: string; descriptionHelp: string }[] = [
  {
    id: 'top_player',
    name: '1. Topo do Player de Vídeo (O espaço atual)',
    descriptionHelp: 'Localizado logo acima da área de vídeo/apresentação na seção Início.',
  },
  {
    id: 'header_beside_logo',
    name: '2. Ao lado do Nome do Site (No cabeçalho/topo do site)',
    descriptionHelp: 'Localizado no topo do site (navbar), ao lado da marca Gato Net.',
  },
  {
    id: 'below_player',
    name: '3. Abaixo do Player de Vídeo',
    descriptionHelp: 'Localizado diretamente abaixo do reprodutor de vídeo / texto de apresentação.',
  },
  {
    id: 'above_channels',
    name: '4. Acima da lista de Jogos De Hoje',
    descriptionHelp: 'Localizado no topo da coluna lateral de Jogos De Hoje.',
  },
  {
    id: 'below_channels',
    name: '5. Abaixo da lista de Jogos De Hoje',
    descriptionHelp: 'Localizado no rodapé da coluna lateral de Jogos De Hoje.',
  },
];

export const createDefaultBanners = (): Record<BannerPositionId, SiteBannerItem> => ({
  top_player: {
    id: 'top_player',
    name: '1. Topo do Player de Vídeo (O espaço atual)',
    descriptionHelp: 'Localizado logo acima da área de vídeo/apresentação na seção Início.',
    enabled: true,
    contentType: 'image',
    imageUrl: '',
    linkUrl: '',
    altText: 'Banner Topo do Player',
    scriptCode: '',
    refreshIntervalSeconds: 60,
  },
  header_beside_logo: {
    id: 'header_beside_logo',
    name: '2. Ao lado do Nome do Site (No cabeçalho/topo do site)',
    descriptionHelp: 'Localizado no topo do site (navbar), ao lado da marca Gato Net.',
    enabled: false,
    contentType: 'image',
    imageUrl: '',
    linkUrl: '',
    altText: 'Banner Cabeçalho',
    scriptCode: '',
    refreshIntervalSeconds: 60,
  },
  below_player: {
    id: 'below_player',
    name: '3. Abaixo do Player de Vídeo',
    descriptionHelp: 'Localizado diretamente abaixo do reprodutor de vídeo / texto de apresentação.',
    enabled: false,
    contentType: 'image',
    imageUrl: '',
    linkUrl: '',
    altText: 'Banner Abaixo do Player',
    scriptCode: '',
    refreshIntervalSeconds: 60,
  },
  above_channels: {
    id: 'above_channels',
    name: '4. Acima da lista de Jogos De Hoje',
    descriptionHelp: 'Localizado no topo da coluna lateral de Jogos De Hoje.',
    enabled: false,
    contentType: 'image',
    imageUrl: '',
    linkUrl: '',
    altText: 'Banner Acima dos Canais',
    scriptCode: '',
    refreshIntervalSeconds: 60,
  },
  below_channels: {
    id: 'below_channels',
    name: '5. Abaixo da lista de Jogos De Hoje',
    descriptionHelp: 'Localizado no rodapé da coluna lateral de Jogos De Hoje.',
    enabled: false,
    contentType: 'image',
    imageUrl: '',
    linkUrl: '',
    altText: 'Banner Abaixo dos Canais',
    scriptCode: '',
    refreshIntervalSeconds: 60,
  },
});

export interface SponsorConfig {
  tagline: string;
  description: string;
  bannerImageUrl: string;
  bannerLinkUrl?: string;
  bannerAltText?: string;
  cards: CustomCard[];
  inPlayScript?: string; // Código do Script de Anúncio In-Play para exibição no player
  inPlayInitialDelaySeconds?: number; // Tempo para a primeira exibição após iniciar o player (padrão: 30 segundos)
  inPlayIntervalMinutes?: number; // Intervalo periódico entre exibições durante a transmissão ativa (padrão: 8 minutos)
  inPlayDurationSeconds?: number; // Duração de exibição antes do efeito fade-out (padrão: 5 segundos)
  banners?: Record<BannerPositionId, SiteBannerItem>; // Gerenciador Geral de Banners do Site
}

export const DEFAULT_SPONSOR_CONFIG: SponsorConfig = {
  tagline: 'Parceiro Oficial & Patrocinador Exclusivo',
  description:
    'Queremos que você comprove a estabilidade e a alta definição da nossa transmissão antes de tomar qualquer decisão. Clique nos botões de Play ao lado para assistir à demonstração em tempo real diretamente nesta página, ou baixe a lista gratuita em formato .m3u para abrir no seu reprodutor.',
  bannerImageUrl: '',
  bannerLinkUrl: '',
  bannerAltText: 'Banner do Patrocinador Oficial',
  inPlayScript: '', // Vazio por padrão: exibe a imagem cinza de teste temporária
  inPlayInitialDelaySeconds: 30, // 30 segundos após o player iniciar
  inPlayIntervalMinutes: 8, // A cada 8 minutos de transmissão ativa
  inPlayDurationSeconds: 5, // 5 segundos visível antes do fade-out
  banners: createDefaultBanners(),
  cards: [
    {
      id: 'card-1',
      badge: 'Bilhete Pronto 🔥',
      title: 'Múltipla dos Campeões',
      description: 'Seleção especial com 3 jogos de futebol europeu e alta probabilidade de retorno.',
      highlightText: 'Odd Total: 3.45',
      buttonText: 'Acessar Palpite',
      linkUrl: '#',
      themeColor: 'emerald',
      active: true,
    },
    {
      id: 'card-2',
      badge: 'Super Odds ⚡',
      title: 'Duelo dos Gigantes',
      description: 'Cotação turbinada para o clássico deste fim de semana com bônus de boas-vindas.',
      highlightText: 'Odd Especial: 2.80',
      buttonText: 'Ver Cotação',
      linkUrl: '#',
      themeColor: 'amber',
      active: true,
    },
  ],
};
