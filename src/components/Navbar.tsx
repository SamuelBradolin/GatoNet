import React, { useState, useEffect } from 'react';
import { Tv, Menu, X, Play } from 'lucide-react';
import { SponsorConfig, DEFAULT_SPONSOR_CONFIG } from '../types/channel.ts';
import { getStoredSponsorConfig, syncSponsorWithBackend } from '../utils/channelStorage.ts';
import { SiteBannerSpace } from './SiteBannerSpace.tsx';

interface NavbarProps {
  onOpenPaymentModal?: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPaymentModal, onOpenAdmin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sponsorConfig, setSponsorConfig] = useState<SponsorConfig>(DEFAULT_SPONSOR_CONFIG);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navLinks = [
    { label: 'Início', href: '#inicio' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/90 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-purple-950/10 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Logotipo e Banner ao lado do Nome do Site */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0 pr-2 sm:pr-4">
            <a 
              href="#inicio" 
              className="group flex items-center gap-3 focus:outline-none shrink-0"
            >
              <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black border border-cyan-500/40 overflow-hidden shadow-lg shadow-cyan-500/25 group-hover:scale-105 group-hover:border-cyan-400 transition-all shrink-0">
                <img
                  src="/src/assets/images/gato_net_logo_1791893568109.jpg"
                  alt="Logo Gato Net"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-75" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1 font-sans">
                Gato <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Net</span>
              </span>
            </a>

            {/* BANNER 2: Ao lado do Nome do Site (No cabeçalho/topo do site) */}
            <div className="hidden sm:block flex-1 max-w-[300px] md:max-w-[420px] lg:max-w-[468px]">
              <SiteBannerSpace
                positionId="header_beside_logo"
                banner={sponsorConfig.banners?.header_beside_logo}
                onOpenAdmin={onOpenAdmin}
              />
            </div>
          </div>

          {/* Menu simples à direita com links de ancoragem (Desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-purple-500 after:to-cyan-400 hover:after:w-full after:transition-all"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <a
                href="#inicio"
                className="text-xs font-semibold px-4 py-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                Jogos De Hoje
              </a>
            </div>
          </nav>

          {/* Mobile hamburger menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 focus:outline-none"
              aria-label="Alternar Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 border-b border-zinc-800/90 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 mt-3 animate-in slide-in-from-top-4 duration-200">
          {/* BANNER 2 no Mobile: Ao lado do Nome do Site (No cabeçalho/topo do site) */}
          <div className="sm:hidden pb-1">
            <SiteBannerSpace
              positionId="header_beside_logo"
              banner={sponsorConfig.banners?.header_beside_logo}
              onOpenAdmin={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
            />
          </div>

          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-850 flex flex-col gap-2">
            <a
              href="#inicio"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              Jogos De Hoje
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
