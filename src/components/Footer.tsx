import React, { useState } from 'react';
import { Tv, ShieldCheck, Heart, FileText, Lock, AlertCircle, X } from 'lucide-react';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  const [activeModal, setActiveModal] = useState<'termos' | 'privacidade' | 'aviso' | null>(null);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-zinc-800/80 pt-16 pb-12 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Sobre */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black border border-cyan-500/40 overflow-hidden shadow-md shadow-cyan-500/20 flex items-center justify-center shrink-0">
                <img
                  src="/src/assets/images/gato_net_logo_1791893568109.jpg"
                  alt="Logo Gato Net"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-lg font-black tracking-tight text-white font-sans">
                Gato <span className="text-cyan-400">Net</span>
              </span>
            </div>
            <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
              Sua plataforma completa para acompanhar transmissões esportivas e jogos ao vivo em alta definição. Assista direto do seu navegador no celular, computador ou envie para sua Smart TV.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              Transmissão HD sem travamentos e com suporte a Chromecast / AirPlay
            </div>
          </div>

          {/* Links de Navegação */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#inicio" className="hover:text-white transition-colors">Início</a>
              </li>
            </ul>
          </div>

          {/* Termos & Políticas */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Institucional
            </h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveModal('termos')}
                  className="hover:text-white transition-colors text-left focus:outline-none flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  Termos de Uso
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal('privacidade')}
                  className="hover:text-white transition-colors text-left focus:outline-none flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  Política de Privacidade
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveModal('aviso')}
                  className="hover:text-white transition-colors text-left focus:outline-none flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                  Aviso Legal
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Legal */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-500 text-[11px] leading-relaxed">
          <strong className="text-zinc-400">Aviso Legal:</strong> O Gato Net atua exclusivamente como um reprodutor e indexador de mídias e transmissões publicamente disponíveis na web. O site não armazena, hospeda ou transmite arquivos próprios em seus servidores, cabendo aos usuários a conformidade com as legislações locais e direitos autorais.
        </div>

        {/* Linha de Direitos Autorais */}
        <div className="border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>
            ©{' '}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-zinc-300 hover:underline underline-offset-4 cursor-pointer transition-colors focus:outline-none font-inherit text-inherit"
              title="Acesso Administrativo"
            >
              2026
            </button>{' '}
            Gato Net. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Desenvolvido com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para alta performance
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Termos / Privacidade / Aviso Legal */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full text-slate-200 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {activeModal === 'termos' && 'Termos de Uso'}
                {activeModal === 'privacidade' && 'Política de Privacidade'}
                {activeModal === 'aviso' && 'Aviso Legal'}
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 space-y-2 max-h-80 overflow-y-auto pr-2 leading-relaxed">
              {activeModal === 'termos' && (
                <>
                  <p>1. Ao utilizar a plataforma Gato Net, você tem acesso a ferramentas de transmissão e reprodução de eventos esportivos ao vivo para uso pessoal e recreativo.</p>
                  <p>2. A plataforma destina-se a reproduzir sinais públicos e conteúdos de entretenimento de forma gratuita diretamente no navegador.</p>
                  <p>3. Os usuários são responsáveis pelo uso adequado da plataforma e pela conformidade com as legislações locais.</p>
                </>
              )}
              {activeModal === 'privacidade' && (
                <>
                  <p>Utilizamos tecnologias padrão de sessão e cookies técnicos estritamente necessários para otimizar o carregamento do player de vídeo e a estabilidade da transmissão ao vivo.</p>
                </>
              )}
              {activeModal === 'aviso' && (
                <>
                  <p>O Gato Net atua exclusivamente como um reprodutor e indexador de mídias e transmissões publicamente disponíveis na web.</p>
                  <p>O site não armazena, hospeda ou transmite arquivos próprios em seus servidores, cabendo aos usuários a conformidade com as legislações locais e direitos autorais.</p>
                </>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
