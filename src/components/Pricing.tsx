import React from 'react';
import { Check, Zap, Shield, Sparkles, Clock, Smartphone, Infinity, Lock } from 'lucide-react';

interface PricingProps {
  onOpenPaymentModal: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenPaymentModal }) => {
  const benefits = [
    { text: 'Lista Completa com mais de 45.000 Canais, Filmes e Séries', highlight: true },
    { text: 'Transmissões em 4K Ultra HD, Full HD e HD 60FPS', highlight: true },
    { text: 'Atualizações automáticas semanais da grade de canais', highlight: false },
    { text: 'Grade de Esportes ao Vivo, Campeonatos e Pay-Per-View', highlight: true },
    { text: 'Guia de Programação Integrado (EPG)', highlight: false },
    { text: 'Suporte VIP e humanizado via WhatsApp e Telegram', highlight: false },
    { text: 'Compatível com Smart TV, TV Box, Celular, Tablet e PC', highlight: false },
    { text: 'Servidores dedicados com tecnologia Anti-Travamentos', highlight: true },
    { text: 'Arquivo digital .m3u + link direto para qualquer player', highlight: false },
    { text: 'Sem mensalidades ou cobranças recorrentes no cartão', highlight: true },
  ];

  return (
    <section id="comprar" className="py-24 relative bg-black overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-purple-700/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            Oferta Especial por Tempo Limitado
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Garanta Sua <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">Lista Completa</span>
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Acesso permanente a todos os canais sem nunca mais pagar faturas mensais de TV por assinatura.
          </p>
        </div>

        {/* Card de Preço Elegante */}
        <div className="max-w-xl mx-auto relative group">
          {/* Neon Border Gradient Accent */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 opacity-70 blur-xl group-hover:opacity-100 transition duration-500 group-hover:duration-200" />

          <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800 p-8 sm:p-10 shadow-2xl space-y-8">
            
            {/* Badge de Destaque */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-purple-600/40">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                Mais Vendido
              </span>

              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                Entrega Imediata
              </div>
            </div>

            {/* Nome do Plano */}
            <div>
              <div className="flex items-center gap-2">
                <Infinity className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Acesso Vitalício
                </h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                Acesso irrestrito a todos os canais nacionais, internacionais e transmissões ao vivo.
              </p>
            </div>

            {/* Preço de Forma Destacada */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 text-center space-y-2">
              <div className="text-xs text-zinc-400 font-medium line-through">
                De R$ 89,90
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-zinc-300">R$</span>
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                  37,90
                </span>
              </div>
              <div className="inline-block px-3 py-1 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-bold uppercase tracking-wider">
                Pagamento Único • Sem Mensalidades
              </div>
            </div>

            {/* Lista de Benefícios em Tópicos */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Benefícios Inclusos na Sua Lista:
              </h4>

              <div className="space-y-2.5">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-sm ${benefit.highlight ? 'text-zinc-100 font-medium' : 'text-zinc-300'}`}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de Compra "Pagar via Pix / Cripto" */}
            <div className="pt-4 space-y-3">
              <button
                onClick={onOpenPaymentModal}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-lg tracking-wide shadow-xl shadow-purple-600/35 hover:shadow-purple-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <Lock className="w-5 h-5 text-yellow-300" />
                <span>Pagar via Pix / Cripto</span>
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-zinc-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Garantia de 7 Dias
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  Ativação Imediata
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
