import { 
  TestChannel, 
  DEFAULT_CHANNELS, 
  SponsorConfig, 
  DEFAULT_SPONSOR_CONFIG, 
  createDefaultBanners, 
  BannerPositionId, 
  SiteBannerItem 
} from '../types/channel.ts';

const STORAGE_KEY = 'brado_iptv_test_channels_v2';
const ADMIN_PIN_KEY = 'brado_iptv_admin_pin';

export const getStoredChannels = (): TestChannel[] => {
  if (typeof window === 'undefined') return DEFAULT_CHANNELS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHANNELS));
      return DEFAULT_CHANNELS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((ch: TestChannel) => {
        const defaultMatch = DEFAULT_CHANNELS.find((d) => d.id === ch.id);
        return {
          ...ch,
          tickerText: ch.tickerText !== undefined ? ch.tickerText : (defaultMatch?.tickerText || ''),
          tickerEnabled: ch.tickerEnabled !== undefined ? ch.tickerEnabled : (defaultMatch?.tickerEnabled ?? false),
        };
      });
    }
  } catch (err) {
    console.error('Erro ao ler canais do localStorage:', err);
  }
  return DEFAULT_CHANNELS;
};

/**
 * Salva os canais no localStorage e envia para o backend (/api/channels)
 * para que o proxy do servidor saiba as URLs reais mapeadas aos IDs.
 */
export const saveStoredChannels = async (channels: TestChannel[]): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  // Sincroniza com o backend do servidor (persistindo no banco de dados MySQL/MariaDB)
  const res = await fetch('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channels),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.details || errData.error || `Erro HTTP ${res.status} ao gravar canais`;
    console.error('❌ Falha ao salvar canais no banco de dados:', errMsg);
    throw new Error(errMsg);
  }

  // Apenas grava no localStorage local se a gravação no banco de dados foi 100% bem-sucedida
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  window.dispatchEvent(new Event('brado_channels_updated'));
  return true;
};

export const resetStoredChannels = (): TestChannel[] => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHANNELS));
    window.dispatchEvent(new Event('brado_channels_updated'));

    fetch('/api/channels/reset', { method: 'POST' }).catch(() => {});
  }
  return DEFAULT_CHANNELS;
};

/**
 * Sincroniza os canais do backend com o front-end ao inicializar
 */
export const syncChannelsWithBackend = async (): Promise<TestChannel[]> => {
  try {
    const res = await fetch('/api/channels');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new Event('brado_channels_updated'));
        return data;
      }
    }
  } catch {
    // Se falhar o fetch, usa os canais locais
  }
  return getStoredChannels();
};

export const getAdminPin = (): string => {
  if (typeof window === 'undefined') return 'admin123';
  return localStorage.getItem(ADMIN_PIN_KEY) || 'admin123';
};

export const setAdminPin = (newPin: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_PIN_KEY, newPin);
  }
};

/**
 * Gera o conteúdo M3U compatível com players externos baseado nos canais configurados
 */
export const generateM3UContent = (channels: TestChannel[]): string => {
  let content = `#EXTM3U
#PLAYLIST: Gato Net - Lista de Teste Gratuito
#DESCRIPTION: Versao demonstrativa com canais de teste para validacao de conectividade e compatibilidade.

`;

  channels
    .filter((c) => c.active)
    .forEach((channel) => {
      const sanitizedId = channel.id.toLowerCase().replace(/[^a-z0-9]/g, '.');
      content += `#EXTINF:-1 tvg-id="${sanitizedId}" tvg-name="${channel.name}" group-title="[TESTE] ${channel.category}",${channel.name} (${channel.quality})
${channel.streamUrl}

`;
    });

  return content;
};

// --- CONFIGURAÇÃO DO PATROCINADOR & CARDS PERSONALIZADOS ---
const SPONSOR_STORAGE_KEY = 'brado_iptv_sponsor_config_v1';

export const getStoredSponsorConfig = (): SponsorConfig => {
  if (typeof window === 'undefined') return DEFAULT_SPONSOR_CONFIG;
  try {
    const raw = localStorage.getItem(SPONSOR_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(DEFAULT_SPONSOR_CONFIG));
      return DEFAULT_SPONSOR_CONFIG;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const defaultBanners = createDefaultBanners();
      const existingBanners = parsed.banners && typeof parsed.banners === 'object' ? parsed.banners : {};
      
      const mergedBanners: Record<BannerPositionId, SiteBannerItem> = {
        top_player: {
          ...defaultBanners.top_player,
          ...(existingBanners.top_player || {}),
          refreshIntervalSeconds: Number(existingBanners.top_player?.refreshIntervalSeconds) > 0 
            ? Number(existingBanners.top_player.refreshIntervalSeconds) 
            : 60,
        },
        header_beside_logo: {
          ...defaultBanners.header_beside_logo,
          ...(existingBanners.header_beside_logo || {}),
          refreshIntervalSeconds: Number(existingBanners.header_beside_logo?.refreshIntervalSeconds) > 0 
            ? Number(existingBanners.header_beside_logo.refreshIntervalSeconds) 
            : 60,
        },
        below_player: {
          ...defaultBanners.below_player,
          ...(existingBanners.below_player || {}),
          refreshIntervalSeconds: Number(existingBanners.below_player?.refreshIntervalSeconds) > 0 
            ? Number(existingBanners.below_player.refreshIntervalSeconds) 
            : 60,
        },
        above_channels: {
          ...defaultBanners.above_channels,
          ...(existingBanners.above_channels || {}),
          refreshIntervalSeconds: Number(existingBanners.above_channels?.refreshIntervalSeconds) > 0 
            ? Number(existingBanners.above_channels.refreshIntervalSeconds) 
            : 60,
        },
        below_channels: {
          ...defaultBanners.below_channels,
          ...(existingBanners.below_channels || {}),
          refreshIntervalSeconds: Number(existingBanners.below_channels?.refreshIntervalSeconds) > 0 
            ? Number(existingBanners.below_channels.refreshIntervalSeconds) 
            : 60,
        },
      };

      // Se havia um banner configurado antigamente na raiz, sincroniza com top_player caso este não tenha imagem própria
      if (parsed.bannerImageUrl && !mergedBanners.top_player.imageUrl) {
        mergedBanners.top_player.imageUrl = parsed.bannerImageUrl;
        mergedBanners.top_player.linkUrl = parsed.bannerLinkUrl || '';
        mergedBanners.top_player.altText = parsed.bannerAltText || 'Banner Topo do Player';
      }

      return {
        ...DEFAULT_SPONSOR_CONFIG,
        ...parsed,
        inPlayScript: parsed.inPlayScript !== undefined ? parsed.inPlayScript : (DEFAULT_SPONSOR_CONFIG.inPlayScript || ''),
        inPlayInitialDelaySeconds:
          typeof parsed.inPlayInitialDelaySeconds === 'number' && parsed.inPlayInitialDelaySeconds >= 0
            ? parsed.inPlayInitialDelaySeconds
            : DEFAULT_SPONSOR_CONFIG.inPlayInitialDelaySeconds,
        inPlayIntervalMinutes:
          typeof parsed.inPlayIntervalMinutes === 'number' && parsed.inPlayIntervalMinutes > 0
            ? parsed.inPlayIntervalMinutes
            : DEFAULT_SPONSOR_CONFIG.inPlayIntervalMinutes,
        inPlayDurationSeconds:
          typeof parsed.inPlayDurationSeconds === 'number' && parsed.inPlayDurationSeconds > 0
            ? parsed.inPlayDurationSeconds
            : DEFAULT_SPONSOR_CONFIG.inPlayDurationSeconds,
        banners: mergedBanners,
        cards: Array.isArray(parsed.cards) ? parsed.cards : DEFAULT_SPONSOR_CONFIG.cards,
      };
    }
  } catch (err) {
    console.error('Erro ao ler sponsor config:', err);
  }
  return DEFAULT_SPONSOR_CONFIG;
};

export const getStoredInPlayScript = (): string => {
  const config = getStoredSponsorConfig();
  return config.inPlayScript || '';
};

export const saveStoredInPlayScript = (script: string): void => {
  const current = getStoredSponsorConfig();
  current.inPlayScript = script;
  saveStoredSponsorConfig(current);
};

export const saveStoredSponsorConfig = async (config: SponsorConfig): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const res = await fetch('/api/sponsor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.details || errData.error || `Erro HTTP ${res.status} ao gravar banners/patrocinador`;
    console.error('❌ Falha ao salvar patrocinador no banco de dados:', errMsg);
    throw new Error(errMsg);
  }

  // Apenas grava no localStorage local se a gravação no banco de dados foi 100% bem-sucedida
  localStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('brado_sponsor_updated'));
  return true;
};

export const resetStoredSponsorConfig = (): SponsorConfig => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(DEFAULT_SPONSOR_CONFIG));
    window.dispatchEvent(new Event('brado_sponsor_updated'));

    fetch('/api/sponsor/reset', { method: 'POST' }).catch(() => {});
  }
  return DEFAULT_SPONSOR_CONFIG;
};

export const syncSponsorWithBackend = async (): Promise<SponsorConfig> => {
  try {
    const res = await fetch('/api/sponsor');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        localStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new Event('brado_sponsor_updated'));
        return data;
      }
    }
  } catch {}
  return getStoredSponsorConfig();
};

/**
 * Consulta a API do backend na inicialização da aplicação para carregar
 * os canais e banners ativos diretamente do banco de dados definitivo.
 */
export const syncAllFromDatabase = async (): Promise<{ channels: TestChannel[]; sponsor: SponsorConfig }> => {
  try {
    const [channels, sponsor] = await Promise.all([
      syncChannelsWithBackend(),
      syncSponsorWithBackend(),
    ]);
    return { channels, sponsor };
  } catch (err) {
    console.warn('[DB] Fallback para storage local na inicialização:', err);
    return {
      channels: getStoredChannels(),
      sponsor: getStoredSponsorConfig(),
    };
  }
};
