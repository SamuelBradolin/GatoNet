/**
 * Converte qualquer URL de streaming no endpoint de Proxy CORS local do nosso backend (/api/proxy?url=...).
 * Isso garante que o backend busque o canal, mascare a origem e libere o CORS com total compatibilidade.
 */
export function getProxiedStreamUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  const trimmed = originalUrl.trim();

  // Se já estiver passando pelo proxy local, preserva
  if (trimmed.startsWith('/api/proxy') || trimmed.startsWith('/api/stream')) {
    return trimmed;
  }

  // Envelopa qualquer URL HTTP ou HTTPS no Proxy CORS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

export function getMaskedStreamUrl(channelId: string, fallbackUrl?: string): string {
  if (fallbackUrl) {
    return getProxiedStreamUrl(fallbackUrl);
  }
  if (channelId) {
    return `/api/stream/${encodeURIComponent(channelId)}`;
  }
  return '';
}
