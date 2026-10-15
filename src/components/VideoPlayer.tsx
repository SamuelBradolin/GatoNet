import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Tv, 
  AlertTriangle,
  Cast,
  Wifi
} from 'lucide-react';
import { TestChannel } from '../types/channel.ts';
import { getProxiedStreamUrl } from '../utils/proxyStream.ts';
import { getStoredSponsorConfig, getStoredChannels, syncSponsorWithBackend } from '../utils/channelStorage.ts';
import { castManager, CastDeviceState } from '../utils/castManager.ts';

// Imagem cinza de teste (Placeholder) temporária em formato SVG Data URI
const IN_PLAY_PLACEHOLDER_SVG_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 68" width="540" height="68">
  <rect width="540" height="68" rx="8" fill="#374151" stroke="#4b5563" stroke-width="2"/>
  <rect x="12" y="14" width="40" height="40" rx="6" fill="#1f2937" stroke="#6b7280" stroke-width="1.5"/>
  <circle cx="32" cy="34" r="8" fill="#4b5563"/>
  <polygon points="29,29 37,34 29,39" fill="#9ca3af"/>
  <text x="64" y="31" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="800" fill="#f3f4f6" letter-spacing="0.5">ANÚNCIO IN-PLAY (TESTE TEMPORÁRIO)</text>
  <text x="64" y="47" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="500" fill="#9ca3af">Exibição: a cada 2 min • Duração: 5 segundos • Opacidade: 70%</text>
  <rect x="425" y="22" width="102" height="24" rx="12" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>
  <text x="476" y="38" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="700" fill="#d1d5db" text-anchor="middle">MODO TESTE</text>
</svg>
`)}`;

interface VideoPlayerProps {
  channel: TestChannel | null;
  channels?: TestChannel[];
  onSelectChannel?: (channel: TestChannel) => void;
  onClose: () => void;
  belowPlayerSlot?: React.ReactNode;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  channels = [],
  onSelectChannel,
  onClose,
  belowPlayerSlot,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Estados e temporizadores do Banner In-Play (a cada 2 min por 5 segundos com opacidade 70%)
  const [inPlayScript, setInPlayScript] = useState<string>(() => {
    return getStoredSponsorConfig().inPlayScript || '';
  });
  const [isInPlayVisible, setIsInPlayVisible] = useState(false);
  const [isInPlayFading, setIsInPlayFading] = useState(false);

  const inPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inPlayFadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const networkRetriesRef = useRef(0);
  const mediaRetriesRef = useRef(0);

  // Initialize and load HLS stream with expiring session, IP binding & heartbeat renewal
  useEffect(() => {
    if (!channel || !channel.streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    let isCancelled = false;

    networkRetriesRef.current = 0;
    mediaRetriesRef.current = 0;

    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const safePlay = async () => {
      if (isCancelled || !videoRef.current) return;
      try {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (!isCancelled) {
            setIsPlaying(true);
            setIsLoading(false);
            setErrorMsg(null);
          }
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const domErr = err as DOMException;
        if (domErr?.name === 'AbortError') {
          return;
        }
        if (domErr?.name === 'NotAllowedError') {
          try {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              const mutedPromise = videoRef.current.play();
              if (mutedPromise !== undefined) {
                await mutedPromise;
                if (!isCancelled) {
                  setIsPlaying(true);
                  setIsLoading(false);
                  setErrorMsg(null);
                }
              }
            }
          } catch (mutedErr: unknown) {
            const mErr = mutedErr as DOMException;
            if (mErr?.name !== 'AbortError') {
              console.warn('Muted autoplay blocked:', mErr);
            }
          }
        } else {
          console.warn('Playback error:', domErr);
        }
      }
    };

    // Consome a rota de Proxy CORS do backend (/api/proxy?url=...)
    const streamUrl = getProxiedStreamUrl(channel.streamUrl);

    // 1. Configura o Hls.js com tolerância estendida para buffer e filtragem no backend
    if (Hls.isSupported()) {
      const hlsConfig: any = {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        forceSupportedMediaTypes: true,
        manifestLoadingTimeOut: 45000,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1500,
        manifestLoadingMaxRetryTimeout: 64000,
        levelLoadingTimeOut: 45000,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 1500,
        levelLoadingMaxRetryTimeout: 64000,
        fragLoadingTimeOut: 45000,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 1500,
        fragLoadingMaxRetryTimeout: 64000,
        nudgeMaxRetry: 15,
        nudgeOffset: 0.2,
        maxBufferHole: 0.8,
        defaultAudioCodec: 'mp4a.40.2',
        enableSoftwareAES: true,
        xhrSetup: (xhr: XMLHttpRequest) => {
          try {
            xhr.setRequestHeader(
              'Accept',
              'application/x-mpegURL, application/vnd.apple.mpegurl, video/mp2t, video/mp4, */*'
            );
          } catch (_) {}
        },
      };

      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      // Força o tipo HLS no elemento HTML5 video
      video.setAttribute('type', 'application/x-mpegURL');

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isCancelled) {
          safePlay();
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (isCancelled) return;
        console.warn('HLS Event Error:', data.type, data.details, data);

        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
          const httpStatus = (data as any)?.response?.code;
          if (httpStatus === 404) {
            setErrorMsg(
              'O servidor remoto deste canal retornou código 404 (Não Encontrado). As credenciais ou o ID deste teste expiraram ou foram desativados pelo provedor IPTV.'
            );
            setIsLoading(false);
            return;
          }
          if (httpStatus === 502) {
            setErrorMsg(
              'Servidor do canal offline ou inacessível no momento (Erro 502). O host da transmissão não está respondendo conexões de rede.'
            );
            setIsLoading(false);
            return;
          }
          if (httpStatus === 504) {
            setErrorMsg(
              'Tempo limite de conexão esgotado (Erro 504). O servidor remoto do canal demorou mais do que o esperado para enviar os dados de vídeo.'
            );
            setIsLoading(false);
            return;
          }
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetriesRef.current < 6) {
                networkRetriesRef.current += 1;
                console.log(`Reconectando à transmissão de rede (tentativa ${networkRetriesRef.current}/6)...`);
                setTimeout(() => {
                  if (!isCancelled && hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, 1200);
              } else {
                setErrorMsg(
                  'Instabilidade temporária na transmissão remota. Clique em "Tentar Novamente" para restabelecer a conexão.'
                );
                setIsLoading(false);
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetriesRef.current < 4) {
                mediaRetriesRef.current += 1;
                console.log(`Recuperando decodificação de mídia (tentativa ${mediaRetriesRef.current}/4)...`);
                hls.recoverMediaError();
              } else {
                hls.swapAudioCodec();
                hls.recoverMediaError();
              }
              break;

            default:
              console.error('Erro irrecuperável HLS:', data);
              setErrorMsg('Erro na decodificação do fluxo de vídeo IPTV.');
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Suporte nativo Safari iOS / macOS
      video.src = streamUrl;
      video.load();

      const onLoadedMetadata = () => {
        if (!isCancelled) {
          safePlay();
        }
      };

      const onNativeError = () => {
        if (!isCancelled) {
          setErrorMsg('Falha ao reproduzir fluxo HLS no reprodutor nativo do navegador.');
          setIsLoading(false);
        }
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onNativeError);

      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onNativeError);
      };
    } else {
      setErrorMsg('Seu navegador não oferece suporte à reprodução de streams HLS.');
      setIsLoading(false);
    }

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, retryKey]);

  // Eventos de estado do player HTML5
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setErrorMsg(null);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleStalled = () => {
      setIsLoading(true);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('stalled', handleStalled);
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          const domErr = err as DOMException;
          if (domErr?.name !== 'AbortError') {
            console.warn('Playback error:', domErr);
          }
        });
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen change listener para manter o estado atualizado mesmo se o usuário sair via ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      } else {
        setShowControls(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Monitora movimentação do mouse para exibir os controles e a dica do ESC e depois sumir em tela cheia
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const handleMouseLeave = () => {
    if (isFullscreen) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      setShowControls(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Sincroniza o script do anúncio quando for salvo no painel de administração
  useEffect(() => {
    const handleSponsorUpdate = () => {
      const cfg = getStoredSponsorConfig();
      setInPlayScript(cfg.inPlayScript || '');
    };
    window.addEventListener('brado_sponsor_updated', handleSponsorUpdate);
    return () => window.removeEventListener('brado_sponsor_updated', handleSponsorUpdate);
  }, []);

  // Dispara a exibição do banner flutuante por exatamente 5 segundos e executa efeito de fade-out
  // Configurações dinâmicas de Temporizadores e Fade-out do Banner In-Play (carregadas do Admin)
  const [inPlayConfig, setInPlayConfig] = useState(() => {
    const cfg = getStoredSponsorConfig();
    return {
      script: cfg.inPlayScript || '',
      initialDelaySeconds: cfg.inPlayInitialDelaySeconds ?? 30,
      intervalMinutes: cfg.inPlayIntervalMinutes ?? 8,
      durationSeconds: cfg.inPlayDurationSeconds ?? 5,
    };
  });

  // Ouve atualizações de patrocinador e temporizadores do Painel Admin em tempo real
  useEffect(() => {
    // Sincroniza banners e configurações ativas diretamente do banco de dados da API ao inicializar
    syncSponsorWithBackend().then((cfg) => {
      if (cfg) {
        setInPlayScript(cfg.inPlayScript || '');
        setInPlayConfig({
          script: cfg.inPlayScript || '',
          initialDelaySeconds: cfg.inPlayInitialDelaySeconds ?? 30,
          intervalMinutes: cfg.inPlayIntervalMinutes ?? 8,
          durationSeconds: cfg.inPlayDurationSeconds ?? 5,
        });
      }
    });

    const handleSponsorUpdate = () => {
      const cfg = getStoredSponsorConfig();
      setInPlayScript(cfg.inPlayScript || '');
      setInPlayConfig({
        script: cfg.inPlayScript || '',
        initialDelaySeconds: cfg.inPlayInitialDelaySeconds ?? 30,
        intervalMinutes: cfg.inPlayIntervalMinutes ?? 8,
        durationSeconds: cfg.inPlayDurationSeconds ?? 5,
      });
    };
    window.addEventListener('brado_sponsor_updated', handleSponsorUpdate);
    return () => window.removeEventListener('brado_sponsor_updated', handleSponsorUpdate);
  }, []);

  const triggerInPlayBanner = useCallback(() => {
    setIsInPlayVisible(true);
    setIsInPlayFading(false);

    if (inPlayTimerRef.current) clearTimeout(inPlayTimerRef.current);
    if (inPlayFadeTimerRef.current) clearTimeout(inPlayFadeTimerRef.current);

    // Permanece na tela pelo tempo configurado (padrão: 5 segundos) antes de sumir
    const durationMs = Math.max(1, inPlayConfig.durationSeconds) * 1000;
    inPlayTimerRef.current = setTimeout(() => {
      // Inicia a animação suave de fade-out
      setIsInPlayFading(true);
      // Aguarda a transição de fade-out terminar (600ms) para ocultar
      inPlayFadeTimerRef.current = setTimeout(() => {
        setIsInPlayVisible(false);
        setIsInPlayFading(false);
      }, 600);
    }, durationMs);
  }, [inPlayConfig.durationSeconds]);

  const dismissInPlayBanner = () => {
    if (inPlayTimerRef.current) clearTimeout(inPlayTimerRef.current);
    if (inPlayFadeTimerRef.current) clearTimeout(inPlayFadeTimerRef.current);
    setIsInPlayFading(true);
    setTimeout(() => {
      setIsInPlayVisible(false);
      setIsInPlayFading(false);
    }, 300);
  };

  // Temporizadores do Banner In-Play:
  // 1. Assim que o player é iniciado (isPlaying), após o delay inicial (padrão: 30 segundos), o banner surge suavemente na base do vídeo.
  // 2. Depois o player monitora a transmissão ativa (isPlaying) e, a cada X minutos (padrão: 8 minutos), o banner ressurge suavemente.
  useEffect(() => {
    if (!isPlaying) return;

    let initialTimeout: NodeJS.Timeout | null = null;
    let periodicInterval: NodeJS.Timeout | null = null;

    const initialDelayMs = Math.max(0, inPlayConfig.initialDelaySeconds) * 1000;
    const intervalMs = Math.max(1, inPlayConfig.intervalMinutes) * 60 * 1000;

    // Disparo inicial após o player ser iniciado
    initialTimeout = setTimeout(() => {
      triggerInPlayBanner();

      // Após o primeiro disparo, inicia o ciclo periódico a cada X minutos
      periodicInterval = setInterval(() => {
        triggerInPlayBanner();
      }, intervalMs);
    }, initialDelayMs);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (periodicInterval) clearInterval(periodicInterval);
    };
  }, [isPlaying, inPlayConfig.initialDelaySeconds, inPlayConfig.intervalMinutes, triggerInPlayBanner]);

  // Permite testar o banner instantaneamente pelo botão de teste no Painel Admin
  useEffect(() => {
    const handleTestTrigger = () => {
      triggerInPlayBanner();
    };
    window.addEventListener('brado_trigger_inplay_test', handleTestTrigger);
    return () => window.removeEventListener('brado_trigger_inplay_test', handleTestTrigger);
  }, [triggerInPlayBanner]);

  // Limpeza de timers ao desmontar
  // Suporte a Chromecast e AirPlay (Espelhamento para Smart TV)
  const [castState, setCastState] = useState<CastDeviceState>(() => castManager.getState());
  const [showCastMenu, setShowCastMenu] = useState(false);
  const castMenuRef = useRef<HTMLDivElement | null>(null);
  const isTransmitting = castState.isCastConnected || castState.isAirPlayConnected;

  useEffect(() => {
    const unsubscribe = castManager.subscribe((state) => {
      setCastState(state);
    });

    let unregisterVideo = () => {};
    if (videoRef.current) {
      try {
        videoRef.current.setAttribute('x-webkit-airplay', 'allow');
        videoRef.current.setAttribute('airplay', 'allow');
      } catch {
        // ignore
      }
      unregisterVideo = castManager.registerVideoElement(videoRef.current);
    }

    return () => {
      unsubscribe();
      unregisterVideo();
    };
  }, []);

  // Sincroniza transmissão para Chromecast quando conectado ou ao mudar de canal
  useEffect(() => {
    if (castState.isCastConnected && channel && channel.streamUrl) {
      const proxiedUrl = getProxiedStreamUrl(channel.streamUrl);
      castManager.loadMediaToCast({
        streamUrl: proxiedUrl,
        title: channel.name,
        subtitle: `Gato Net • Categoria: ${channel.category || 'Ao Vivo'}`,
        logoUrl: channel.logoUrl,
      });
    }
  }, [castState.isCastConnected, channel]);

  // Fecha o menu de transmissão ao clicar fora
  useEffect(() => {
    if (!showCastMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (castMenuRef.current && !castMenuRef.current.contains(e.target as Node)) {
        setShowCastMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCastMenu]);

  // Disparo nativo de busca de Smart TV ou abertura do menu
  const handleCastButtonClick = async () => {
    if (isTransmitting) {
      setShowCastMenu((prev) => !prev);
      return;
    }

    try {
      const opened = await castManager.requestPlaybackTarget(videoRef.current, 'auto');
      if (!opened) {
        setShowCastMenu(true);
      }
    } catch {
      setShowCastMenu(true);
    }
  };

  const handleTriggerTarget = async (protocol: 'chromecast' | 'airplay') => {
    setShowCastMenu(false);
    await castManager.requestPlaybackTarget(videoRef.current, protocol);
  };

  const handleDisconnectCast = () => {
    setShowCastMenu(false);
    castManager.endCastSession();
  };

  if (!channel) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full bg-zinc-950 text-slate-100 overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none border-0 shadow-none m-0 justify-center'
          : 'rounded-2xl border border-zinc-700/80 shadow-2xl shadow-cyan-950/30'
      }`}
      role="region"
      aria-label={`Player de Vídeo - ${channel.name}`}
    >
      {/* Ambient Top Glow (quando em modo inline) */}
      {!isFullscreen && (
        <>
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* Header do Player - Oculto em tela cheia conforme requisitos */}
      {!isFullscreen && (
        <div className="relative flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/90 z-10">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-600/30">
              <Tv className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  {channel.name}
                </h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                  {channel.quality}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">
                Categoria: <strong className="text-zinc-200">{channel.category}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={handleCastButtonClick}
              title={
                isTransmitting
                  ? `Transmitindo em: ${castState.connectedDeviceName || 'Smart TV'} (Clique para opções)`
                  : 'Transmitir para Smart TV (Chromecast & AirPlay)'
              }
              aria-label="Transmitir para Smart TV ou Chromecast"
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                isTransmitting
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Cast className={`w-3.5 h-3.5 ${isTransmitting ? 'text-cyan-400 animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              title="Recarregar transmissão"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="Tela cheia"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-zinc-300 border border-zinc-700/60 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Fechar player e voltar ao texto"
              aria-label="Fechar player e voltar ao texto de apresentação"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Fechar</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Canvas Container */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden group ${
          isFullscreen ? 'h-full flex-1' : 'aspect-video'
        } ${isFullscreen && !showControls ? 'cursor-none' : ''}`}
      >
        <video
          ref={videoRef}
          playsInline
          x-webkit-airplay="allow"
          airplay="allow"
          disableRemotePlayback={false}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Badge Flutuante de Transmissão Ativa na Smart TV */}
        {isTransmitting && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/85 border border-cyan-500/60 text-cyan-200 text-xs font-semibold backdrop-blur-md shadow-xl shadow-cyan-950/60 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Cast className="w-3.5 h-3.5 text-cyan-400" />
            <span>Transmitindo na TV: <strong>{castState.connectedDeviceName || 'Smart TV'}</strong></span>
            <button
              type="button"
              onClick={handleDisconnectCast}
              className="ml-1.5 px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-[10px] text-rose-300 font-bold transition-colors cursor-pointer"
            >
              Parar
            </button>
          </div>
        )}

        {/* Dica de Tela Cheia com fade out idêntico aos menus */}
        {isFullscreen && (
          <div
            className={`absolute top-6 inset-x-0 flex justify-center pointer-events-none z-30 transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
            }`}
          >
            <div className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-md border border-zinc-700/60 text-xs font-medium text-zinc-200 shadow-xl flex items-center gap-2">
              <span>Para sair do modo tela cheia, precione <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-purple-300 font-mono text-[11px] font-semibold">Esc</kbd>.</span>
            </div>
          </div>
        )}

        {/* Buffering Spinner */}
        {isLoading && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-3 pointer-events-none">
            <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-zinc-300 tracking-wide">
              Conectando à transmissão...
            </span>
          </div>
        )}

        {/* Error Message with Fallback Explanation */}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-black/90 backdrop-blur-md z-20 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Falha na Reprodução Web</h4>
            <p className="text-xs text-zinc-300 max-w-sm leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tentar Novamente
              </button>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Voltar ao Texto
              </button>
            </div>
          </div>
        )}

        {/* Barra de Informações Rolante (Ticker estilo ESPN) na base do Player */}
        {channel.tickerEnabled && channel.tickerText && (
          <div className="absolute bottom-0 inset-x-0 z-20 overflow-hidden bg-black/90 backdrop-blur-md border-t border-zinc-800/90 shadow-2xl flex items-center h-7 sm:h-8 select-none pointer-events-auto">
            {/* Badge fixo do Ticker à esquerda */}
            <div className="relative z-10 flex items-center gap-1 px-2.5 sm:px-3 h-full bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white font-extrabold text-[9px] sm:text-[11px] tracking-wider uppercase shrink-0 shadow-lg shadow-red-950/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span className="font-mono">INFO</span>
            </div>

            {/* Trilho de texto contínuo deslizando da direita para a esquerda em loop */}
            <div className="relative flex-1 overflow-hidden h-full flex items-center">
              <div className="animate-ticker text-xs sm:text-[12px] font-semibold text-zinc-100 tracking-wide">
                <span className="inline-flex items-center gap-5 px-4">
                  <span>{channel.tickerText}</span>
                  <span className="text-cyan-400 font-bold">•</span>
                  <span className="text-zinc-300 font-medium">Gato Net Oficial</span>
                  <span className="text-cyan-400 font-bold">•</span>
                </span>
                <span className="inline-flex items-center gap-5 px-4">
                  <span>{channel.tickerText}</span>
                  <span className="text-cyan-400 font-bold">•</span>
                  <span className="text-zinc-300 font-medium">Gato Net Oficial</span>
                  <span className="text-cyan-400 font-bold">•</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CONTAINER FLUTUANTE DO BANNER IN-PLAY (A cada 2 minutos por 5 segundos com opacidade de 70%) */}
        {isInPlayVisible && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-35 max-w-[94%] sm:max-w-[540px] w-full transition-all duration-600 ease-out select-none pointer-events-auto ${
              isInPlayFading ? 'opacity-0 scale-95' : 'scale-100'
            }`}
            style={{
              bottom: channel.tickerEnabled && channel.tickerText ? '38px' : '16px',
              opacity: isInPlayFading ? 0 : 0.7,
            }}
          >
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-zinc-600/80 bg-zinc-900/90 backdrop-blur-sm group/inplay">
              {/* Botão fechar discreto */}
              <button
                type="button"
                onClick={dismissInPlayBanner}
                className="absolute top-1 right-1 z-40 w-5 h-5 rounded-full bg-black/80 hover:bg-black text-zinc-400 hover:text-white flex items-center justify-center text-[10px] transition-colors border border-zinc-700 cursor-pointer"
                title="Fechar anúncio"
                aria-label="Fechar anúncio"
              >
                ✕
              </button>

              {inPlayScript && inPlayScript.trim() ? (
                /* CÓDIGO REAL DO SCRIPT DE ANÚNCIO IN-PLAY INSERIDO NO PAINEL ADMIN */
                <div className="w-full min-h-[60px] max-h-[85px] flex items-center justify-center overflow-hidden bg-black/60 p-1">
                  <iframe
                    srcDoc={`<!DOCTYPE html>
<html>
<head>
  <base target="_blank">
  <style>
    body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; font-family: sans-serif; color: #fff; }
    img { max-width: 100%; height: auto; max-height: 75px; object-fit: contain; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${inPlayScript}
</body>
</html>`}
                    className="w-full h-[68px] sm:h-[75px] border-0 overflow-hidden bg-transparent pointer-events-auto"
                    sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                    title="Anúncio In-Play Real"
                  />
                </div>
              ) : (
                /* IMAGEM CINZA DE TESTE (PLACEHOLDER) TEMPORÁRIA */
                <div className="w-full flex items-center justify-center overflow-hidden">
                  <img
                    src={IN_PLAY_PLACEHOLDER_SVG_URL}
                    alt="Banner In-Play de Teste Temporário"
                    className="w-full h-auto object-contain block max-h-[68px]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player Controls Bar - some em tela cheia e ressurge ao mover o mouse */}
        <div
          className={`absolute ${channel.tickerEnabled && channel.tickerText ? 'bottom-7 sm:bottom-8' : 'bottom-0'} inset-x-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 sm:p-4 transition-all duration-300 flex items-center justify-between gap-3 z-25 ${
            isFullscreen
              ? showControls
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-4 pointer-events-none'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-zinc-300 hover:text-white transition-colors"
              aria-label={isMuted ? 'Desmutar' : 'Mutar'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Botão de Transmissão / Chromecast & AirPlay (Espelhamento para Smart TV) */}
            <div className="relative">
              <button
                type="button"
                onClick={handleCastButtonClick}
                title={
                  isTransmitting
                    ? `Transmitindo em: ${castState.connectedDeviceName || 'Smart TV'} (Clique para opções)`
                    : 'Transmitir para Smart TV (Chromecast & AirPlay)'
                }
                aria-label="Transmitir para Smart TV ou Chromecast"
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isTransmitting
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-500/20'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Cast className={`w-4 h-4 ${isTransmitting ? 'text-cyan-400 animate-pulse' : ''}`} />
                {isTransmitting && (
                  <span className="text-[10px] font-bold text-cyan-300 hidden sm:inline">
                    Na TV
                  </span>
                )}
              </button>

              {/* Menu Popover Flutuante de Espelhamento e Ajuda Wi-Fi */}
              {showCastMenu && (
                <div
                  ref={castMenuRef}
                  className="absolute bottom-full right-0 mb-3 w-72 rounded-xl bg-zinc-950/95 border border-zinc-800 backdrop-blur-xl shadow-2xl p-3 z-50 text-left space-y-2.5 pointer-events-auto"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Cast className="w-3.5 h-3.5 text-cyan-400" />
                      Espelhar na Smart TV
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCastMenu(false)}
                      className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                      aria-label="Fechar menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isTransmitting ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-800/70 text-xs text-cyan-200">
                        <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Transmitindo Agora
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-1 truncate">
                          Dispositivo: <strong>{castState.connectedDeviceName || 'Smart TV Conectada'}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleDisconnectCast}
                        className="w-full py-1.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Desconectar da TV
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Botão Chromecast / Google Cast */}
                      <button
                        type="button"
                        onClick={() => handleTriggerTarget('chromecast')}
                        className="w-full p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/60 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Cast className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                            Chromecast / Google TV
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            Samsung, LG, TCL, Roku, Fire TV
                          </div>
                        </div>
                      </button>

                      {/* Botão AirPlay (Apple) */}
                      <button
                        type="button"
                        onClick={() => handleTriggerTarget('airplay')}
                        className="w-full p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-purple-500/60 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-purple-300">
                            Apple AirPlay
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            iPhone, iPad, Mac & Apple TV
                          </div>
                        </div>
                      </button>

                      <div className="p-2 rounded-lg bg-black/60 border border-zinc-850 text-[10px] text-zinc-400 flex items-start gap-1.5 leading-relaxed">
                        <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          Para conectar, certifique-se de que sua <strong>Smart TV</strong> e seu aparelho estão na <strong>mesma rede Wi-Fi</strong>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isFullscreen && (
              <span className="text-xs font-semibold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-md">
                {channel.name}
              </span>
            )}
            <button
              onClick={toggleFullscreen}
              className="text-zinc-300 hover:text-white transition-colors p-1"
              aria-label="Tela cheia"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Abaixo Player (reallocado no lugar de Trocar de Jogo / Canal) - Oculto em tela cheia */}
      {!isFullscreen && belowPlayerSlot && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/90 p-2 sm:p-2.5">
          {belowPlayerSlot}
        </div>
      )}
    </div>
  );
};
