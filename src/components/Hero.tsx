import React from 'react';
import { ArrowDown, Tv, Smartphone, Monitor, ShieldCheck, Zap, DownloadCloud, Sparkles } from 'lucide-react';

interface HeroProps {
  onScrollToPurchase: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToPurchase }) => {
  return (
    <section 
      id="inicio" 
      className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden"
    >
      {/* Background ambient neon glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[350px] h-[250px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '36px 36px'
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        
        {/* Badge status */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-semibold shadow-inner shadow-purple-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span>Lista Digital M3U Atualizada 2026 • Servidores Rápidos Anti-Travamento</span>
        </div>

        {/* Título Chamativo (H1) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
          Acesso Imediato à Sua <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            Lista de Canais Completa
          </span>{' '}
          em Qualquer Dispositivo
        </h1>

        {/* Subtítulo Curto */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-zinc-300 font-normal leading-relaxed">
          Pagamento único e sem mensalidades. Tenha todos os canais, filmes e esportes em 4K e Full HD diretamente no seu aplicativo preferido.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Botão de chamada para ação (CTA) grande e destacado */}
          <button
            onClick={onScrollToPurchase}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base sm:text-lg tracking-wide shadow-xl shadow-purple-600/35 hover:shadow-purple-600/50 hover:scale-102 transition-all duration-200 flex items-center justify-center gap-3 group border border-purple-400/30 cursor-pointer"
          >
            <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 group-hover:scale-110 transition-transform" />
            <span>Garantir Minha Lista Agora</span>
          </button>

          {/* Teste Grátis Secondary CTA */}
          <a
            href="#teste-gratis"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 text-zinc-200 hover:text-white font-bold text-base border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2.5"
          >
            <DownloadCloud className="w-5 h-5 text-cyan-400" />
            <span>Testar Lista Grátis</span>
          </a>
        </div>

        {/* Trust highlights */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-zinc-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sem fidelidade ou mensalidade</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>Arquivo .m3u instantâneo</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Qualidade 4K &amp; Full HD</span>
          </div>
        </div>

        {/* Devices support badges preview */}
        <div className="pt-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            Compatível com qualquer tela e sistema
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850/80 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-medium">
              <Tv className="w-4 h-4 text-purple-400" />
              Smart TV (Samsung/LG/TCL)
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-medium">
              <Tv className="w-4 h-4 text-cyan-400" />
              TV Box &amp; Fire TV Stick
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-medium">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Android &amp; iPhone (iOS)
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-medium">
              <Monitor className="w-4 h-4 text-indigo-400" />
              Computador &amp; Notebook
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="pt-4 flex justify-center">
          <a
            href="#como-funciona"
            className="text-zinc-500 hover:text-zinc-300 transition-colors animate-bounce p-2"
            aria-label="Rolar para Como Funciona"
          >
            <ArrowDown className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};
