import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, 
  Play, 
  Sparkles, 
  Settings2,
  Tv,
  ExternalLink,
  Zap,
  TrendingUp,
  Tag
} from 'lucide-react';
import { TestChannel, SponsorConfig, DEFAULT_SPONSOR_CONFIG } from '../types/channel.ts';
import { getStoredSponsorConfig, syncSponsorWithBackend } from '../utils/channelStorage.ts';
import { VideoPlayer } from './VideoPlayer.tsx';
import { SiteBannerSpace } from './SiteBannerSpace.tsx';

interface FreeTrialProps {
  channels: TestChannel[];
  activeChannel: TestChannel | null;
  onPlayChannel: (channel: TestChannel) => void;
  onClosePlayer: () => void;
  onOpenAdmin: () => void;
}

export const FreeTrial: React.FC<FreeTrialProps> = ({
  channels,
  activeChannel,
  onPlayChannel,
  onClosePlayer,
  onOpenAdmin,
}) => {
  const [sponsorConfig, setSponsorConfig] = useState<SponsorConfig>(DEFAULT_SPONSOR_CONFIG);
  const playerAreaRef = useRef<HTMLDivElement | null>(null);

  // Quando o usuário clica em Play, traz o player suavemente para a visão na tela
  useEffect(() => {
    if (activeChannel && playerAreaRef.current) {
      playerAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeChannel?.id]);

  useEffect(() => {
    setSponsorConfig(getStoredSponsorConfig());
    syncSponsorWithBackend().then((data) => {
      if (data) setSponsorConfig(data);
    });

    const handleUpdate = () => {
      setSponsorConfig(getStoredSponsorConfig());
    };
    window.addEventListener('brado_sponsor_updated', handleUpdate);
    return () => window.removeEventListener('brado_sponsor_updated', handleUpdate);
  }, []);

  const activeChannels = channels.filter((c) => c.active);
  const activeCards = (sponsorConfig.cards || []).filter((card) => card.active);

  const getThemeClasses = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          border: 'border-emerald-500/40 hover:border-emerald-400',
          bg: 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
          highlight: 'text-emerald-400',
          btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50',
        };
      case 'amber':
        return {
          border: 'border-amber-500/40 hover:border-amber-400',
          bg: 'bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
          highlight: 'text-amber-400',
          btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50',
        };
      case 'purple':
        return {
          border: 'border-purple-500/40 hover:border-purple-400',
          bg: 'bg-gradient-to-br from-purple-950/40 via-zinc-900/90 to-zinc-950',
          badge: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
          highlight: 'text-purple-400',
          btn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50',
        };
      case 'blue':
        return {
          border: 'border-blue-500/40 hover:border-blue-400',
          bg: 'bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-zinc-950',
          badge: 'bg-blue-950/80 text-blue-300 border-blue-700/50',
          highlight: 'text-blue-400',
          btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50',
        };
      default: // cyan
        return {
          border: 'border-cyan-500/40 hover:border-cyan-400',
          bg: 'bg-gradient-to-br from-cyan-950/40 via-zinc-900/90 to-zinc-950',
          badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
          highlight: 'text-cyan-400',
          btn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50',
        };
    }
  };

  return (
    <section id="inicio" className="py-12 sm:py-16 relative bg-zinc-950 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 p-8 sm:p-12 shadow-2xl shadow-cyan-950/20">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Lado Esquerdo: Banner do Patrocinador, Texto Editável e Cards (Odds, Bilhetes, etc.) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  {sponsorConfig.tagline || 'Parceiro Oficial & Patrocinador'}
                </div>
              </div>

              {/* BANNER 1: Topo do Player de Vídeo (O espaço atual) */}
              <SiteBannerSpace
                positionId="top_player"
                banner={sponsorConfig.banners?.top_player}
                onOpenAdmin={onOpenAdmin}
                legacyFallback={{
                  imageUrl: sponsorConfig.bannerImageUrl,
                  linkUrl: sponsorConfig.bannerLinkUrl,
                  altText: sponsorConfig.bannerAltText,
                }}
              />

              {/* LOCAL ONDE AO CLICAR EM PLAY O VÍDEO APARECE NO LUGAR DO TEXTO DE APRESENTAÇÃO */}
              <div ref={playerAreaRef} className="scroll-mt-24 transition-all duration-300">
                {activeChannel ? (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <VideoPlayer
                      channel={activeChannel}
                      channels={activeChannels}
                      onSelectChannel={onPlayChannel}
                      onClose={onClosePlayer}
                      belowPlayerSlot={
                        <SiteBannerSpace
                          positionId="below_player"
                          banner={sponsorConfig.banners?.below_player}
                          onOpenAdmin={onOpenAdmin}
                        />
                      }
                    />
                  </div>
                ) : (
                  /* TEXTO EDITÁVEL DE APRESENTAÇÃO (Disponível somente ao acessar o site pois não terá nenhum vídeo sendo exibido) */
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 text-sm sm:text-base leading-relaxed shadow-inner">
                      <p className="leading-relaxed">
                        {sponsorConfig.description}
                      </p>
                    </div>

                    {/* BANNER 3: Abaixo do Player de Vídeo */}
                    <SiteBannerSpace
                      positionId="below_player"
                      banner={sponsorConfig.banners?.below_player}
                      onOpenAdmin={onOpenAdmin}
                    />
                  </div>
                )}
              </div>

              {/* CARDS PERSONALIZADOS EDITÁVEIS (ODDS, BILHETES PRONTOS, PROMOÇÕES) */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCards.length > 0 ? (
                    activeCards.map((card) => {
                      const t = getThemeClasses(card.themeColor);
                      return (
                        <div
                          key={card.id}
                          className={`p-4 rounded-2xl border ${t.border} ${t.bg} shadow-lg transition-all flex flex-col justify-between gap-3 group/card`}
                        >
                          <div className="space-y-1.5">
                            {card.badge && (
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${t.badge}`}>
                                  {card.badge}
                                </span>
                                {card.highlightText && (
                                  <span className={`text-xs font-bold font-mono ${t.highlight}`}>
                                    {card.highlightText}
                                  </span>
                                )}
                              </div>
                            )}
                            <h4 className="text-sm font-bold text-white group-hover/card:text-cyan-300 transition-colors">
                              {card.title}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-snug">
                              {card.description}
                            </p>
                          </div>

                          {card.imageUrl && (
                            <div className="w-full rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950/80 flex items-center justify-center my-1.5 p-1 shadow-inner">
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                className="w-full h-auto max-h-52 object-contain rounded-lg transition-transform duration-300 group-hover/card:scale-[1.01]"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {card.buttonText && (
                            <a
                              href={card.linkUrl || '#'}
                              target={card.linkUrl && card.linkUrl !== '#' ? '_blank' : '_self'}
                              rel="noopener noreferrer"
                              className={`w-full py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-md ${t.btn}`}
                            >
                              <span>{card.buttonText}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div
                      onClick={onOpenAdmin}
                      className="col-span-full p-4 rounded-2xl border border-dashed border-zinc-800 text-center cursor-pointer hover:border-purple-600/60 bg-zinc-900/40 text-xs text-zinc-400"
                    >
                      Nenhum card ativo. Clique para adicionar bilhetes prontos, odds ou ofertas no Painel Admin.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Painel lateral: Lista de canais de demonstração com botões de PLAY INTEGRADOS */}
            <div className="lg:col-span-5 space-y-4">
              {/* BANNER 4: Acima da lista de Canais de Teste Ativos */}
              <SiteBannerSpace
                positionId="above_channels"
                banner={sponsorConfig.banners?.above_channels}
                onOpenAdmin={onOpenAdmin}
              />

              <div className="rounded-2xl bg-zinc-900/95 border border-zinc-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold text-white">Jogos De Hoje</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400">
                  Clique no botão <span className="text-cyan-300 font-semibold">Play</span> de qualquer canal para abrir a transmissão ao vivo na tela:
                </p>

                {/* Lista de Canais com Botão de Play */}
                <div className="space-y-2.5">
                  {activeChannels.map((channel) => {
                    const isSelected = activeChannel?.id === channel.id;
                    return (
                      <div 
                        key={channel.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all group shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/70 via-zinc-900 to-zinc-900 border border-cyan-500/80 shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                            : 'bg-zinc-950/80 border border-zinc-800/90 hover:border-purple-500/60 hover:bg-zinc-900/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {/* Botão de Play que abre o player no local do texto */}
                          <button
                            type="button"
                            onClick={() => onPlayChannel(channel)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-white shadow-emerald-600/40 animate-pulse'
                                : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-600/30'
                            }`}
                            aria-label={`Reproduzir ${channel.name}`}
                            title={isSelected ? `${channel.name} está reproduzindo no player` : `Assistir ${channel.name} ao vivo`}
                          >
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </button>
                          
                          <div className="truncate text-left">
                            <button
                              type="button"
                              onClick={() => onPlayChannel(channel)}
                              className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate block text-left hover:underline cursor-pointer"
                            >
                              {channel.name}
                            </button>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500">
                                {channel.category}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  • No Player
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isSelected
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                              : 'bg-purple-950/70 text-purple-300 border-purple-800/50'
                          }`}>
                            {channel.quality}
                          </span>
                          
                          {/* Botão de texto rápido 'Assistir' */}
                          <button
                            type="button"
                            onClick={() => onPlayChannel(channel)}
                            className={`hidden sm:inline-flex text-[11px] font-bold transition-colors px-2.5 py-1 rounded-lg ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'text-cyan-400 hover:text-cyan-300 bg-zinc-800 hover:bg-zinc-750'
                            }`}
                          >
                            {isSelected ? 'No Player' : 'Assistir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BANNER 5: Abaixo da lista de Canais de Teste Ativos */}
              <SiteBannerSpace
                positionId="below_channels"
                banner={sponsorConfig.banners?.below_channels}
                onOpenAdmin={onOpenAdmin}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
