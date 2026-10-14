/**
 * Script de proteção básica para inibir a inspeção casual de elementos e código fonte
 * por usuários leigos via clique com o botão direito e teclas de atalho de DevTools (F12, Ctrl+U, etc.).
 */
export function initInspectProtection(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Bloqueia o clique com o botão direito (Menu de contexto)
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  // 2. Bloqueia atalhos comuns de abertura do Inspecionar / Código Fonte
  const handleKeyDown = (e: KeyboardEvent) => {
    // Tecla F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl + Shift + I (Inspecionar)
    // Ctrl + Shift + J (Console)
    // Ctrl + Shift + C (Selecionar Elemento)
    if (isCtrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (Exibir código-fonte da página)
    if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Salvar página)
    if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
      // Ignora para não impedir o navegador normal se não for necessário, ou previne:
      e.preventDefault();
      return false;
    }
  };

  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}
