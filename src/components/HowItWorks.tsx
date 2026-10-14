import React from 'react';
import { Download, Tv, PlayCircle, Cpu, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      icon: <Download className="w-6 h-6 text-purple-400" />,
      title: 'Baixe o Arquivo .M3U',
      description: 'Receba o arquivo digital ou URL direta com a grade completa de canais otimizada para sua conexão.',
      badge: 'Download Rápido'
    },
    {
      number: '02',
      icon: <Cpu className="w-6 h-6 text-cyan-400" />,
      title: 'Importe no seu Aplicativo',
      description: 'Abra no seu app preferido como IPTV Smarters Pro, XCIPTV, SS IPTV, TiviMate, VLC ou Smart IPTV.',
      badge: 'Sem Equipamentos Extras'
    },
    {
      number: '03',
      icon: <PlayCircle className="w-6 h-6 text-indigo-400" />,
      title: 'Assista Instantaneamente',
      description: 'Aproveite milhares de canais abertos, fechados, filmes e campeonatos esportivos sem travar.',
      badge: 'Qualidade 4K / FHD'
    }
  ];

  return (
    <section id="como-funciona" className="py-20 relative bg-zinc-950/60 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Tv className="w-3.5 h-3.5" />
            Simplicidade Total
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Como Funciona a <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Gato Net</span>?
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Em menos de 2 minutos você configura sua lista digital em qualquer aparelho. Não necessita de antenas ou aparelhos caros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 hover:border-purple-500/50 hover:bg-zinc-900/90 transition-all duration-300 group shadow-lg shadow-black/40"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  {step.icon}
                </div>
                <span className="text-3xl font-black text-zinc-800 group-hover:text-purple-500/30 transition-colors">
                  {step.number}
                </span>
              </div>

              <div className="inline-block px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 text-[11px] font-semibold mb-3 border border-zinc-700/40">
                {step.badge}
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quick compatible apps list banner */}
        <div className="mt-14 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-zinc-300">
              <strong className="text-white">Aplicativos recomendados:</strong> IPTV Smarters Pro, XCIPTV, TiviMate, SS IPTV, Smart IPTV, VLC Player, Kodi, IBO Player.
            </p>
          </div>
          <a
            href="#teste-gratis"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 underline underline-offset-4"
          >
            Experimentar agora com teste grátis &rarr;
          </a>
        </div>
      </div>
    </section>
  );
};
