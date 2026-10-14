import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'O que é o arquivo de lista digital .m3u?',
      a: 'O .m3u é o formato padrão universal de playlists de canais e multimídia. Ele permite que qualquer player compatível (como IPTV Smarters, VLC, SS IPTV ou Smart STB) carregue instantaneamente os links dos canais organizados por categorias e com logotipo.'
    },
    {
      q: 'O pagamento é realmente único, sem mensalidades?',
      a: 'Sim! Ao adquirir o plano Acesso Vitalício por R$ 37,90, você paga uma única vez via Pix ou Criptomoeda. Não há assinaturas automáticas nem cobranças recorrentes no seu banco.'
    },
    {
      q: 'Como recebo o acesso e o arquivo após o pagamento?',
      a: 'Assim que concluir a transferência via Pix ou USDT no modal de pagamento, basta clicar no botão de suporte (WhatsApp ou Telegram) e enviar o comprovante. Nossa equipe envia imediatamente o link digital exclusivo e o arquivo para download.'
    },
    {
      q: 'Qual velocidade de internet é recomendada?',
      a: 'Recomendamos no mínimo 15 Mbps para canais em Full HD (1080p) e a partir de 30 Mbps para conteúdos em 4K Ultra HD com estabilidade máxima.'
    },
    {
      q: 'Consigo testar antes de comprar?',
      a: 'Com certeza! Você pode clicar no botão "Baixar Lista de Teste Grátis" nesta página para obter o arquivo teste_gratis.m3u imediatamente e testar a reprodução no seu aplicativo.'
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-20 bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            Tire Suas Dúvidas
          </div>
          <h2 className="text-3xl font-extrabold text-white">Perguntas Frequentes</h2>
          <p className="text-zinc-400 text-sm">
            Tudo o que você precisa saber sobre a lista digital da Gato Net.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-colors hover:border-zinc-700"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-base focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-purple-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-zinc-300 text-sm leading-relaxed border-t border-zinc-800/50 pt-3 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
