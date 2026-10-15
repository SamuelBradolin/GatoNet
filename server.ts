import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { DEFAULT_CHANNELS, TestChannel, DEFAULT_SPONSOR_CONFIG, SponsorConfig } from './src/types/channel.ts';
import {
  initDatabase,
  getCanaisDB,
  saveCanaisDB,
  getBannersDB,
  saveBannersDB,
  getAdminConfigDB,
  updateAdminConfigDB,
  CanalRecord,
  BannerRecord,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Banco de dados em arquivo para persistência dos canais e do patrocinador
const DATA_DIR = path.resolve(__dirname, 'data');
const CHANNELS_FILE = path.resolve(DATA_DIR, 'channels.json');
const SPONSOR_FILE = path.resolve(DATA_DIR, 'sponsor.json');

function loadChannelsFromDisk(): TestChannel[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CHANNELS_FILE)) {
      const raw = fs.readFileSync(CHANNELS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((ch: TestChannel) => {
          const defaultMatch = DEFAULT_CHANNELS.find((d) => d.id === ch.id);
          return {
            ...ch,
            tickerText: ch.tickerText !== undefined ? ch.tickerText : (defaultMatch?.tickerText || ''),
            tickerEnabled: ch.tickerEnabled !== undefined ? ch.tickerEnabled : (defaultMatch?.tickerEnabled ?? false),
          };
        });
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível carregar channels.json, usando padrão:', err);
  }
  return DEFAULT_CHANNELS;
}

function saveChannelsToDisk(channels: TestChannel[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar canais em disco:', err);
  }
}

function loadSponsorFromDisk(): SponsorConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SPONSOR_FILE)) {
      const raw = fs.readFileSync(SPONSOR_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_SPONSOR_CONFIG,
          ...parsed,
          cards: Array.isArray(parsed.cards) ? parsed.cards : DEFAULT_SPONSOR_CONFIG.cards,
        };
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível carregar sponsor.json, usando padrão:', err);
  }
  return DEFAULT_SPONSOR_CONFIG;
}

function saveSponsorToDisk(config: SponsorConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SPONSOR_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar sponsor em disco:', err);
  }
}

let channelsStore: TestChannel[] = loadChannelsFromDisk();
let sponsorStore: SponsorConfig = loadSponsorFromDisk();
// Variável no backend para armazenar o script de anúncio In-Play
let inPlayScriptStore: string = sponsorStore.inPlayScript || '';

// --- RASTREAMENTO EM TEMPO REAL DE AUDIÊNCIA (SESSÕES E CLIENTES DO MULTIPLEXADOR) ---
const activeSiteVisitors = new Map<string, number>(); // sessionIdOrIp -> lastSeenTimestamp
const recentChannelViewers = new Map<string, Map<string, number>>(); // channelId -> Map(clientId -> lastSeenTimestamp)

/**
 * Detecta se uma URL segue a estrutura Xtream Codes (/user/pass/id ou /user/pass/id.ts)
 * e gera a URL canônica HLS (/live/user/pass/id.m3u8).
 * Isso permite que streams diretos como http://srv.mypanel.life:8080/jju4420/NebeQ90Mp1/6928
 * sejam carregados instantaneamente como listas HLS de alta compatibilidade pelo navegador.
 */
function getXtreamHlsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // [username, password, id]
    if (parts.length === 3 && !['live', 'movie', 'series', 'play'].includes(parts[0])) {
      const [user, pass, id] = parts;
      const cleanId = id.replace(/\.(ts|m3u8)$/, '');
      return `${parsed.protocol}//${parsed.host}/live/${user}/${pass}/${cleanId}.m3u8`;
    }
    // Caso venha com /live/user/pass/id sem .m3u8
    if (parts.length === 4 && parts[0] === 'live') {
      const [, user, pass, id] = parts;
      const cleanId = id.replace(/\.(ts|m3u8)$/, '');
      return `${parsed.protocol}//${parsed.host}/live/${user}/${pass}/${cleanId}.m3u8`;
    }
  } catch (_) {}
  return null;
}

/**
 * Reescreve os manifestos M3U8 para que sub-playlists e segmentos (.ts, .m4s)
 * passem obrigatoriamente pelo nosso backend (/api/proxy?url=...),
 * mascarando a origem e liberando CORS com 100% de compatibilidade web.
 */
function rewriteM3U8Proxy(content: string, baseUrl: string): string {
  const lines = content.split('\n');
  const rewrittenLines = lines.map((line) => {
    let trimmed = line.trim();
    if (!trimmed) return line;

    // Enriquecimento de CODECS para #EXT-X-STREAM-INF caso o servidor upstream (como Astra) omita codecs
    if (trimmed.startsWith('#EXT-X-STREAM-INF')) {
      if (!trimmed.includes('CODECS=')) {
        trimmed = `${trimmed},CODECS="avc1.4d401f,mp4a.40.2"`;
      }
      return trimmed;
    }

    // Tags (#EXT...) que possuem atributo URI="..." (chaves de criptografia, legendas, áudio)
    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            const absoluteUri = new URL(uri, baseUrl).href;
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUri)}"`;
          } catch {
            return match;
          }
        });
      }
      return line;
    }

    // Linha de segmento de vídeo (.ts, .m4s) ou sub-playlist (.m3u8)
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).href;
      return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    } catch {
      return line;
    }
  });

  return rewrittenLines.join('\n');
}

function canalRecordToTestChannel(c: CanalRecord): TestChannel {
  return {
    id: c.id,
    name: c.nome,
    category: c.categoria || 'Esportes',
    quality: c.resolucao || '1080p FHD',
    streamUrl: c.url_iptv,
    active: Boolean(c.ativo),
    tickerText: c.ticker_texto || '',
    tickerEnabled: c.ticker_habilitado !== undefined ? Boolean(c.ticker_habilitado) : true,
  };
}

function testChannelToCanalRecord(t: TestChannel, index: number): CanalRecord {
  return {
    id: t.id,
    nome: t.name,
    url_iptv: t.streamUrl,
    resolucao: t.quality || '1080p FHD',
    categoria: t.category || 'Esportes',
    ativo: t.active ? 1 : 0,
    ticker_texto: t.tickerText || '',
    ticker_habilitado: t.tickerEnabled ? 1 : 0,
    ordem: index,
  };
}

async function startServer() {
  // Inicialização e conexão com o banco de dados definitivo (MySQL/MariaDB)
  await initDatabase();

  // Pré-carrega canais e configurações do banco definitivo para o store
  try {
    const dbCanais = await getCanaisDB();
    if (dbCanais && dbCanais.length > 0) {
      channelsStore = dbCanais.map(canalRecordToTestChannel);
    }
    const [dbAdmin, dbBanners] = await Promise.all([getAdminConfigDB(), getBannersDB()]);
    if (dbAdmin) {
      inPlayScriptStore = dbAdmin.inplay_script || '';
      sponsorStore.tagline = dbAdmin.tagline || sponsorStore.tagline;
      sponsorStore.description = dbAdmin.descricao !== undefined ? dbAdmin.descricao : sponsorStore.description;
      sponsorStore.inPlayScript = dbAdmin.inplay_script || '';
      sponsorStore.inPlayInitialDelaySeconds = dbAdmin.inplay_initial_delay_seconds || 30;
      sponsorStore.inPlayIntervalMinutes = dbAdmin.inplay_interval_minutes || 8;
      sponsorStore.inPlayDurationSeconds = dbAdmin.inplay_duration_seconds || 5;
      if (dbAdmin.cards_json) {
        try {
          const parsedCards = JSON.parse(dbAdmin.cards_json);
          if (Array.isArray(parsedCards)) sponsorStore.cards = parsedCards;
        } catch (_) {}
      }
    }
    if (dbBanners && Object.keys(dbBanners).length > 0) {
      for (const [posKey, bRecord] of Object.entries(dbBanners)) {
        if (sponsorStore.banners && (sponsorStore.banners as any)[posKey]) {
          (sponsorStore.banners as any)[posKey] = {
            ...(sponsorStore.banners as any)[posKey],
            contentType: bRecord.tipo_conteudo,
            imageUrl: bRecord.imagem_url || '',
            linkUrl: bRecord.link_url || '',
            altText: bRecord.alt_texto || (sponsorStore.banners as any)[posKey].altText,
            scriptCode: bRecord.script_codigo || '',
            refreshIntervalSeconds: bRecord.tempo_rotacao || 60,
            active: Boolean(bRecord.ativo),
          };
        }
      }
    }
  } catch (preloadErr: any) {
    console.warn('[DB] Aviso ao pré-carregar stores do banco:', preloadErr?.message);
  }

  const app = express();

  // Limite aumentado para 50MB para suportar uploads de imagens em Base64 nos banners e cards sem erro de PayloadTooLargeError
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Tratamento específico de erro para requisições com payload acima do limite
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        error: 'Tamanho da requisição excede o limite permitido (máximo 50MB).',
      });
    }
    next(err);
  });

  // Cabeçalhos CORS globais permissivos
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Rastreamento automático de visitantes online no site
  app.use((req, _res, next) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const clientIp = forwarded || req.socket.remoteAddress || 'guest';
    const sessionId = (req.headers['x-session-id'] as string) || clientIp;
    if (sessionId) {
      activeSiteVisitors.set(sessionId, Date.now());
    }
    next();
  });

/**
 * Extrai o link interno apontado por tags #EXT-X-STREAM-INF em playlists master HLS.
 * Se o link original apontar para outra URL interna (ex: /play/a06o/60815431.m3u8),
 * o Proxy resolve essa URL internamente antes de responder ao front-end.
 */
function extractStreamInfTarget(content: string, baseUrl: string): string | null {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          try {
            return new URL(nextLine, baseUrl).href;
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Executa requisição HTTP seguindo automaticamente qualquer redirecionamento (301/302/303/307/308)
 * e resolvendo cabeçalhos Location relativos ou absolutos com timeout controlado.
 */
async function fetchWithFollow(
  initialUrl: string,
  maxRedirects = 8,
  timeoutMs = 7000
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = initialUrl;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'application/x-mpegURL, application/vnd.apple.mpegurl, video/mp4, video/mp2t, text/html, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (location) {
        try {
          currentUrl = new URL(location, currentUrl).href;
          continue;
        } catch (_) {}
      }
    }

    return { response: res, finalUrl: currentUrl };
  }

  // Fallback nativo caso atinja limite
  const fallbackRes = await fetch(currentUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'application/x-mpegURL, application/vnd.apple.mpegurl, video/mp4, video/mp2t, text/html, */*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { response: fallbackRes, finalUrl: fallbackRes.url || currentUrl };
}

/**
 * Rastreia no buffer o início dos dados binários do stream de vídeo MPEG-TS.
 * Cada pacote MPEG-TS possui 188 bytes (ou 204 bytes com FEC) e inicia com o byte de sincronia 0x47.
 * Retorna o offset onde o fluxo binário MPEG-TS real começa, descartando cabeçalhos de texto anteriores.
 */
function findMpegTsOffset(buf: Buffer): number {
  if (buf.length < 1) return -1;

  // 1. Já começa no byte 0x47 e confirma cadência de 188 bytes
  if (buf[0] === 0x47) {
    if (buf.length < 188 || buf[188] === 0x47) {
      return 0;
    }
  }

  // 2. Rastreia o buffer até encontrar o byte de sincronia 0x47 com cadência repetida de 188 bytes
  const maxScan188 = Math.min(buf.length - 188, 131072);
  for (let i = 0; i < maxScan188; i++) {
    if (buf[i] === 0x47 && buf[i + 188] === 0x47) {
      if (i + 376 < buf.length) {
        if (buf[i + 376] === 0x47) {
          return i;
        }
      } else {
        return i;
      }
    }
  }

  // 3. Rastreia cadência de 204 bytes (MPEG-TS com Reed-Solomon FEC)
  const maxScan204 = Math.min(buf.length - 204, 131072);
  for (let i = 0; i < maxScan204; i++) {
    if (buf[i] === 0x47 && buf[i + 204] === 0x47) {
      return i;
    }
  }

  // 4. Se o buffer começa com texto e tem o byte 0x47 em qualquer ponto dos primeiros 64KB
  const preview = buf.subarray(0, 512).toString('latin1');
  if (
    preview.startsWith('FFmpeg Service') ||
    preview.startsWith('ICY') ||
    preview.startsWith('HTTP/') ||
    preview.toLowerCase().includes('<html') ||
    preview.toLowerCase().includes('<!doctype')
  ) {
    for (let i = 0; i < Math.min(buf.length, 65536); i++) {
      if (buf[i] === 0x47) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Filtro de Conteúdo no Proxy:
 * Lê a resposta do servidor IPTV. Se a resposta começar com cabeçalhos de texto
 * (como 'FFmpeg Service' ou HTML), o proxy ignora essas linhas de texto iniciais,
 * rastreia até encontrar os dados binários do stream de vídeo real (MPEG-TS)
 * e repassa apenas o vídeo puro para o front-end com o Content-Type correto.
 */
function filterStreamContent(buffer: Buffer): {
  cleanBuffer: Buffer;
  contentType: 'application/x-mpegURL' | 'video/mp2t' | 'video/mp4';
} {
  // 1. Verifica se contém manifesto HLS (#EXTM3U)
  const m3uIdx = buffer.indexOf(Buffer.from('#EXTM3U'));
  if (m3uIdx !== -1) {
    const clean = (m3uIdx > 0 ? buffer.subarray(m3uIdx) : buffer) as Buffer;
    if (m3uIdx > 0) {
      console.log(`[Proxy] Cabeçalho textual anterior a #EXTM3U descartado (${m3uIdx} bytes).`);
    }
    return { cleanBuffer: clean, contentType: 'application/x-mpegURL' };
  }

  // 2. Verifica se é vídeo MP4 (caixa 'ftyp')
  const ftypIdx = buffer.indexOf(Buffer.from('ftyp'));
  if (ftypIdx >= 4) {
    const mp4Start = ftypIdx - 4;
    return { cleanBuffer: buffer.subarray(mp4Start) as Buffer, contentType: 'video/mp4' };
  }

  // 3. Rastreia e descarta cabeçalhos de texto (como 'FFmpeg Service' ou HTML),
  // localizando o início exato dos dados binários MPEG-TS
  const tsOffset = findMpegTsOffset(buffer);
  if (tsOffset >= 0) {
    if (tsOffset > 0) {
      console.log(`[Proxy] Cabeçalho textual descartado (${tsOffset} bytes). Encaminhando fluxo MPEG-TS puro.`);
    }
    return { cleanBuffer: buffer.subarray(tsOffset) as Buffer, contentType: 'video/mp2t' };
  }

  // 4. Se começa com cabeçalho de texto conhecido ('FFmpeg Service', HTML, ICY, etc.)
  // mas o padrão 0x47 não foi encontrado diretamente, descarta o cabeçalho textual até o primeiro bloco de dados
  const preview = buffer.subarray(0, 1024).toString('latin1');
  if (
    preview.startsWith('FFmpeg Service') ||
    preview.startsWith('ICY') ||
    preview.startsWith('HTTP/') ||
    preview.toLowerCase().includes('<html') ||
    preview.toLowerCase().includes('<!doctype')
  ) {
    const doubleCrLf = buffer.indexOf(Buffer.from('\r\n\r\n'));
    if (doubleCrLf !== -1 && doubleCrLf + 4 < buffer.length) {
      console.log(`[Proxy] Cabeçalho textual até \\r\\n\\r\\n descartado (${doubleCrLf + 4} bytes).`);
      return { cleanBuffer: buffer.subarray(doubleCrLf + 4) as Buffer, contentType: 'video/mp2t' };
    }
    const doubleLf = buffer.indexOf(Buffer.from('\n\n'));
    if (doubleLf !== -1 && doubleLf + 2 < buffer.length) {
      console.log(`[Proxy] Cabeçalho textual até \\n\\n descartado (${doubleLf + 2} bytes).`);
      return { cleanBuffer: buffer.subarray(doubleLf + 2) as Buffer, contentType: 'video/mp2t' };
    }
  }

  // Padrão: fluxo binário direto MPEG-TS
  return { cleanBuffer: buffer, contentType: 'video/mp2t' };
}

// ============================================================================
// SINGLE-SOURCE CHANNEL BROADCASTER & MULTIPLEXER (1 CONEXÃO REAL POR CANAL)
// ============================================================================
// Garante que mesmo com milhares de usuários assistindo simultaneamente ao mesmo canal,
// o back-end abre e mantém APENAS 1 conexão real com a fonte da IPTV,
// recebendo os blocos de vídeo e retransmitindo-os em tempo real para todos os clientes conectados.
// ============================================================================

interface CachedResponse {
  contentType: string;
  body: Buffer | string;
  statusCode: number;
  expiresAt: number;
}

// Cache em memória para manifestos HLS (2s a 3s) e segmentos TS/MP4 (45s)
// Evita requisições redundantes à fonte IPTV
const streamCache = new Map<string, CachedResponse | Promise<CachedResponse>>();

async function getOrFetchCached(
  url: string,
  ttlMs: number,
  fetcher: () => Promise<{ contentType: string; body: Buffer | string; statusCode: number }>
): Promise<CachedResponse> {
  const now = Date.now();
  const existing = streamCache.get(url);

  if (existing) {
    if (existing instanceof Promise) {
      return await existing;
    }
    if (existing.expiresAt > now) {
      return existing;
    }
  }

  // Promise compartilhada para deduplicar requisições concorrentes idênticas no mesmo milissegundo
  const fetchPromise = (async () => {
    try {
      const res = await fetcher();
      const cachedItem: CachedResponse = {
        ...res,
        expiresAt: Date.now() + ttlMs,
      };
      streamCache.set(url, cachedItem);
      return cachedItem;
    } finally {
      // Limpeza de cache expirado
      setTimeout(() => {
        const item = streamCache.get(url);
        if (item && !(item instanceof Promise) && item.expiresAt <= Date.now()) {
          streamCache.delete(url);
        }
      }, ttlMs + 5000);
    }
  })();

  streamCache.set(url, fetchPromise);
  return await fetchPromise;
}

// Hub para fluxos contínuos binários de vídeo (MPEG-TS direto / Xtream Codes sem fim)
interface ActiveChannelStream {
  url: string;
  contentType: string;
  clients: Set<express.Response>;
  ringBuffer: Buffer[]; // Últimos blocos para novos clientes começarem imediatamente sem tela preta
  ringBufferSize: number;
  abortController: AbortController;
  lastActiveTime: number;
  idleTimer?: NodeJS.Timeout;
}

const activeStreams = new Map<string, ActiveChannelStream>();

function subscribeClientToChannelStream(
  streamKey: string,
  stream: ActiveChannelStream,
  res: express.Response
) {
  res.setHeader('Content-Type', stream.contentType);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Envia imediatamente os blocos recentes do buffer circular (warm start)
  for (const chunk of stream.ringBuffer) {
    try {
      res.write(chunk);
    } catch (_) {}
  }

  stream.clients.add(res);
  console.log(
    `[Stream Hub] Cliente conectado ao canal [${streamKey}]. Total de espectadores ativos compartilhando ESTA ÚNICA conexão IPTV: ${stream.clients.size}`
  );

  // Cancela o timer de idle caso houvesse
  if (stream.idleTimer) {
    clearTimeout(stream.idleTimer);
    stream.idleTimer = undefined;
  }

  // Quando o cliente desconecta, remove do conjunto de clientes
  const cleanup = () => {
    stream.clients.delete(res);
    console.log(
      `[Stream Hub] Cliente desconectou de [${streamKey}]. Espectadores restantes na mesma conexão: ${stream.clients.size}`
    );

    // Se não sobrou nenhum cliente assistindo, aguarda 10 segundos antes de fechar a conexão upstream com a IPTV
    // Isso previne reconnects agressivos caso o cliente recarregue a página
    if (stream.clients.size === 0) {
      if (stream.idleTimer) clearTimeout(stream.idleTimer);
      stream.idleTimer = setTimeout(() => {
        if (stream.clients.size === 0) {
          console.log(
            `[Stream Hub] Nenhum cliente conectado após 10s. Fechando conexão upstream IPTV de [${streamKey}] para economizar servidor.`
          );
          try {
            stream.abortController.abort();
          } catch (_) {}
          activeStreams.delete(streamKey);
        }
      }, 10000);
    }
  };

  res.on('close', cleanup);
  res.on('error', cleanup);
}

async function startUpstreamChannelStream(
  streamKey: string,
  initialUrl: string,
  initialBuffer: Buffer,
  initialContentType: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: express.Response
) {
  const abortController = new AbortController();
  const stream: ActiveChannelStream = {
    url: initialUrl,
    contentType: initialContentType,
    clients: new Set(),
    ringBuffer: [initialBuffer],
    ringBufferSize: initialBuffer.length,
    abortController,
    lastActiveTime: Date.now(),
  };

  activeStreams.set(streamKey, stream);
  subscribeClientToChannelStream(streamKey, stream, res);

  // Laço contínuo em background para ler os dados da IPTV UMA ÚNICA VEZ e retransmitir para todos
  (async () => {
    try {
      while (!abortController.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) {
          console.log(`[Stream Hub] Upstream IPTV de [${streamKey}] finalizou.`);
          break;
        }
        if (value && value.length > 0) {
          const chunk = Buffer.from(value);

          // Atualiza buffer circular para os últimos ~250KB (garante que novos usuários iniciem rápido)
          stream.ringBuffer.push(chunk);
          stream.ringBufferSize += chunk.length;
          while (stream.ringBufferSize > 350000 && stream.ringBuffer.length > 2) {
            const removed = stream.ringBuffer.shift();
            if (removed) stream.ringBufferSize -= removed.length;
          }

          // Retransmite o bloco para TODOS os usuários conectados simultaneamente
          for (const clientRes of Array.from(stream.clients)) {
            try {
              clientRes.write(chunk);
            } catch (writeErr) {
              stream.clients.delete(clientRes);
            }
          }
        }
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        console.warn(`[Stream Hub] Erro na transmissão upstream de [${streamKey}]:`, err?.message);
      }
    } finally {
      try {
        reader.cancel().catch(() => {});
      } catch (_) {}
      for (const clientRes of Array.from(stream.clients)) {
        try {
          clientRes.end();
        } catch (_) {}
      }
      activeStreams.delete(streamKey);
    }
  })();
}

  /**
   * Processador central do Proxy CORS com multiplexação de canais (1 conexão real para N usuários),
   * deduplicação de segmentos e playlists, e proteção contra sobrecarga da fonte IPTV.
   */
  async function handleProxy(targetUrl: string, res: express.Response) {
    if (!targetUrl) {
      return res.status(400).send('Parâmetro "url" ausente.');
    }

    try {
      let currentUrl = targetUrl;

      // 1. OTIMIZAÇÃO XTREAM CODES:
      // Se a URL for do formato /user/pass/id, tenta a variante HLS /live/user/pass/id.m3u8
      // com timeout rápido (2.5s) para não prender a requisição caso o host esteja offline
      const xcUrl = getXtreamHlsUrl(targetUrl);
      if (xcUrl) {
        try {
          const xcUpstream = await fetchWithFollow(xcUrl, 4, 2500);
          if (xcUpstream.response.ok) {
            currentUrl = xcUrl;
          }
        } catch (_) {}
      }

      // Se for segmento de vídeo HLS (.ts, .m4s) ou mp4 estático:
      // DEDUPLICAÇÃO E CACHE DE SEGMENTO: Centenas de usuários baixando o mesmo segmento de 3s
      // fazem apenas 1 requisição para o servidor da IPTV. Todos recebem a mesma resposta local do proxy.
      const isSegment =
        currentUrl.includes('.ts') ||
        currentUrl.includes('.m4s') ||
        currentUrl.includes('.mp4');

      if (isSegment) {
        const cachedSegment = await getOrFetchCached(currentUrl, 45000, async () => {
          const upstream = await fetchWithFollow(currentUrl, 8, 7000);
          if (!upstream.response.ok) {
            throw new Error(`Upstream retornou status ${upstream.response.status}`);
          }
          const arrayBuf = await upstream.response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const filtered = filterStreamContent(buffer);
          return {
            contentType: filtered.contentType,
            body: filtered.cleanBuffer,
            statusCode: upstream.response.status,
          };
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', cachedSegment.contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');
        return res.status(cachedSegment.statusCode).send(cachedSegment.body);
      }

      // Se for manifesto M3U8:
      // CACHE DE CURTA DURAÇÃO (2.5 segundos):
      // Mesmo com 10.000 usuários atualizando a cada segundo a playlist ao vivo,
      // a fonte original IPTV só recebe 1 requisição a cada 2.5s!
      const isM3u8Url =
        !isSegment &&
        (currentUrl.includes('.m3u8') || currentUrl.includes('playlist') || currentUrl.includes('/live/'));

      if (isM3u8Url) {
        try {
          const cachedManifest = await getOrFetchCached(currentUrl, 2500, async () => {
            const upstream = await fetchWithFollow(currentUrl, 8, 5000);
            if (!upstream.response.ok) {
              throw new Error(`Upstream status ${upstream.response.status}`);
            }
            const textContent = await upstream.response.text();
            const filtered = filterStreamContent(Buffer.from(textContent));
            const rewritten = rewriteM3U8Proxy(
              filtered.cleanBuffer.toString('utf8'),
              upstream.finalUrl || currentUrl
            );
            return {
              contentType: 'application/x-mpegURL',
              body: rewritten,
              statusCode: 200,
            };
          });

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Content-Type', 'application/x-mpegURL');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.status(cachedManifest.statusCode).send(cachedManifest.body);
        } catch (_) {
          // Se falhar a tentativa com cache, segue para a lógica com resolução de fallback
        }
      }

      // Se já existe um fluxo contínuo ativo (Broadcaster) para essa URL exata,
      // CONECTA ESTE NOVO CLIENTE NA MESMA CONEXÃO EXISTENTE SEM ABRIR NOVA NA IPTV!
      const existingStream = activeStreams.get(currentUrl);
      if (existingStream) {
        return subscribeClientToChannelStream(currentUrl, existingStream, res);
      }

      let upstream = await fetchWithFollow(currentUrl, 8, 5000);

      // Se falhou (ex: 404) e a URL original não termina com .m3u8, tenta fallback adicionando .m3u8
      if (!upstream.response.ok && !targetUrl.includes('.m3u8')) {
        try {
          const fallbackM3u8Url = `${targetUrl}.m3u8`;
          const fallbackUpstream = await fetchWithFollow(fallbackM3u8Url, 4, 2500);
          if (fallbackUpstream.response.ok) {
            upstream = fallbackUpstream;
          }
        } catch (_) {}
      }

      if (!upstream.response.ok) {
        if (upstream.response.status === 404) {
          return res.status(404).send(
            'Canal não encontrado no servidor do provedor IPTV (Erro 404). As credenciais ou o ID deste link expiraram ou não existem no servidor de origem.'
          );
        }
        if (upstream.response.status === 403) {
          return res.status(403).send(
            'Acesso negado pelo servidor IPTV (Erro 403). O teste expirou ou o provedor bloqueou a conexão.'
          );
        }
        return res
          .status(upstream.response.status)
          .send(`Erro upstream (${upstream.response.status}): ${upstream.response.statusText}`);
      }

      let finalUrl = upstream.finalUrl || currentUrl;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Accept-Ranges', 'bytes');

      if (!upstream.response.body) {
        return res.status(200).end();
      }

      const reader = upstream.response.body.getReader();
      const { value: firstChunk, done } = await reader.read();

      if (!firstChunk || firstChunk.length === 0) {
        return res.status(200).end();
      }

      const firstBuffer = Buffer.from(firstChunk);
      const previewText = firstBuffer.subarray(0, 4096).toString('utf8');
      const isM3U8 =
        previewText.includes('#EXTM3U') ||
        finalUrl.includes('.m3u8') ||
        (upstream.response.headers.get('content-type') || '').includes('mpegurl');

      if (isM3U8) {
        // Para playlists M3U8: lê o restante do manifesto
        const chunks: Buffer[] = [firstBuffer];
        let currentDone = done;
        while (!currentDone) {
          const { value: nextChunk, done: nextDone } = await reader.read();
          if (nextChunk) {
            chunks.push(Buffer.from(nextChunk));
          }
          currentDone = nextDone;
        }

        const fullBuffer = Buffer.concat(chunks);
        const filtered = filterStreamContent(fullBuffer);
        const text = filtered.cleanBuffer.toString('utf8');
        const rewritten = rewriteM3U8Proxy(text, finalUrl);

        // Salva no cache com TTL de 2.5s para economizar IPTV com múltiplos espectadores
        streamCache.set(currentUrl, {
          contentType: 'application/x-mpegURL',
          body: rewritten,
          statusCode: 200,
          expiresAt: Date.now() + 2500,
        });

        res.setHeader('Content-Type', 'application/x-mpegURL');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(rewritten);
      }

      // Se for transmissão binária de vídeo contínua (MPEG-TS ao vivo / TV direta):
      // ATIVA O BROADCASTER DE 1 CONEXÃO: Todos os próximos usuários que chegarem
      // serão atendidos por este mesmo canal sem abrir nova conexão na IPTV!
      const filtered = filterStreamContent(firstBuffer);

      if (done) {
        res.setHeader('Content-Type', filtered.contentType);
        return res.send(filtered.cleanBuffer);
      }

      return await startUpstreamChannelStream(
        currentUrl,
        finalUrl,
        filtered.cleanBuffer,
        filtered.contentType,
        reader,
        res
      );
    } catch (err: any) {
      console.error('Falha no proxy para:', targetUrl, err?.message);

      const errorMsg = String(err?.message || '');
      const isTimeout =
        err?.name === 'TimeoutError' ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('aborted');
      const isUnreachable =
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ENOTFOUND') ||
        errorMsg.includes('EHOSTUNREACH') ||
        errorMsg.includes('ETIMEDOUT');

      if (isTimeout) {
        return res
          .status(504)
          .send(
            'Tempo limite esgotado ao conectar ao servidor IPTV (Gateway Timeout). O servidor do canal demorou mais de 7 segundos para responder ou está sobrecarregado.'
          );
      }

      if (isUnreachable) {
        return res
          .status(502)
          .send(
            'Servidor do canal offline ou inacessível. O endereço remoto recusou a conexão ou o host está indisponível no momento.'
          );
      }

      return res.status(502).send(`Falha ao conectar à transmissão: ${err?.message}`);
    }
  }

  // --- ROTA DE PROXY CORS CENTRAL (/api/proxy?url=...) ---
  // Funciona instantaneamente para qualquer canal adicionado, existente ou em teste
  app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    console.log('[DEBUG /api/proxy called]', targetUrl);
    await handleProxy(targetUrl, res);
  });

  // --- ROTA MASCARADA POR ID (/api/stream/:channelId) ---
  app.get('/api/stream/:channelId', async (req, res) => {
    const channelId = req.params.channelId;
    const channel = channelsStore.find(
      (c) =>
        c.id.toLowerCase() === channelId.toLowerCase() ||
        c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === channelId.toLowerCase()
    );

    if (!channel) {
      return res.status(404).send('Canal não encontrado no servidor.');
    }

    if (!channel.active) {
      return res.status(403).send('Este canal está desativado.');
    }

    await handleProxy(channel.streamUrl, res);
  });

  // --- API DE CANAIS (CRUD DIRETO NO BANCO DE DADOS DEFINITIVO: canais) ---
  app.get('/api/channels', async (_req, res) => {
    try {
      const dbCanais = await getCanaisDB();
      if (dbCanais && dbCanais.length > 0) {
        channelsStore = dbCanais.map(canalRecordToTestChannel);
      }
      res.json(channelsStore);
    } catch (err: any) {
      console.error('[DB] Erro ao consultar canais no banco:', err?.message);
      res.json(channelsStore);
    }
  });

  app.post('/api/channels', async (req, res) => {
    const newChannels = req.body;
    if (Array.isArray(newChannels)) {
      channelsStore = newChannels;
      saveChannelsToDisk(channelsStore);
      try {
        const canalRecords: CanalRecord[] = newChannels.map(testChannelToCanalRecord);
        await saveCanaisDB(canalRecords);
        console.log(`[DB] ${canalRecords.length} canais gravados no banco de dados com sucesso.`);
        return res.json({ success: true, count: channelsStore.length, persistedInDB: true });
      } catch (dbErr: any) {
        console.error('[DB] Erro ao persistir canais no banco:', dbErr?.message);
        return res.json({ success: true, count: channelsStore.length, warning: 'Salvo em cache local' });
      }
    }
    return res.status(400).json({ error: 'Formato de canais inválido' });
  });

  app.post('/api/channels/reset', async (_req, res) => {
    channelsStore = DEFAULT_CHANNELS;
    saveChannelsToDisk(channelsStore);
    try {
      const defaultRecords = DEFAULT_CHANNELS.map(testChannelToCanalRecord);
      await saveCanaisDB(defaultRecords);
    } catch (_) {}
    res.json({ success: true, count: channelsStore.length });
  });

  // --- API DE BANNERS (CRUD DIRETO NO BANCO DE DADOS DEFINITIVO: banners) ---
  app.get('/api/banners', async (_req, res) => {
    try {
      const banners = await getBannersDB();
      res.json(banners);
    } catch (err: any) {
      console.error('[DB] Erro ao consultar banners:', err?.message);
      res.status(500).json({ error: 'Erro ao buscar banners no banco de dados' });
    }
  });

  app.post('/api/banners', async (req, res) => {
    const banners = req.body;
    if (banners && typeof banners === 'object') {
      try {
        await saveBannersDB(banners);
        return res.json({ success: true, banners, persistedInDB: true });
      } catch (err: any) {
        console.error('[DB] Erro ao persistir banners no banco:', err?.message);
        return res.status(500).json({ error: 'Erro ao salvar banners no banco de dados' });
      }
    }
    return res.status(400).json({ error: 'Formato de banners inválido' });
  });

  // --- API DE ADMIN CONFIG (CRUD DIRETO NO BANCO DE DADOS DEFINITIVO: admin_config) ---
  app.get('/api/admin-config', async (_req, res) => {
    try {
      const cfg = await getAdminConfigDB();
      res.json(cfg);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar admin_config' });
    }
  });

  app.post('/api/admin-config', async (req, res) => {
    try {
      const updated = await updateAdminConfigDB(req.body || {});
      res.json({ success: true, config: updated, persistedInDB: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar admin_config' });
    }
  });

  // --- API DE PATROCINADOR & BANNERS (CRUD INTEGRADO COM BANCO DE DADOS) ---
  app.get('/api/sponsor', async (_req, res) => {
    try {
      const [adminCfg, bannersDb] = await Promise.all([getAdminConfigDB(), getBannersDB()]);
      
      const mappedBanners: any = { ...sponsorStore.banners };
      for (const [posKey, bRecord] of Object.entries(bannersDb)) {
        if (mappedBanners[posKey]) {
          mappedBanners[posKey] = {
            ...mappedBanners[posKey],
            contentType: bRecord.tipo_conteudo,
            imageUrl: bRecord.imagem_url || '',
            linkUrl: bRecord.link_url || '',
            altText: bRecord.alt_texto || mappedBanners[posKey].altText,
            scriptCode: bRecord.script_codigo || '',
            refreshIntervalSeconds: bRecord.tempo_rotacao || 60,
            active: Boolean(bRecord.ativo),
          };
        }
      }

      let parsedCards = sponsorStore.cards;
      try {
        if (adminCfg.cards_json) {
          const parsed = JSON.parse(adminCfg.cards_json);
          if (Array.isArray(parsed)) parsedCards = parsed;
        }
      } catch (_) {}

      const mergedSponsor: SponsorConfig = {
        ...sponsorStore,
        tagline: adminCfg.tagline || sponsorStore.tagline,
        description: adminCfg.descricao !== undefined ? adminCfg.descricao : sponsorStore.description,
        inPlayScript: adminCfg.inplay_script || '',
        inPlayInitialDelaySeconds: adminCfg.inplay_initial_delay_seconds || 30,
        inPlayIntervalMinutes: adminCfg.inplay_interval_minutes || 8,
        inPlayDurationSeconds: adminCfg.inplay_duration_seconds || 5,
        banners: mappedBanners,
        cards: parsedCards,
      };

      sponsorStore = mergedSponsor;
      res.json(mergedSponsor);
    } catch (err) {
      res.json(sponsorStore);
    }
  });

  app.post('/api/sponsor', async (req, res) => {
    const config = req.body;
    if (config && typeof config === 'object') {
      sponsorStore = {
        ...DEFAULT_SPONSOR_CONFIG,
        ...config,
      };
      inPlayScriptStore = sponsorStore.inPlayScript || '';
      saveSponsorToDisk(sponsorStore);

      // Persiste direto nas tabelas admin_config e banners do banco definitivo
      try {
        await updateAdminConfigDB({
          tagline: config.tagline,
          descricao: config.description,
          inplay_script: config.inPlayScript || '',
          inplay_initial_delay_seconds: config.inPlayInitialDelaySeconds ?? 30,
          inplay_interval_minutes: config.inPlayIntervalMinutes ?? 8,
          inplay_duration_seconds: config.inPlayDurationSeconds ?? 5,
          cards_json: JSON.stringify(config.cards || []),
        });

        if (config.banners && typeof config.banners === 'object') {
          const bannerRecords: Record<string, BannerRecord> = {};
          for (const [pos, item] of Object.entries(config.banners as Record<string, any>)) {
            bannerRecords[pos] = {
              id: item.id || pos,
              posicao: pos,
              tipo_conteudo: item.contentType || 'image',
              imagem_url: item.imageUrl || '',
              link_url: item.linkUrl || '',
              alt_texto: item.altText || '',
              script_codigo: item.scriptCode || '',
              tempo_rotacao: item.refreshIntervalSeconds || 60,
              ativo: item.active ? 1 : 0,
            };
          }
          await saveBannersDB(bannerRecords);
        }

        console.log('[DB] Configuração de Patrocinador e Banners gravada no banco com sucesso.');
        return res.json({ success: true, config: sponsorStore, persistedInDB: true });
      } catch (dbErr: any) {
        console.error('[DB] Erro ao gravar sponsor/banners no banco:', dbErr?.message);
        return res.json({ success: true, config: sponsorStore, warning: 'Salvo localmente' });
      }
    }
    return res.status(400).json({ error: 'Configuração inválida' });
  });

  app.post('/api/sponsor/reset', async (_req, res) => {
    sponsorStore = DEFAULT_SPONSOR_CONFIG;
    inPlayScriptStore = '';
    saveSponsorToDisk(sponsorStore);
    try {
      await updateAdminConfigDB({
        tagline: DEFAULT_SPONSOR_CONFIG.tagline,
        descricao: DEFAULT_SPONSOR_CONFIG.description,
        inplay_script: '',
        inplay_initial_delay_seconds: 30,
        inplay_interval_minutes: 8,
        inplay_duration_seconds: 5,
        cards_json: JSON.stringify(DEFAULT_SPONSOR_CONFIG.cards || []),
      });
    } catch (_) {}
    res.json({ success: true, config: sponsorStore });
  });

  // --- API DE ARMAZENAMENTO DO SCRIPT DE ANÚNCIO IN-PLAY ---
  app.get('/api/inplay-script', async (_req, res) => {
    try {
      const cfg = await getAdminConfigDB();
      res.json({ inPlayScript: cfg.inplay_script || inPlayScriptStore });
    } catch (_) {
      res.json({ inPlayScript: inPlayScriptStore });
    }
  });

  app.post('/api/inplay-script', async (req, res) => {
    const { inPlayScript } = req.body || {};
    inPlayScriptStore = typeof inPlayScript === 'string' ? inPlayScript : '';
    sponsorStore.inPlayScript = inPlayScriptStore;
    saveSponsorToDisk(sponsorStore);
    try {
      await updateAdminConfigDB({ inplay_script: inPlayScriptStore });
    } catch (_) {}
    res.json({ success: true, inPlayScript: inPlayScriptStore, persistedInDB: true });
  });

  // Health check com métricas do Broadcaster
  app.get('/api/health', (_, res) => {
    res.json({
      status: 'ok',
      channelsCount: channelsStore.length,
      broadcaster: {
        activeContinuousStreams: activeStreams.size,
        cachedStreamsOrSegments: streamCache.size,
      },
    });
  });

  // --- ENDPOINT DE HEARTBEAT DO FRONT-END (PRESENÇA E AUDIÊNCIA EM TEMPO REAL) ---
  app.post('/api/heartbeat', (req, res) => {
    const { sessionId, channelId } = req.body || {};
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const clientIp = forwarded || req.socket.remoteAddress || 'guest';
    const effectiveId = sessionId || clientIp;
    activeSiteVisitors.set(effectiveId, Date.now());

    if (channelId) {
      let chanMap = recentChannelViewers.get(channelId);
      if (!chanMap) {
        chanMap = new Map();
        recentChannelViewers.set(channelId, chanMap);
      }
      chanMap.set(effectiveId, Date.now());
    }
    res.json({ success: true, timestamp: Date.now() });
  });

  // --- ROTA PROTEGIDA DE ESTATÍSTICAS DE AUDIÊNCIA EM TEMPO REAL (/admin/api/live-stats) ---
  const handleLiveStats = (req: express.Request, res: express.Response) => {
    const pin = (req.headers['x-admin-pin'] as string) || (req.query.pin as string);
    if (pin && pin !== 'admin123' && pin !== 'Mais@0917') {
      const ADMIN_PIN_FILE = path.join(DATA_DIR, 'admin_pin.json');
      let customPin = '';
      try {
        if (fs.existsSync(ADMIN_PIN_FILE)) {
          const raw = fs.readFileSync(ADMIN_PIN_FILE, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed?.pin) customPin = String(parsed.pin);
        }
      } catch (_) {}

      if (customPin && pin !== customPin && pin !== 'Mais@0917') {
        return res.status(401).json({ error: 'Acesso negado: Senha de administrador inválida.' });
      }
    }

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const THIRTY_SECONDS = 30 * 1000;

    // 1. O Total de Pessoas no Site: contando o número de sessões ou IPs únicos conectados
    for (const [id, ts] of activeSiteVisitors.entries()) {
      if (now - ts > FIVE_MINUTES) {
        activeSiteVisitors.delete(id);
      }
    }
    const totalOnlineUsers = Math.max(1, activeSiteVisitors.size);

    // 2. O Número de Pessoas por Canal: Puxando o tamanho da lista de clientes ativos
    // de cada um dos canais no Multiplexador (stream.clients.size de cada stream ativo)
    const channelsStats = channelsStore.map((channel, index) => {
      let multiplexerClientsCount = 0;
      let hasActiveStream = false;

      // Puxando diretamente do Multiplexador (activeStreams)
      for (const [streamUrl, stream] of activeStreams.entries()) {
        const isMatch =
          streamUrl === channel.streamUrl ||
          streamUrl.includes(channel.id) ||
          channel.streamUrl.includes(streamUrl) ||
          (getXtreamHlsUrl(channel.streamUrl) && getXtreamHlsUrl(channel.streamUrl) === streamUrl);

        if (isMatch) {
          hasActiveStream = true;
          // Puxando stream.clients.size diretamente do Multiplexador conforme solicitado
          multiplexerClientsCount = Math.max(multiplexerClientsCount, stream.clients.size);
        }
      }

      // Rastreamento por heartbeat ativo do player
      let heartbeatClients = 0;
      const chanMap = recentChannelViewers.get(channel.id);
      if (chanMap) {
        for (const [cid, ts] of chanMap.entries()) {
          if (now - ts < THIRTY_SECONDS) {
            heartbeatClients++;
          } else {
            chanMap.delete(cid);
          }
        }
      }

      const watchingNow = Math.max(multiplexerClientsCount, heartbeatClients);

      return {
        playerIndex: index + 1,
        id: channel.id,
        name: channel.name,
        category: channel.category,
        quality: channel.quality,
        active: channel.active,
        streamUrl: channel.streamUrl,
        watchingNow,
        hasActiveMultiplexerStream: hasActiveStream,
        multiplexerClientsSize: multiplexerClientsCount,
      };
    });

    const totalWatchingChannels = channelsStats.reduce((sum, c) => sum + c.watchingNow, 0);

    return res.json({
      totalOnlineUsers,
      totalWatchingChannels,
      activeChannelsCount: channelsStore.filter((c) => c.active).length,
      channels: channelsStats,
      multiplexerStats: {
        activeContinuousStreams: activeStreams.size,
        cachedStreamsOrSegments: streamCache.size,
      },
      timestamp: Date.now(),
    });
  };

  app.get('/admin/api/live-stats', handleLiveStats);
  app.get('/api/admin/live-stats', handleLiveStats);

  // Montagem do Vite (Dev) ou arquivos estáticos (Prod)
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Gato Net com Proxy CORS ativo na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
