import React from 'react';
import { Tv, Smartphone, Monitor, Cast, CheckCircle2, ShieldCheck, Film, Trophy, Radio, Flame } from 'lucide-react';

export const DeviceCompatibility: React.FC = () => {
  const categories = [
    {
      title: 'Esportes Ao Vivo',
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      desc: 'Futebol Nacional e Internacional, UFC, Basquete, F1 e Campeonatos ao vivo em 60 FPS.',
    },
    {
      title: 'Filmes & Séries',
      icon: <Film className="w-5 h-5 text-purple-400" />,
      desc: 'Mais de 30.000 títulos atualizados com lançamentos do cinema, dublados e legendados.',
    },
    {
      title: 'Canais Abertos & Fechados',
      icon: <Tv className="w-5 h-5 text-cyan-400" />,
      desc: 'Toda a grade da TV fechada e canais abertos com sinal limpo em 4K, Full HD e HD.',
    },
    {
      title: 'Documentários & Variedades',
      icon: <Radio className="w-5 h-5 text-emerald-400" />,
      desc: 'Cultura, natureza, culinária, desenhos para crianças e canais 24h sem interrupção.',
    },
  ];

  const devices = [
    {
      name: 'Smart TVs',
      desc: 'Samsung (Tizen), LG (webOS), TCL, Sony, Philco, Philips.',
      icon: <Tv className="w-6 h-6 text-purple-400" />,
    },
    {
      name: 'TV Box & Sticks',
      desc: 'Xiaomi Mi Box/Stick, Fire TV Stick, Chromecast com Google TV, MXQ, TX3.',
      icon: <Cast className="w-6 h-6 text-cyan-400" />,
    },
    {
      name: 'Celulares & Tablets',
      desc: 'Smartphones e tablets Android, iPhones e iPads (iOS).',
      icon: <Smartphone className="w-6 h-6 text-blue-400" />,
    },
    {
      name: 'Computadores',
      desc: 'Windows 10/11, macOS, Linux através de navegadores ou reprodutor VLC.',
      icon: <Monitor className="w-6 h-6 text-indigo-400" />,
    },
  ];

  return (
    <section className="py-20 relative bg-zinc-950/80 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* Categories Showcase */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              Conteúdo Sem Limites
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              O Que Você Terá Acesso na Lista
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Uma biblioteca digital completa reunida em um único arquivo leve e organizado por categorias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{cat.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Compatibility */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              100% Multiplataforma
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Assista Onde e Quando Quiser
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              A lista .m3u funciona nos aplicativos mais populares do mercado sem requerer conhecimento técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {devices.map((device, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center">
                  {device.icon}
                </div>
                <h3 className="text-base font-bold text-white">{device.name}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{device.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
