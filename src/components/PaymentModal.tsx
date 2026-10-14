import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ShieldCheck, MessageCircle, Send, Sparkles, ExternalLink } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pix' | 'crypto'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedCrypto, setCopiedCrypto] = useState(false);

  if (!isOpen) return null;

  const pixKey = "pix@gatonet.com.br";
  const pixQrCodeString = "00020126580014br.gov.bcb.pix0136pix@gatonet.com.br520400005303986540537.905802BR5910GATO NET6009SAO PAULO62070503***6304E8A2";
  const cryptoAddress = "TYDnyP8xKg3N5mZvP7V8k4xR9988776655";
  const cryptoNetwork = "USDT (TRC20 - Tron Network)";
  const cryptoAmount = "7.50 USDT";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleCopyCrypto = () => {
    navigator.clipboard.writeText(cryptoAddress);
    setCopiedCrypto(true);
    setTimeout(() => setCopiedCrypto(false), 2500);
  };

  const handleSupportClick = (channel: 'whatsapp' | 'telegram') => {
    const message = encodeURIComponent("Olá suporte Gato Net! Realizei o pagamento do Acesso Vitalício e gostaria de enviar meu comprovante para receber o link da lista completa.");
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/5511999998888?text=${message}`, '_blank');
    } else {
      window.open(`https://t.me/gatonet_suporte?text=${message}`, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl shadow-purple-950/40 text-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Glow ambient highlight */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-zinc-800/80 px-6 py-5 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-xl font-bold tracking-tight text-white">
                Finalize seu Pagamento
              </h3>
              <p className="text-xs text-zinc-400">
                Plano Acesso Vitalício • <span className="text-purple-400 font-semibold">R$ 37,90</span> (Taxa Única)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 p-2 gap-2">
          <button
            onClick={() => setActiveTab('pix')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pix'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Nacionais (Pix)
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'crypto'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Internacionais (Cripto)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {activeTab === 'pix' ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                {/* Visual QR Code Representation */}
                <div className="relative p-2.5 bg-white rounded-xl shadow-md shrink-0 flex flex-col items-center justify-center">
                  <svg className="w-32 h-32 text-black" viewBox="0 0 100 100" fill="currentColor">
                    {/* Stylized QR Matrix */}
                    <rect x="0" y="0" width="30" height="30" rx="3" />
                    <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                    <rect x="10" y="10" width="10" height="10" />

                    <rect x="70" y="0" width="30" height="30" rx="3" />
                    <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                    <rect x="80" y="10" width="10" height="10" />

                    <rect x="0" y="70" width="30" height="30" rx="3" />
                    <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                    <rect x="10" y="80" width="10" height="10" />

                    <rect x="35" y="5" width="5" height="15" />
                    <rect x="45" y="15" width="15" height="5" />
                    <rect x="40" y="25" width="10" height="10" />

                    <rect x="5" y="45" width="15" height="10" />
                    <rect x="25" y="40" width="10" height="15" />
                    <rect x="40" y="45" width="20" height="20" />
                    <rect x="65" y="40" width="10" height="10" />
                    <rect x="85" y="45" width="10" height="15" />

                    <rect x="35" y="70" width="15" height="5" />
                    <rect x="45" y="80" width="15" height="15" />
                    <rect x="70" y="75" width="10" height="15" />
                    <rect x="85" y="80" width="10" height="10" />
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-700 tracking-wider mt-1 uppercase">PIX Instantâneo</span>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Aprovação em segundos
                  </div>
                  <h4 className="text-base font-semibold text-white">Escaneie o QR Code ou Copie a Chave</h4>
                  <p className="text-xs text-zinc-400">
                    Abra o app do seu banco, escolha a opção Pix Copia e Cola ou leitura de QR Code.
                  </p>
                  <div className="text-sm font-semibold text-purple-400">
                    Valor: R$ 37,90
                  </div>
                </div>
              </div>

              {/* Pix Key Field */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                  <span>Chave Pix (E-mail):</span>
                  <span className="text-zinc-500 text-[11px]">Tipo: E-mail Comercial</span>
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-purple-500 transition-colors">
                  <code className="text-sm font-mono text-purple-300 font-semibold px-2 flex-1 truncate select-all">
                    {pixKey}
                  </code>
                  <button
                    onClick={handleCopyPix}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                      copiedPix
                        ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Chave
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {cryptoNetwork}
                  </div>
                  <span className="text-sm font-bold text-cyan-400">Valor: {cryptoAmount}</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Transfira exatamente o valor correspondente via rede <strong>TRON (TRC20)</strong> para evitar perda de fundos.
                </p>
              </div>

              {/* Crypto Wallet Field */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                  <span>Endereço da Carteira USDT (TRC20):</span>
                  <span className="text-cyan-400 text-[11px]">Rede: TRC20</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-cyan-500 transition-colors">
                  <code className="text-xs font-mono text-cyan-300 font-semibold px-2 flex-1 truncate select-all py-1">
                    {cryptoAddress}
                  </code>
                  <button
                    onClick={handleCopyCrypto}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm ${
                      copiedCrypto
                        ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                    }`}
                  >
                    {copiedCrypto ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Endereço
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory notice per brief */}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Send className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-purple-200">
                  Instruções pós-pagamento:
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Após realizar o pagamento, envie o comprovante para o nosso suporte para receber o link da lista completa.
                </p>
              </div>
            </div>

            {/* Support Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleSupportClick('whatsapp')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-600/30"
              >
                <MessageCircle className="w-4 h-4" />
                Suporte WhatsApp
              </button>
              <button
                onClick={() => handleSupportClick('telegram')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-sm shadow-blue-600/30"
              >
                <Send className="w-4 h-4" />
                Suporte Telegram
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer with Close button */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 px-6 py-4 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Transação Segura &amp; Criptografada
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
