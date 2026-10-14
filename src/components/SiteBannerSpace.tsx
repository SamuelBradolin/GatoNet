import React, { useMemo, useState, useEffect } from 'react';
import { ExternalLink, Sparkles, Image as ImageIcon, Code, RefreshCw } from 'lucide-react';
import { SiteBannerItem, BannerPositionId } from '../types/channel.ts';

interface SiteBannerSpaceProps {
  positionId: BannerPositionId;
  banner?: SiteBannerItem;
  className?: string;
  onOpenAdmin?: () => void;
  // Fallback para o Topo do Player se o banner não tiver imagem mas o sponsorConfig legado tiver
  legacyFallback?: {
    imageUrl?: string;
    linkUrl?: string;
    altText?: string;
  };
}

export const SiteBannerSpace: React.FC<SiteBannerSpaceProps> = ({
  positionId,
  banner,
  className = '',
  onOpenAdmin,
  legacyFallback,
}) => {
  // Se o banner não estiver ativado ou não existir
  const isEnabled = banner?.enabled ?? (positionId === 'top_player' ? true : false);

  const effectiveBanner = useMemo<SiteBannerItem>(() => {
    if (banner) return banner;
    return {
      id: positionId,
      name: positionId,
      enabled: isEnabled,
      contentType: 'image',
      imageUrl: legacyFallback?.imageUrl || '',
      linkUrl: legacyFallback?.linkUrl || '',
      altText: legacyFallback?.altText || 'Banner',
      scriptCode: '',
      refreshIntervalSeconds: 60,
    };
  }, [banner, positionId, isEnabled, legacyFallback]);

  const isScript = effectiveBanner.contentType === 'script';
  const hasImage = Boolean(effectiveBanner.imageUrl || (positionId === 'top_player' && legacyFallback?.imageUrl));
  const effectiveImageUrl = effectiveBanner.imageUrl || legacyFallback?.imageUrl || '';
  const effectiveLinkUrl = effectiveBanner.linkUrl || legacyFallback?.linkUrl || '';
  const effectiveAlt = effectiveBanner.altText || legacyFallback?.altText || effectiveBanner.name;
  const hasScript = Boolean(effectiveBanner.scriptCode?.trim());
  const intervalSeconds = Math.max(5, effectiveBanner.refreshIntervalSeconds || 60);

  // Auto-refresh (Tempo de Rotação) para banners de script ativos
  const [refreshCycle, setRefreshCycle] = useState<number>(0);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  useEffect(() => {
    if (!isEnabled || !isScript || !hasScript) return;

    // Configura o temporizador de rotação para recarregar o bloco do anúncio
    const timer = setInterval(() => {
      setIsRotating(true);
      setRefreshCycle((prev) => prev + 1);
      const resetFlag = setTimeout(() => {
        setIsRotating(false);
      }, 400);
      return () => clearTimeout(resetFlag);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [isEnabled, isScript, hasScript, intervalSeconds, positionId, effectiveBanner.scriptCode]);

  if (!isEnabled) {
    return null;
  }

  // Configurações visuais específicas de altura por posição
  const containerClassesByPosition: Record<BannerPositionId, string> = {
    header_beside_logo: 'max-h-14 sm:max-h-16 w-auto max-w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-md',
    top_player: 'rounded-2xl overflow-hidden border border-zinc-700/60 shadow-xl bg-zinc-900/80 w-full',
    below_player: 'rounded-2xl overflow-hidden border border-zinc-800/80 shadow-lg bg-zinc-900/70 w-full',
    above_channels: 'rounded-2xl overflow-hidden border border-zinc-800/80 shadow-lg bg-zinc-900/70 w-full',
    below_channels: 'rounded-2xl overflow-hidden border border-zinc-800/80 shadow-lg bg-zinc-900/70 w-full',
  };

  const iframeHeightByPosition: Record<BannerPositionId, string> = {
    header_beside_logo: 'h-[50px] sm:h-[60px]',
    top_player: 'h-[100px] sm:h-[130px] md:h-[160px]',
    below_player: 'h-[90px] sm:h-[120px]',
    above_channels: 'h-[90px] sm:h-[120px]',
    below_channels: 'h-[90px] sm:h-[120px]',
  };

  // 1. RENDERIZAÇÃO DE CÓDIGO DE SCRIPT / ADSTERRA / HTML
  if (isScript) {
    if (hasScript) {
      return (
        <div 
          className={`site-banner-space site-banner-${positionId} relative group transition-all duration-300 ${containerClassesByPosition[positionId]} ${className}`}
          data-banner-position={positionId}
        >
          <div className="absolute top-1 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-black/75 text-zinc-400 border border-zinc-800 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>Publicidade</span>
            <span className="text-cyan-400 font-semibold" title={`Auto-refresh a cada ${intervalSeconds} segundos`}>
              • {intervalSeconds}s
            </span>
          </div>

          {/* Iframe isolado recarregado via setInterval gerando novas impressões sem fechar o espaço */}
          <iframe
            key={`banner-${positionId}-cycle-${refreshCycle}`}
            srcDoc={`<!DOCTYPE html>
<html>
<head>
  <base target="_blank">
  <!-- ad-impression-cycle: ${refreshCycle} - ts: ${Date.now()} -->
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      color: #e4e4e7;
    }
    img {
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${effectiveBanner.scriptCode}
</body>
</html>`}
            className={`w-full ${iframeHeightByPosition[positionId]} border-0 overflow-hidden bg-transparent block transition-opacity duration-300 ${
              isRotating ? 'opacity-90' : 'opacity-100'
            }`}
            sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
            title={`Anúncio: ${effectiveBanner.name} (Ciclo ${refreshCycle})`}
          />
        </div>
      );
    }

    // Script ativado porém ainda sem código colado
    return (
      <div
        onClick={onOpenAdmin}
        className={`site-banner-space site-banner-${positionId} cursor-pointer p-4 text-center border border-dashed border-cyan-800/60 hover:border-cyan-500 rounded-2xl bg-cyan-950/20 text-xs transition-colors flex items-center justify-center gap-2 group ${className}`}
        title="Clique para configurar o código do anúncio no Painel Admin"
      >
        <Code className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-zinc-300 font-medium">
          Espaço de Script Ativo ({effectiveBanner.name}) — Cole o código no Painel Admin.
        </span>
      </div>
    );
  }

  // 2. RENDERIZAÇÃO DE IMAGEM ESTÁTICA
  if (hasImage) {
    const isHeader = positionId === 'header_beside_logo';
    const content = (
      <div className={`relative overflow-hidden group ${isHeader ? 'flex items-center justify-center' : 'block'}`}>
        <img
          src={effectiveImageUrl}
          alt={effectiveAlt}
          className={`w-full ${
            isHeader 
              ? 'h-auto max-h-12 sm:max-h-14 object-contain' 
              : 'h-auto max-h-56 object-cover hover:scale-[1.01]'
          } transition-transform duration-300`}
        />
        {effectiveLinkUrl && !isHeader && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 border border-zinc-700 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3 h-3 text-cyan-400" />
            <span>Visitar Patrocinador</span>
          </div>
        )}
      </div>
    );

    return (
      <div 
        className={`site-banner-space site-banner-${positionId} relative group transition-all duration-300 ${containerClassesByPosition[positionId]} ${className}`}
        data-banner-position={positionId}
      >
        {effectiveLinkUrl ? (
          <a
            href={effectiveLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
            title={effectiveAlt}
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    );
  }

  // Se for o Topo do Player e não houver imagem configurada, exibe o placeholder convidativo
  if (positionId === 'top_player') {
    return (
      <div
        onClick={onOpenAdmin}
        className={`w-full py-8 sm:py-10 px-6 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed border-zinc-700 hover:border-purple-500/80 rounded-2xl bg-gradient-to-r from-purple-950/20 via-zinc-900/50 to-blue-950/20 transition-colors group/banner ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mb-3 group-hover/banner:scale-105 transition-transform">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <span className="text-sm font-bold text-white mb-1">
          Espaço do Banner do Patrocinador (Topo do Player)
        </span>
        <span className="text-xs text-zinc-400 max-w-sm">
          Clique aqui ou acesse o <strong>Painel Admin</strong> para subir a imagem ou configurar scripts de anúncio.
        </span>
      </div>
    );
  }

  // Para outros espaços habilitados sem imagem
  return (
    <div
      onClick={onOpenAdmin}
      className={`site-banner-space site-banner-${positionId} cursor-pointer p-4 text-center border border-dashed border-zinc-800 hover:border-purple-500 rounded-2xl bg-zinc-900/30 text-xs transition-colors flex items-center justify-center gap-2 group ${className}`}
      title="Clique para configurar este banner no Painel Admin"
    >
      <ImageIcon className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:scale-110 transition-transform" />
      <span className="text-zinc-400 font-medium group-hover:text-zinc-200">
        Espaço Ativo: {effectiveBanner.name} (Clique para configurar imagem ou script)
      </span>
    </div>
  );
};
