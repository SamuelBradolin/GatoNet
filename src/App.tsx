/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { FreeTrial } from './components/FreeTrial.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminPanelModal } from './components/AdminPanelModal.tsx';
import { TestChannel } from './types/channel.ts';
import { getStoredChannels, syncChannelsWithBackend, syncAllFromDatabase } from './utils/channelStorage.ts';
import { initInspectProtection } from './utils/disableDevTools.ts';

export default function App() {
  const [channels, setChannels] = useState<TestChannel[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activePlayingChannel, setActivePlayingChannel] = useState<TestChannel | null>(null);

  // Carrega os canais, ativa proteção contra inspeção e escuta eventos de atualização
  useEffect(() => {
    // 1. Ativa bloqueio de botão direito e F12/DevTools
    const cleanupProtection = initInspectProtection();

    // 2. Carrega canais locais e sincroniza canais e banners ativos do banco definitivo da API
    setChannels(getStoredChannels());
    syncAllFromDatabase().then(({ channels: syncedChannels }) => {
      if (syncedChannels && syncedChannels.length > 0) {
        setChannels(syncedChannels);
      }
    });

    const handleChannelsUpdated = () => {
      const stored = getStoredChannels();
      setChannels(stored);
      // Mantém o canal em reprodução sincronizado com o texto e status do ticker em tempo real
      setActivePlayingChannel((current) => {
        if (!current) return null;
        const updatedCurrent = stored.find((c) => c.id === current.id);
        return updatedCurrent ? { ...updatedCurrent } : current;
      });
    };

    window.addEventListener('brado_channels_updated', handleChannelsUpdated);

    // Atalho de teclado: Ctrl + Shift + A abre o Painel Admin
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Verifica hash da URL (ex: #admin)
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    return () => {
      cleanupProtection();
      window.removeEventListener('brado_channels_updated', handleChannelsUpdated);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  // Heartbeat do visitante para estatísticas de audiência em tempo real
  useEffect(() => {
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem('brado_visitor_sess_id') || '';
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('brado_visitor_sess_id', sessionId);
      }
    } catch (_) {
      sessionId = 'sess_client_' + Date.now();
    }

    const sendHeartbeat = () => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-session-id': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          channelId: activePlayingChannel?.id || null,
        }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(interval);
  }, [activePlayingChannel?.id]);

  const handlePlayChannel = (channel: TestChannel) => {
    setActivePlayingChannel(channel);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white relative">
      {/* 1. HEADER (Cabeçalho) */}
      <Navbar 
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main Content Sections */}
      <main className="flex-1 pt-20">
        {/* SEÇÃO INÍCIO COM PLAYER DE VÍDEO INTEGRADO */}
        <FreeTrial
          channels={channels}
          activeChannel={activePlayingChannel}
          onPlayChannel={handlePlayChannel}
          onClosePlayer={() => setActivePlayingChannel(null)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      </main>

      {/* PAINEL DE ADMINISTRAÇÃO (Gestão dos canais e links M3U8) */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onPreviewChannel={(channel) => {
          setIsAdminOpen(false);
          setActivePlayingChannel(channel);
        }}
      />

      {/* 6. FOOTER (Rodapé) */}
      <Footer onOpenAdmin={() => setIsAdminOpen(true)} />
    </div>
  );
}
