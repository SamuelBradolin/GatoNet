import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Tv, 
  Link as LinkIcon, 
  KeyRound, 
  FileCode, 
  Sparkles, 
  HelpCircle,
  Eye,
  ShieldCheck,
  Image,
  Upload,
  Flame,
  ExternalLink,
  Tag,
  Code,
  Layers,
  Globe,
  Check,
  RefreshCw,
  Clock,
  Users,
  Activity,
  BarChart3,
  Radio
} from 'lucide-react';
import { 
  TestChannel, 
  SponsorConfig, 
  CustomCard, 
  DEFAULT_SPONSOR_CONFIG,
  BannerPositionId,
  BANNER_POSITIONS,
  SiteBannerItem,
  BannerContentType,
  createDefaultBanners
} from '../types/channel.ts';
import { 
  getStoredChannels, 
  saveStoredChannels, 
  resetStoredChannels, 
  getStoredSponsorConfig,
  saveStoredSponsorConfig,
  resetStoredSponsorConfig,
  getAdminPin, 
  setAdminPin 
} from '../utils/channelStorage.ts';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewChannel?: (channel: TestChannel) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onPreviewChannel,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [channels, setChannels] = useState<TestChannel[]>([]);
  const [sponsorConfig, setSponsorConfig] = useState<SponsorConfig>(DEFAULT_SPONSOR_CONFIG);
  const [selectedBannerPosition, setSelectedBannerPosition] = useState<BannerPositionId>('top_player');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'sponsor' | 'audience' | 'settings'>('channels');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Monitor de Audiência em Tempo Real
  const [liveStats, setLiveStats] = useState<{
    totalOnlineUsers: number;
    totalWatchingChannels: number;
    activeChannelsCount: number;
    channels: Array<{
      playerIndex: number;
      id: string;
      name: string;
      category: string;
      quality: string;
      active: boolean;
      streamUrl: string;
      watchingNow: number;
      hasActiveMultiplexerStream: boolean;
      multiplexerClientsSize: number;
    }>;
    multiplexerStats?: {
      activeContinuousStreams: number;
      cachedStreamsOrSegments: number;
    };
    timestamp: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null);

  // Settings tab states
  const [newPin, setNewPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  const fetchLiveStats = async () => {
    setIsLoadingStats(true);
    try {
      const pin = 'Mais@0917';
      const res = await fetch('/admin/api/live-stats', {
        headers: {
          'x-admin-pin': pin,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data);
        setLastStatsUpdate(new Date());
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas de audiência:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // JavaScript: setInterval rodando a cada 5 minutos (300.000 ms) para atualizar automaticamente as estatísticas
  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    fetchLiveStats();

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      fetchLiveStats();
    }, FIVE_MINUTES_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, isOpen]);

  // Load channels and sponsor config whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setChannels(getStoredChannels());
      setSponsorConfig(getStoredSponsorConfig());
      setSaveSuccess(false);
      setLoginError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAdminPin = getAdminPin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = usernameInput.trim().toLowerCase() === 'samuel';
    const validPassword = passwordInput === 'Mais@0917' || passwordInput === currentAdminPin;

    if (validUser && validPassword) {
      setIsAuthenticated(true);
      setLoginError(false);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError(true);
    }
  };

  const handleChannelChange = (
    index: number,
    field: keyof TestChannel,
    value: string | boolean
  ) => {
    const updated = [...channels];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setChannels(updated);
    // Salva imediatamente no localStorage e sincroniza em tempo real com o Player
    saveStoredChannels(updated);
  };

  const handleAddNewChannel = () => {
    const newChan: TestChannel = {
      id: `canal-${Date.now()}`,
      name: `Novo Canal ${channels.length + 1}`,
      category: 'Abertos',
      quality: '1080p FHD',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      description: 'Canal de teste adicionado pelo administrador.',
      active: true,
      tickerText: '🔴 AO VIVO: Informações e notícias em tempo real sobre a transmissão deste canal.',
      tickerEnabled: true,
    };
    const updated = [...channels, newChan];
    setChannels(updated);
    saveStoredChannels(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteChannel = (index: number) => {
    const updated = channels.filter((_, i) => i !== index);
    setChannels(updated);
    saveStoredChannels(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Funções de gerenciamento dos Banners do Site, Patrocinador e Cards
  const handleUpdateBanner = (posId: BannerPositionId, updates: Partial<SiteBannerItem>) => {
    setSponsorConfig((prev) => {
      const defBanners = createDefaultBanners();
      const existingBanners = prev.banners || defBanners;
      const target = existingBanners[posId] || defBanners[posId];
      const updatedBanner: SiteBannerItem = {
        ...target,
        ...updates,
      };
      const nextBanners = {
        ...existingBanners,
        [posId]: updatedBanner,
      };
      return {
        ...prev,
        banners: nextBanners,
        ...(posId === 'top_player' ? {
          bannerImageUrl: updatedBanner.imageUrl || '',
          bannerLinkUrl: updatedBanner.linkUrl || '',
          bannerAltText: updatedBanner.altText || prev.bannerAltText,
        } : {}),
      };
    });
  };

    // Utilitário para redimensionar e comprimir imagens grandes antes de converter em Base64
  const compressImageFile = (
    file: File,
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.85
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      const img = new (window as any).Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressImageFile(file, 1280, 720, 0.85);
      if (result) {
        handleUpdateBanner(selectedBannerPosition, { imageUrl: result });
      }
    } catch (err) {
      console.error('Erro ao processar imagem de banner:', err);
    }
  };

  const handleCardChange = (cardIndex: number, field: keyof CustomCard, value: any) => {
    const updatedCards = [...(sponsorConfig.cards || [])];
    updatedCards[cardIndex] = {
      ...updatedCards[cardIndex],
      [field]: value,
    };
    setSponsorConfig((prev) => ({
      ...prev,
      cards: updatedCards,
    }));
  };

  const handleCardImageUpload = async (cardIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressImageFile(file, 800, 600, 0.82);
      if (result) {
        handleCardChange(cardIndex, 'imageUrl', result);
      }
    } catch (err) {
      console.error('Erro ao processar imagem de card:', err);
    }
  };

  const handleAddNewCard = () => {
    const newCard: CustomCard = {
      id: `card-${Date.now()}`,
      badge: 'Bilhete Pronto 🔥',
      title: 'Nova Oportunidade',
      description: 'Preencha a descrição, palpites, odds ou detalhes deste card.',
      highlightText: 'Odd 2.50',
      buttonText: 'Acessar Bilhete',
      linkUrl: 'https://',
      themeColor: 'emerald',
      active: true,
    };
    setSponsorConfig((prev) => ({
      ...prev,
      cards: [...(prev.cards || []), newCard],
    }));
  };

  const handleDeleteCard = (cardIndex: number) => {
    const updatedCards = (sponsorConfig.cards || []).filter((_, i) => i !== cardIndex);
    setSponsorConfig((prev) => ({
      ...prev,
      cards: updatedCards,
    }));
  };

  const handleSaveAll = () => {
    saveStoredChannels(channels);
    saveStoredSponsorConfig(sponsorConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (activeTab === 'channels') {
      const res = resetStoredChannels();
      setChannels(res);
    } else if (activeTab === 'sponsor') {
      const res = resetStoredSponsorConfig();
      setSponsorConfig(res);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length >= 4) {
      setAdminPin(newPin.trim());
      setPinChangeSuccess(true);
      setNewPin('');
      setTimeout(() => setPinChangeSuccess(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl shadow-purple-950/40 text-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Admin Header */}
        <div className="relative flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/80 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Lock className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="admin-title" className="text-lg font-bold text-white tracking-tight">
                  Painel Administrativo
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Gestão de Streams / IPTV
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Configure os nomes e links de transmissão (M3U8, Xtream Codes, TS ou MP4) de cada botão de teste
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={() => setIsAuthenticated(false)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                title="Bloquear Painel"
              >
                Bloquear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Fechar Painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isAuthenticated ? (
          /* Authentication Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950/50">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-xl font-bold text-white">Acesso Restrito ao Painel</h4>
              <p className="text-xs text-zinc-400">
                Informe as credenciais de administrador para acessar o gerenciamento de canais e anúncios.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Usuário:
                </label>
                <input
                  type="text"
                  placeholder="Nome de usuário..."
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setLoginError(false);
                  }}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Senha:
                </label>
                <input
                  type="password"
                  placeholder="Senha de acesso..."
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError(false);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                />
                {loginError && (
                  <p className="text-xs text-rose-400 font-medium pt-1">
                    Usuário ou senha incorretos. Tente novamente.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Unlock className="w-4 h-4" />
                Desbloquear Painel
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'channels'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  Canais de Teste ({channels.length})
                </button>
                <button
                  onClick={() => setActiveTab('sponsor')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'sponsor'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Patrocinador & Cards ({sponsorConfig.cards?.length || 0})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('audience');
                    fetchLiveStats();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'audience'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Monitor de Audiência em Tempo Real</span>
                  {liveStats && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                      {liveStats.totalOnlineUsers}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  Configurações / Senha
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'audience' && (
                  <button
                    onClick={fetchLiveStats}
                    disabled={isLoadingStats}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Atualizar dados de audiência agora"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>Atualizar Agora</span>
                  </button>
                )}

                <button
                  onClick={handleResetDefaults}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-1.5"
                  title="Restaurar padrão original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restaurar Padrão</span>
                </button>

                {activeTab === 'channels' && (
                  <button
                    onClick={handleAddNewChannel}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Canal</span>
                  </button>
                )}

                {activeTab === 'sponsor' && (
                  <button
                    onClick={handleAddNewCard}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Card</span>
                  </button>
                )}

                <button
                  onClick={handleSaveAll}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>

            {/* Notification when saved */}
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Alterações salvas com sucesso!</strong> Os botões de play e o arquivo M3U na página principal já foram sincronizados.
                </span>
              </div>
            )}

            {activeTab === 'channels' ? (
              <div className="space-y-6">
                {/* Informational Banner about Anti-Sniffing & Security */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/30 text-xs text-zinc-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    Travas de Segurança &amp; Anti-Sniffer Ativas no Servidor:
                  </div>
                  <ul className="text-zinc-400 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
                    <li><strong className="text-zinc-200">Tempo Limite de 10 minutos:</strong> Tokens temporários que morrem caso capturados por extensões ou colados no VLC. O site legítimo renova automaticamente em segundo plano.</li>
                    <li><strong className="text-zinc-200">Bloqueio por IP:</strong> O link só funciona no IP do usuário que acessou. Não funciona se repassado para amigos ou grupos.</li>
                    <li><strong className="text-zinc-200">1 Conexão por Sessão:</strong> Múltiplos usuários diferentes assistem simultaneamente, mas um mesmo link não roda em mais de um player ao mesmo tempo.</li>
                  </ul>
                </div>

                {/* Channel List Editor */}
                <div className="space-y-4">
                  {channels.map((chan, idx) => (
                    <div
                      key={chan.id || idx}
                      className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-colors space-y-4 relative group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {chan.name || 'Sem título'}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            {chan.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Live Preview Button */}
                          {onPreviewChannel && (
                            <button
                              type="button"
                              onClick={() => {
                                saveStoredChannels(channels);
                                onPreviewChannel(chan);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Testar reprodução deste canal"
                            >
                              <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                              <span>Testar Player</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(idx)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-800/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Excluir este canal"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>

                      {/* Channel Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        {/* Nome do Canal */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="font-semibold text-zinc-400">Nome do Canal:</label>
                          <input
                            type="text"
                            value={chan.name}
                            onChange={(e) => handleChannelChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Ex: Canais Abertos HD"
                          />
                        </div>

                        {/* Categoria */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="font-semibold text-zinc-400">Categoria:</label>
                          <select
                            value={chan.category}
                            onChange={(e) => handleChannelChange(idx, 'category', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors"
                          >
                            <option value="Abertos">Abertos</option>
                            <option value="Esportes">Esportes</option>
                            <option value="Notícias">Notícias</option>
                            <option value="Desenhos">Desenhos</option>
                            <option value="Documentários">Documentários</option>
                            <option value="Filmes">Filmes</option>
                            <option value="Geral">Geral</option>
                          </select>
                        </div>

                        {/* Qualidade */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="font-semibold text-zinc-400">Qualidade:</label>
                          <input
                            type="text"
                            value={chan.quality}
                            onChange={(e) => handleChannelChange(idx, 'quality', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="1080p FHD"
                          />
                        </div>

                        {/* Status Ativo */}
                        <div className="sm:col-span-3 flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={chan.active}
                              onChange={(e) => handleChannelChange(idx, 'active', e.target.checked)}
                              className="w-4 h-4 rounded accent-purple-600 bg-zinc-900 border-zinc-700"
                            />
                            <span className="text-zinc-300 font-medium">Ativo na página</span>
                          </label>
                        </div>

                        {/* Link M3U8 (Fluxo de streaming) */}
                        <div className="sm:col-span-12 space-y-1">
                          <label className="font-semibold text-zinc-400 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                              Link de Transmissão (M3U8, Xtream Codes, TS ou MP4):
                            </span>
                            <span className="text-[11px] text-emerald-400/90 font-mono">
                              Aceita qualquer formato ou URL (com ou sem .m3u8)
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={chan.streamUrl}
                              onChange={(e) => handleChannelChange(idx, 'streamUrl', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                              placeholder="Ex: http://srv.mypanel.life:8080/jju4420/NebeQ90Mp1/7439 ou https://site.com/live.m3u8"
                            />
                          </div>
                        </div>

                        {/* Barra de Informações Rolante (Ticker estilo ESPN) */}
                        <div className="sm:col-span-12 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-2">
                            <label className="font-semibold text-zinc-300 flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                              Texto da Barra de Rolagem (Ticker):
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                              <input
                                type="checkbox"
                                checked={chan.tickerEnabled ?? false}
                                onChange={(e) => handleChannelChange(idx, 'tickerEnabled', e.target.checked)}
                                className="w-4 h-4 rounded accent-cyan-500 bg-zinc-900 border-zinc-700"
                              />
                              <span className={`font-semibold ${chan.tickerEnabled ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                Ativar Barra de Rolagem neste canal
                              </span>
                            </label>
                          </div>

                          <div className="space-y-1">
                            <input
                              type="text"
                              value={chan.tickerText || ''}
                              onChange={(e) => handleChannelChange(idx, 'tickerText', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600"
                              placeholder="Ex: 🔴 AO VIVO: Informações sobre este canal, palpites ou notícias importantes deslizando em tempo real..."
                            />
                            <p className="text-[11px] text-zinc-500 leading-tight">
                              Este texto deslizará continuamente da direita para a esquerda na base do player ao reproduzir este canal específico.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'sponsor' ? (
              /* Sponsor & Cards Tab */
              <div className="space-y-8">
                {/* 1. GERENCIADOR GERAL DE BANNERS DO SITE */}
                {(() => {
                  const defaultBannersMap = createDefaultBanners();
                  const currentBanner: SiteBannerItem = 
                    sponsorConfig.banners?.[selectedBannerPosition] || defaultBannersMap[selectedBannerPosition];

                  const totalActiveBanners = BANNER_POSITIONS.filter((pos) => {
                    const b = sponsorConfig.banners?.[pos.id];
                    return b ? b.enabled : pos.id === 'top_player';
                  }).length;

                  return (
                    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
                      {/* Cabeçalho do Gerenciador de Banners */}
                      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-zinc-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">
                                Gerenciador Geral de Banners do Site
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800">
                                {totalActiveBanners} de 5 Posições Ativas
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              Gerencie múltiplos espaços de publicidade e patrocinadores de forma 100% independente no site.
                            </p>
                          </div>
                        </div>

                        {/* Botão Liga/Desliga Rápido para a Posição Selecionada */}
                        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                          <span className="text-xs font-semibold text-zinc-300">
                            Banner nesta posição:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateBanner(selectedBannerPosition, { enabled: !currentBanner.enabled })}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currentBanner.enabled
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${currentBanner.enabled ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
                            <span>{currentBanner.enabled ? 'Ligado (Ativo)' : 'Desligado (Inativo)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Atalhos Rápidos das 5 Posições (Visão Geral das 5 Posições) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {BANNER_POSITIONS.map((pos) => {
                          const posBanner = sponsorConfig.banners?.[pos.id] || defaultBannersMap[pos.id];
                          const isSelected = selectedBannerPosition === pos.id;
                          const isEnabled = posBanner.enabled;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setSelectedBannerPosition(pos.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? 'bg-purple-950/50 border-purple-500/80 text-white shadow-md shadow-purple-950/40 ring-1 ring-purple-500/40'
                                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[11px] truncate">
                                  {pos.id === 'top_player' ? '1. Topo Player' :
                                   pos.id === 'header_beside_logo' ? '2. Cabeçalho' :
                                   pos.id === 'below_player' ? '3. Abaixo Player' :
                                   pos.id === 'above_channels' ? '4. Acima Canais' :
                                   '5. Abaixo Canais'}
                                </span>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-zinc-600'}`} />
                              </div>
                              <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                                <span>{posBanner.contentType === 'script' ? 'Script' : 'Imagem'}</span>
                                <span className={isEnabled ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                                  {isEnabled ? 'Ativo' : 'Off'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdowns de Configuração da Posição e Tipo de Conteúdo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                        {/* 1. SELECIONAR POSIÇÃO DO BANNER */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-200 block">
                            Selecionar Posição do Banner:
                          </label>
                          <select
                            value={selectedBannerPosition}
                            onChange={(e) => setSelectedBannerPosition(e.target.value as BannerPositionId)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {BANNER_POSITIONS.map((pos) => (
                              <option key={pos.id} value={pos.id}>
                                {pos.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-zinc-400">
                            {BANNER_POSITIONS.find((p) => p.id === selectedBannerPosition)?.descriptionHelp}
                          </p>
                        </div>

                        {/* 2. TIPO DE CONTEÚDO */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-200 block">
                            Tipo de Conteúdo:
                          </label>
                          <select
                            value={currentBanner.contentType}
                            onChange={(e) =>
                              handleUpdateBanner(selectedBannerPosition, {
                                contentType: e.target.value as BannerContentType,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="image">Imagem Estática</option>
                            <option value="script">Código de Script/Adsterra</option>
                          </select>
                          <p className="text-[11px] text-zinc-400">
                            {currentBanner.contentType === 'image'
                              ? 'Faça upload de uma imagem e defina link de destino.'
                              : 'Cole códigos de anúncios em JavaScript, HTML, Adsterra ou Iframes.'}
                          </p>
                        </div>
                      </div>

                      {/* CONTEÚDO: SE FOR IMAGEM ESTÁTICA */}
                      {currentBanner.contentType === 'image' ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                          <div className="md:col-span-7 space-y-3">
                            <label className="text-xs font-semibold text-zinc-300 block">
                              Upload de Imagem do Banner ({BANNER_POSITIONS.find(p => p.id === selectedBannerPosition)?.name}):
                            </label>

                            <div className="flex items-center gap-3">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-purple-600/30"
                              >
                                <Upload className="w-4 h-4" />
                                <span>Selecionar Imagem do Computador</span>
                              </button>

                              {currentBanner.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBanner(selectedBannerPosition, { imageUrl: '' })}
                                  className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-rose-500 text-rose-300 text-xs font-medium transition-colors"
                                >
                                  Remover Imagem
                                </button>
                              )}
                            </div>

                            <div className="space-y-1 pt-1">
                              <label className="text-xs font-semibold text-zinc-400">
                                Ou informe a URL da Imagem diretamente:
                              </label>
                              <input
                                type="text"
                                value={currentBanner.imageUrl || ''}
                                onChange={(e) =>
                                  handleUpdateBanner(selectedBannerPosition, { imageUrl: e.target.value })
                                }
                                placeholder="https://exemplo.com/banner.png"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-400">
                                  Link de Destino do Banner:
                                </label>
                                <input
                                  type="text"
                                  value={currentBanner.linkUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateBanner(selectedBannerPosition, { linkUrl: e.target.value })
                                  }
                                  placeholder="https://patrocinador.com/cadastro"
                                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-400">
                                  Texto Alternativo / Nome:
                                </label>
                                <input
                                  type="text"
                                  value={currentBanner.altText || ''}
                                  onChange={(e) =>
                                    handleUpdateBanner(selectedBannerPosition, { altText: e.target.value })
                                  }
                                  placeholder="Ex: Anúncio Oficial"
                                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                                />
                              </div>
                            </div>

                            {selectedBannerPosition === 'top_player' && (
                              <div className="space-y-1 pt-1">
                                <label className="text-xs font-semibold text-zinc-400">
                                  Etiqueta Superior (Tagline do Topo):
                                </label>
                                <input
                                  type="text"
                                  value={sponsorConfig.tagline || ''}
                                  onChange={(e) => setSponsorConfig((prev) => ({ ...prev, tagline: e.target.value }))}
                                  placeholder="Ex: Parceiro Oficial & Patrocinador"
                                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Preview da Imagem */}
                          <div className="md:col-span-5 space-y-2">
                            <span className="text-xs font-semibold text-zinc-400 block">
                              Pré-visualização do Banner ({selectedBannerPosition}):
                            </span>
                            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black/80 flex items-center justify-center min-h-[140px] max-h-48 p-2">
                              {currentBanner.imageUrl ? (
                                <img
                                  src={currentBanner.imageUrl}
                                  alt="Prévia do banner"
                                  className="w-full h-auto max-h-44 object-contain"
                                />
                              ) : (
                                <span className="text-xs text-zinc-600 italic p-4 text-center">
                                  Nenhuma imagem configurada para esta posição ainda.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* CONTEÚDO: SE FOR CÓDIGO DE SCRIPT / ADSTERRA */
                        <div className="space-y-4">
                          {/* CAMPO NUMÉRICO: TEMPO DE ROTAÇÃO DO ANÚNCIO (AUTO-REFRESH) */}
                          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Tempo de Rotação do Anúncio (em segundos):</span>
                              </label>
                              <p className="text-[11px] text-zinc-400">
                                Recarrega automaticamente este bloco de anúncio para gerar uma nova impressão sem recarregar a página (Padrão: 60s).
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={5}
                                  max={3600}
                                  step={5}
                                  value={currentBanner.refreshIntervalSeconds ?? 60}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    handleUpdateBanner(selectedBannerPosition, {
                                      refreshIntervalSeconds: isNaN(val) ? 60 : Math.max(5, val),
                                    });
                                  }}
                                  className="w-24 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-cyan-300 font-mono font-bold text-sm text-center focus:outline-none focus:border-cyan-500 shadow-inner"
                                />
                                <span className="absolute right-2.5 top-2.5 text-[10px] text-zinc-500 font-bold pointer-events-none">
                                  s
                                </span>
                              </div>

                              {/* Atalhos rápidos de segundos */}
                              <div className="flex items-center gap-1">
                                {[30, 45, 60, 90].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBanner(selectedBannerPosition, { refreshIntervalSeconds: sec })
                                    }
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                      (currentBanner.refreshIntervalSeconds ?? 60) === sec
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                                    }`}
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-zinc-200 block">
                                Código do Script de Anúncio ({BANNER_POSITIONS.find(p => p.id === selectedBannerPosition)?.name}):
                              </label>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                HTML / JavaScript / Tags Adsterra / Iframes
                              </span>
                            </div>

                            <textarea
                              rows={6}
                              value={currentBanner.scriptCode || ''}
                              onChange={(e) =>
                                handleUpdateBanner(selectedBannerPosition, { scriptCode: e.target.value })
                              }
                              placeholder="<!-- Cole aqui o código de anúncio do Adsterra, script ou tag HTML para esta posição específica -->&#10;<script type='text/javascript'>&#10;  atOptions = { 'key' : '...', 'format' : 'iframe', 'height' : 90, 'width' : 728 };&#10;</script>"
                              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 shadow-inner placeholder:text-zinc-600"
                            />
                          </div>

                          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>
                              Auto-refresh ativo: a cada {currentBanner.refreshIntervalSeconds ?? 60} segundos, este anúncio recarrega de forma instantânea gerando nova impressão monetizada sem piscar ou fechar na tela.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 2. TEXTO DESCRITIVO EDITÁVEL */}
                      <div className="space-y-2 pt-3 border-t border-zinc-800">
                        <label className="text-xs font-semibold text-zinc-300 block">
                          Texto de Apresentação Editável (Abaixo do Banner):
                        </label>
                        <textarea
                          rows={3}
                          value={sponsorConfig.description}
                          onChange={(e) => setSponsorConfig((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Escreva aqui o que você quiser para apresentar a transmissão, apostas ou regras..."
                          className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* 3. BANNER IN-PLAY NO PLAYER DE VÍDEO (TRANSMISSÃO) */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/30">
                        <Code className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                          Banner In-Play no Player de Vídeo
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sponsorConfig.inPlayScript?.trim()
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {sponsorConfig.inPlayScript?.trim() ? 'Script Real Ativo' : 'Imagem de Teste Ativa (Placeholder)'}
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Disparo inicial após <strong>{sponsorConfig.inPlayInitialDelaySeconds ?? 30}s</strong> de vídeo, repetindo a cada <strong>{sponsorConfig.inPlayIntervalMinutes ?? 8} min</strong> com duração de <strong>{sponsorConfig.inPlayDurationSeconds ?? 5}s</strong> (fade-out automático e 70% de opacidade).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new Event('brado_trigger_inplay_test'));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
                        title="Dispara a exibição do banner no player agora mesmo para teste visual do temporizador e fade-out"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Testar no Player Agora ({sponsorConfig.inPlayDurationSeconds ?? 5}s)</span>
                      </button>

                      {sponsorConfig.inPlayScript && (
                        <button
                          type="button"
                          onClick={() => setSponsorConfig((prev) => ({ ...prev, inPlayScript: '' }))}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                          title="Limpar código e voltar à imagem cinza de teste temporária"
                        >
                          Restaurar Imagem de Teste
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AJUSTES DE TEMPORIZADOR E EFEITO FADE-OUT DO BANNER IN-PLAY */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-3">
                    <div className="flex items-center gap-2 border-b border-zinc-800/70 pb-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <h5 className="text-xs font-bold text-white tracking-wide uppercase">
                        Configuração de Temporizadores & Efeito Fade-Out
                      </h5>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Início Rápido (Delay Inicial) */}
                      <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                          <span>Início do Banner (Delay):</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            {sponsorConfig.inPlayInitialDelaySeconds ?? 30}s
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="5"
                            max="600"
                            step="5"
                            value={sponsorConfig.inPlayInitialDelaySeconds ?? 30}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setSponsorConfig((prev) => ({ ...prev, inPlayInitialDelaySeconds: val }));
                            }}
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-[11px] text-zinc-400">segundos</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          Tempo após o início do vídeo para o primeiro surgimento na base do player.
                        </p>
                      </div>

                      {/* 2. Repetição Periódica (Intervalo) */}
                      <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                          <span>Intervalo Periódico:</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            {sponsorConfig.inPlayIntervalMinutes ?? 8} min
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            step="1"
                            value={sponsorConfig.inPlayIntervalMinutes ?? 8}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSponsorConfig((prev) => ({ ...prev, inPlayIntervalMinutes: val }));
                            }}
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-[11px] text-zinc-400">minutos</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          O player monitora a transmissão ativa (isPlaying) e ressurge o banner periodicamente.
                        </p>
                      </div>

                      {/* 3. Duração e Fade-out */}
                      <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                          <span>Duração em Tela & Fade-out:</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            {sponsorConfig.inPlayDurationSeconds ?? 5}s
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="2"
                            max="60"
                            step="1"
                            value={sponsorConfig.inPlayDurationSeconds ?? 5}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSponsorConfig((prev) => ({ ...prev, inPlayDurationSeconds: val }));
                            }}
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-[11px] text-zinc-400">segundos</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          Tempo visível na tela antes de executar a transição suave de desaparecimento.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 block">
                        Código do Script de Anúncio In-Play:
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        HTML / JavaScript / Tags de Anúncios / Iframes
                      </span>
                    </div>

                    <textarea
                      rows={6}
                      value={sponsorConfig.inPlayScript || ''}
                      onChange={(e) => setSponsorConfig((prev) => ({ ...prev, inPlayScript: e.target.value }))}
                      placeholder="Cole aqui qualquer código (HTML, script da rede de anúncios, tag de banner ou iframe)...&#10;&#10;Exemplo:&#10;<script src=&quot;https://sua-rede.com/ad.js&quot;></script>&#10;ou&#10;<a href=&quot;https://seusite.com&quot; target=&quot;_blank&quot;><img src=&quot;https://seusite.com/banner.png&quot; /></a>&#10;&#10;⚠️ Se você deixar este campo em branco, o player exibirá a imagem cinza de teste temporária (Placeholder)."
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 transition-colors"
                    />

                    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>
                        Quando você colar qualquer código nesse campo e salvar, o player de vídeo substituirá automaticamente a imagem de teste pelo código real inserido.
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. CARDS PERSONALIZADOS (ODDS, BILHETES PRONTOS, PALPITES, ETC) */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Cards Editáveis</h4>
                        <p className="text-xs text-zinc-400">
                          Crie e personalize quantos cards quiser com títulos, imagens, textos, links ou ofertas.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewCard}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Card</span>
                    </button>
                  </div>

                  {/* Lista de Cards */}
                  <div className="space-y-4">
                    {sponsorConfig.cards && sponsorConfig.cards.length > 0 ? (
                      sponsorConfig.cards.map((card, cardIdx) => (
                        <div
                          key={card.id || cardIdx}
                          className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-zinc-900 text-zinc-400 text-xs font-mono font-bold flex items-center justify-center border border-zinc-800">
                                {cardIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-white">
                                {card.title || 'Sem título'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400">
                                <input
                                  type="checkbox"
                                  checked={card.active}
                                  onChange={(e) => handleCardChange(cardIdx, 'active', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                                />
                                <span>{card.active ? 'Ativo no Site' : 'Pausado'}</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleDeleteCard(cardIdx)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                title="Excluir este card"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-400">Título do Card:</label>
                              <input
                                type="text"
                                value={card.title}
                                onChange={(e) => handleCardChange(cardIdx, 'title', e.target.value)}
                                placeholder="Ex: Múltipla dos Campeões"
                                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-400">Badge / Etiqueta:</label>
                              <input
                                type="text"
                                value={card.badge || ''}
                                onChange={(e) => handleCardChange(cardIdx, 'badge', e.target.value)}
                                placeholder="Ex: Bilhete Pronto 🔥 ou Odds 3.50"
                                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-400">Destaque (Odd / Cotação):</label>
                              <input
                                type="text"
                                value={card.highlightText || ''}
                                onChange={(e) => handleCardChange(cardIdx, 'highlightText', e.target.value)}
                                placeholder="Ex: Odd Total: 3.45"
                                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400">Descrição / Palpite:</label>
                            <textarea
                              rows={2}
                              value={card.description}
                              onChange={(e) => handleCardChange(cardIdx, 'description', e.target.value)}
                              placeholder="Descreva a partida, os times ou detalhes da aposta..."
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 leading-snug"
                            />
                          </div>

                          {/* OPÇÃO DE ADICIONAR IMAGEM (ACIMA DE TEXTO DO BOTÃO) */}
                          <div className="space-y-2 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                                <Image className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Imagem do Card (Opcional):</span>
                              </label>
                              {card.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleCardChange(cardIdx, 'imageUrl', '')}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                                  title="Remover imagem deste card"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remover Imagem</span>
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition-colors shrink-0">
                                <Upload className="w-3.5 h-3.5 text-purple-400" />
                                <span>{card.imageUrl ? 'Trocar Imagem' : 'Enviar Imagem'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleCardImageUpload(cardIdx, e)}
                                  className="hidden"
                                />
                              </label>

                              <div className="flex-1 w-full">
                                <input
                                  type="text"
                                  value={card.imageUrl || ''}
                                  onChange={(e) => handleCardChange(cardIdx, 'imageUrl', e.target.value)}
                                  placeholder="Ou cole a URL da imagem (https://...)"
                                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
                                />
                              </div>

                              {card.imageUrl && (
                                <div className="relative w-14 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0 flex items-center justify-center p-0.5" title="Prévia miniatura">
                                  <img
                                    src={card.imageUrl}
                                    alt="Prévia do Card"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                            </div>

                            {card.imageUrl && (
                              <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Prévia no Card (redimensionada automaticamente ao card):</span>
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-medium">✓ Imagem 100% Completa</span>
                                </div>
                                <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 flex items-center justify-center p-2">
                                  <img
                                    src={card.imageUrl}
                                    alt="Prévia completa ajustada ao card"
                                    className="w-full h-auto max-h-48 object-contain rounded-lg"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-400">Texto do Botão:</label>
                              <input
                                type="text"
                                value={card.buttonText || ''}
                                onChange={(e) => handleCardChange(cardIdx, 'buttonText', e.target.value)}
                                placeholder="Ex: Acessar Bilhete"
                                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[11px] font-semibold text-zinc-400">Link de Destino / Aposta:</label>
                              <input
                                type="text"
                                value={card.linkUrl || ''}
                                onChange={(e) => handleCardChange(cardIdx, 'linkUrl', e.target.value)}
                                placeholder="https://exemplo.com/aposta"
                                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                        Nenhum card cadastrado. Clique em <strong>Adicionar Card</strong> acima para criar seu primeiro card de Odds ou Bilhete Pronto.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'audience' ? (
              /* ABA: MONITOR DE AUDIÊNCIA EM TEMPO REAL */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Status Bar / Top Notice */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <span className="font-bold text-white">Monitoramento ao Vivo Ativo</span>
                      <span className="text-zinc-400 ml-1.5">• Atualização automática a cada 5 minutos (setInterval)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    {lastStatsUpdate && (
                      <span className="text-[11px] font-mono">
                        Última leitura: {lastStatsUpdate.toLocaleTimeString('pt-BR')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={fetchLiveStats}
                      disabled={isLoadingStats}
                      className="px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-800/80 hover:bg-cyan-900/80 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                      <span>{isLoadingStats ? 'Consultando...' : 'Atualizar Agora'}</span>
                    </button>
                  </div>
                </div>

                {/* 1. CARD GRANDE EM DESTAQUE: 👥 Total de Usuários Online no Site: [Número] */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/80 via-zinc-900/90 to-purple-950/70 border-2 border-cyan-500/40 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" />
                        <span>Público Conectado em Tempo Real</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>👥 Total de Usuários Online no Site:</span>
                        <span className="font-mono text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.4)]">
                          {liveStats?.totalOnlineUsers !== undefined
                            ? liveStats.totalOnlineUsers.toLocaleString('pt-BR')
                            : '1'}
                        </span>
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                        Contabilizando todas as sessões e IPs únicos ativos navegando no site agora.
                      </p>
                    </div>

                    {/* Mini-Métricas Auxiliares */}
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                      <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center min-w-[130px]">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                          Assistindo Vídeo
                        </span>
                        <span className="text-xl font-mono font-extrabold text-emerald-400">
                          {liveStats?.totalWatchingChannels !== undefined
                            ? liveStats.totalWatchingChannels.toLocaleString('pt-BR')
                            : '0'}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">no player agora</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center min-w-[130px]">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                          Multiplexador
                        </span>
                        <span className="text-xl font-mono font-extrabold text-purple-400">
                          {liveStats?.multiplexerStats?.activeContinuousStreams ?? 0}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">streams ativos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. LISTA / TABELA DOS PLAYERS E CANAIS CADASTRADOS */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Tv className="w-5 h-5 text-cyan-400" />
                        <span>Audiência por Canal / Player Cadastrado</span>
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Puxando espectadores em tempo real de cada stream ativo via Multiplexador (stream.clients.size) e players conectados.
                      </p>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 self-start sm:self-auto">
                      Total: {channels.length} canais cadastrados
                    </span>
                  </div>

                  {/* Lista de Canais */}
                  <div className="space-y-3">
                    {channels.length > 0 ? (
                      channels.map((channel, idx) => {
                        // Encontra estatística do canal retornado pela API
                        const stat = liveStats?.channels?.find((c) => c.id === channel.id);
                        const playerIndex = stat?.playerIndex || idx + 1;
                        const watchingCount = stat?.watchingNow ?? 0;
                        const isMultiplexActive = Boolean(stat?.hasActiveMultiplexerStream);
                        const multiplexSize = stat?.multiplexerClientsSize ?? 0;

                        return (
                          <div
                            key={channel.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                              watchingCount > 0
                                ? 'bg-gradient-to-r from-cyan-950/40 via-zinc-900/80 to-zinc-950 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                                : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            {/* Nome e Formatação Exigida: 📺 Player 1 - Globo HD: 1.450 assistindo agora */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                                  <span>📺 Player {playerIndex} - {channel.name}:</span>
                                  <span className={`font-mono font-extrabold px-2 py-0.5 rounded-lg border ${
                                    watchingCount > 0
                                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-950'
                                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                  }`}>
                                    {watchingCount.toLocaleString('pt-BR')} assistindo agora
                                  </span>
                                </span>

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                  channel.active
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                }`}>
                                  {channel.active ? 'Canal Ativo' : 'Canal Inativo'}
                                </span>
                              </div>

                              {/* Badges de Categoria, Qualidade e Multiplexador */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-medium">
                                  {channel.category || 'Geral'}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-[11px] text-purple-300 font-bold">
                                  {channel.quality || 'HD'}
                                </span>

                                {isMultiplexActive && multiplexSize > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-cyan-400" />
                                    {multiplexSize} conexão(ões) compartilhando stream
                                  </span>
                                )}

                                <span className="text-[11px] text-zinc-500 font-mono truncate max-w-xs sm:max-w-md" title={channel.streamUrl}>
                                  URL: {channel.streamUrl}
                                </span>
                              </div>
                            </div>

                            {/* Botão de Testar Canal no Player */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onPreviewChannel) {
                                    onPreviewChannel(channel);
                                  }
                                }}
                                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                                title={`Abrir e testar transmissão de ${channel.name}`}
                              >
                                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                                <span>Testar Stream</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                        Nenhum canal cadastrado no momento. Cadastre canais na aba "Canais de Teste".
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Settings Tab */
              <div className="max-w-md mx-auto space-y-6 py-4">
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-purple-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Alterar Senha do Admin</h4>
                      <p className="text-xs text-zinc-400">
                        Atualize a chave de acesso para proteger este painel
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdatePin} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Nova Senha:</label>
                      <input
                        type="password"
                        placeholder="Mínimo 4 caracteres..."
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={newPin.length < 4}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-colors"
                    >
                      Salvar Nova Senha
                    </button>

                    {pinChangeSuccess && (
                      <p className="text-xs text-emerald-400 font-medium text-center">
                        Senha atualizada com sucesso!
                      </p>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Footer */}
        {isAuthenticated && (
          <div className="border-t border-zinc-800/80 px-6 py-4 bg-zinc-900/50 flex items-center justify-between gap-4 shrink-0">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {activeTab === 'audience'
                ? 'Os números de audiência são atualizados automaticamente a cada 5 minutos.'
                : 'As alterações são salvas localmente no navegador e refletem em tempo real.'}
            </span>

            <div className="flex items-center gap-2">
              {activeTab === 'audience' ? (
                <button
                  type="button"
                  onClick={fetchLiveStats}
                  disabled={isLoadingStats}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-cyan-600/25 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  <span>Atualizar Audiência</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveAll}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-purple-600/25"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
