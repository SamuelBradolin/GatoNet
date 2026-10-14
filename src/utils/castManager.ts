// Chromecast and AirPlay transmission management utility for Smart TVs
import '../types/cast.d.ts';

export interface CastDeviceState {
  isCastApiLoaded: boolean;
  isCastConnected: boolean;
  isAirPlayAvailable: boolean;
  isAirPlayConnected: boolean;
  connectedDeviceName?: string;
}

type CastListener = (state: CastDeviceState) => void;

class CastManager {
  private static instance: CastManager;
  private listeners: Set<CastListener> = new Set();
  private initialized = false;
  private state: CastDeviceState = {
    isCastApiLoaded: false,
    isCastConnected: false,
    isAirPlayAvailable: false,
    isAirPlayConnected: false,
    connectedDeviceName: undefined,
  };

  private constructor() {
    this.setupCastFramework();
  }

  public static getInstance(): CastManager {
    if (!CastManager.instance) {
      CastManager.instance = new CastManager();
    }
    return CastManager.instance;
  }

  public getState(): CastDeviceState {
    return { ...this.state };
  }

  public subscribe(listener: CastListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.warn('Cast listener error:', err);
      }
    });
  }

  private setupCastFramework() {
    if (typeof window === 'undefined') return;

    // Check if Google Cast API is already ready
    if (window.cast?.framework?.CastContext) {
      this.initializeCastContext();
      return;
    }

    // Google Cast SDK callback hook
    const previousCallback = window.__onGCastApiAvailable;
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (typeof previousCallback === 'function') {
        try {
          previousCallback(isAvailable);
        } catch (e) {
          console.warn('Previous cast callback error', e);
        }
      }

      if (isAvailable) {
        this.initializeCastContext();
      }
    };
  }

  private initializeCastContext() {
    if (this.initialized) return;
    try {
      if (!window.cast?.framework?.CastContext) return;

      const castContext = window.cast.framework.CastContext.getInstance();
      const defaultAppId =
        window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ||
        'CC1AD845'; // Default Media Receiver

      castContext.setOptions({
        receiverApplicationId: defaultAppId,
        autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped',
      });

      this.state.isCastApiLoaded = true;

      // Listen for Cast State Changes (e.g. CONNECTED, CONNECTING, NOT_CONNECTED)
      const CastContextEventType = window.cast.framework.CastContextEventType;
      if (CastContextEventType) {
        castContext.addEventListener(
          CastContextEventType.CAST_STATE_CHANGED,
          (event: any) => {
            const castState = event.castState;
            const isConnected = castState === 'CONNECTED';
            const session = castContext.getCurrentSession();
            const deviceName = session?.getCastDevice()?.friendlyName || undefined;

            this.state.isCastConnected = isConnected;
            this.state.connectedDeviceName = isConnected ? deviceName : undefined;
            this.notify();
          }
        );

        castContext.addEventListener(
          CastContextEventType.SESSION_STATE_CHANGED,
          (event: any) => {
            const session = castContext.getCurrentSession();
            const isConnected = !!session;
            const deviceName = session?.getCastDevice()?.friendlyName || undefined;

            this.state.isCastConnected = isConnected;
            this.state.connectedDeviceName = isConnected ? deviceName : undefined;
            this.notify();
          }
        );
      }

      const initialSession = castContext.getCurrentSession();
      if (initialSession) {
        this.state.isCastConnected = true;
        this.state.connectedDeviceName = initialSession.getCastDevice()?.friendlyName;
      }

      this.initialized = true;
      this.notify();
    } catch (err) {
      console.warn('Error initializing Google Cast Context:', err);
    }
  }

  /**
   * Registra elementos de vídeo para monitoramento de AirPlay (Safari/iOS/macOS)
   */
  public registerVideoElement(video: HTMLVideoElement): () => void {
    if (!video) return () => {};

    // Verifica se AirPlay é suportado nativamente
    const hasAirPlay =
      typeof (video as any).webkitShowPlaybackTargetPicker === 'function' ||
      typeof window.WebKitPlaybackTargetAvailabilityEvent !== 'undefined';

    if (hasAirPlay) {
      this.state.isAirPlayAvailable = true;
      this.notify();
    }

    const onTargetAvailabilityChanged = (event: any) => {
      this.state.isAirPlayAvailable = event.availability === 'available';
      this.notify();
    };

    const onCurrentTargetWireless = (event: any) => {
      const isWireless = !!(video as any).webkitCurrentPlaybackTargetIsWireless;
      this.state.isAirPlayConnected = isWireless;
      if (isWireless) {
        this.state.connectedDeviceName = 'Apple AirPlay / Apple TV';
      } else if (!this.state.isCastConnected) {
        this.state.connectedDeviceName = undefined;
      }
      this.notify();
    };

    video.addEventListener(
      'webkitplaybacktargetavailabilitychanged',
      onTargetAvailabilityChanged
    );
    video.addEventListener(
      'webkitcurrentplaybacktargetiswireless',
      onCurrentTargetWireless
    );

    return () => {
      video.removeEventListener(
        'webkitplaybacktargetavailabilitychanged',
        onTargetAvailabilityChanged
      );
      video.removeEventListener(
        'webkitcurrentplaybacktargetiswireless',
        onCurrentTargetWireless
      );
    };
  }

  /**
   * Abre o menu nativo do sistema do usuário para escolher Smart TV, Chromecast ou AirPlay
   */
  public async requestPlaybackTarget(
    video: HTMLVideoElement | null,
    preferredProtocol?: 'chromecast' | 'airplay' | 'auto'
  ): Promise<boolean> {
    // 1. Caso preferido seja AirPlay ou se o usuário estiver no Safari/iOS com AirPlay ativo
    if (
      (preferredProtocol === 'airplay' || preferredProtocol === 'auto') &&
      video &&
      typeof (video as any).webkitShowPlaybackTargetPicker === 'function'
    ) {
      try {
        (video as any).webkitShowPlaybackTargetPicker();
        return true;
      } catch (err) {
        console.warn('AirPlay target picker falhou, tentando fallback:', err);
      }
    }

    // 2. Google Cast Framework (Chromecast, Android TV, Google TV, TVs TCL, Philips, etc.)
    if (
      preferredProtocol !== 'airplay' &&
      window.cast?.framework?.CastContext
    ) {
      try {
        const castContext = window.cast.framework.CastContext.getInstance();
        await castContext.requestSession();
        return true;
      } catch (err: any) {
        // Se o usuário simplesmente cancelou o popup, não é erro crítico
        if (err !== 'cancel' && err?.message !== 'cancel') {
          console.warn('Google Cast requestSession retorno:', err);
        }
      }
    }

    // 3. W3C Remote Playback API nativa do Chromium (Google Chrome, Microsoft Edge, Brave, Samsung Internet)
    if (video && video.remote && typeof video.remote.prompt === 'function') {
      try {
        await video.remote.prompt();
        return true;
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.warn('Remote playback prompt retorno:', err);
        }
      }
    }

    // Se o protocolo preferencial foi AirPlay e nada abriu
    if (
      preferredProtocol === 'airplay' &&
      video &&
      typeof (video as any).webkitShowPlaybackTargetPicker === 'function'
    ) {
      (video as any).webkitShowPlaybackTargetPicker();
      return true;
    }

    return false;
  }

  /**
   * Envia a transmissão ao vivo atual para o Chromecast conectado
   */
  public async loadMediaToCast(options: {
    streamUrl: string;
    title: string;
    subtitle?: string;
    logoUrl?: string;
  }): Promise<boolean> {
    if (!window.cast?.framework?.CastContext || !window.chrome?.cast?.media) {
      return false;
    }

    const castContext = window.cast.framework.CastContext.getInstance();
    const session = castContext.getCurrentSession();
    if (!session) return false;

    try {
      const contentType = options.streamUrl.includes('.m3u8')
        ? 'application/x-mpegurl'
        : 'video/mp4';

      const mediaInfo = new window.chrome.cast.media.MediaInfo(
        options.streamUrl,
        contentType
      );
      mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE;

      const metadata = new window.chrome.cast.media.GenericMediaMetadata();
      metadata.title = options.title;
      metadata.subtitle = options.subtitle || 'Gato Net • Transmissão ao Vivo HD';

      if (options.logoUrl) {
        metadata.images = [{ url: options.logoUrl }];
      }

      mediaInfo.metadata = metadata;

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;

      await session.loadMedia(request);
      return true;
    } catch (err) {
      console.warn('Erro ao carregar stream no Chromecast:', err);
      return false;
    }
  }

  /**
   * Encerra a transmissão do Chromecast
   */
  public endCastSession() {
    try {
      if (window.cast?.framework?.CastContext) {
        const castContext = window.cast.framework.CastContext.getInstance();
        castContext.endCurrentSession(true);
      }
    } catch (err) {
      console.warn('Erro ao encerrar sessão Cast:', err);
    }
  }
}

export const castManager = CastManager.getInstance();
