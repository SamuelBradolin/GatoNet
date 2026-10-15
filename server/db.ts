import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface CanalRecord {
  id: string;
  nome: string;
  url_iptv: string;
  resolucao: string;
  categoria: string;
  ativo: boolean | number;
  ticker_texto: string;
  ticker_habilitado?: boolean | number;
  ordem?: number;
}

export interface BannerRecord {
  id: string;
  posicao: string;
  tipo_conteudo: 'image' | 'script';
  imagem_url?: string;
  link_url?: string;
  alt_texto?: string;
  script_codigo?: string;
  tempo_rotacao?: number;
  ativo: boolean | number;
}

export interface AdminConfigRecord {
  id: number;
  total_usuarios_online: number;
  chave_pix: string;
  status_captcha: string;
  usuario: string;
  senha_hash: string;
  tagline: string;
  descricao: string;
  inplay_script: string;
  inplay_initial_delay_seconds: number;
  inplay_interval_minutes: number;
  inplay_duration_seconds: number;
  cards_json: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DB_FILE = path.join(DATA_DIR, 'gatonet_db.json');

// Estado em memória e fallback persistente para alta disponibilidade
let mysqlPool: mysql.Pool | null = null;
let isUsingMySQL = false;

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Valores padrão caso o banco esteja vazio
const DEFAULT_CANAIS: CanalRecord[] = [
  {
    id: 'canal-1',
    nome: 'Novo Canal 1',
    url_iptv: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolucao: '1080p FHD',
    categoria: 'Abertos',
    ativo: 1,
    ticker_texto: '🔴 AO VIVO: Informações e notícias em tempo real sobre a transmissão deste canal.',
    ticker_habilitado: 1,
  },
  {
    id: 'canal-2',
    nome: 'ESPN Brasil',
    url_iptv: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolucao: '1080p FHD',
    categoria: 'Esportes',
    ativo: 1,
    ticker_texto: '⚽ FUTEBOL AO VIVO: Rodada dos campeonatos estaduais e torneios internacionais com sinal 60 FPS.',
    ticker_habilitado: 1,
  },
  {
    id: 'canal-3',
    nome: 'SporTV HD',
    url_iptv: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolucao: '1080p FHD',
    categoria: 'Esportes',
    ativo: 1,
    ticker_texto: '🏆 COPA DO BRASIL & LIBERTADORES: Cobertura completa, pré-jogo e análises ao vivo.',
    ticker_habilitado: 1,
  },
  {
    id: 'canal-4',
    nome: 'Premiere Futebol Clube',
    url_iptv: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolucao: '4K UHD',
    categoria: 'Futebol',
    ativo: 1,
    ticker_texto: '⚡ TRANSMISSÃO EXCLUSIVA: Pay-Per-View liberado com tecnologia Anti-Travamento.',
    ticker_habilitado: 1,
  },
  {
    id: 'canal-5',
    nome: 'Combate UFC',
    url_iptv: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolucao: '1080p FHD',
    categoria: 'Lutas',
    ativo: 1,
    ticker_texto: '🥊 UFC AO VIVO: Card preliminar e card principal das maiores lutas da temporada.',
    ticker_habilitado: 1,
  },
];

const DEFAULT_BANNERS: Record<string, BannerRecord> = {
  top_player: {
    id: 'top_player',
    posicao: 'top_player',
    tipo_conteudo: 'image',
    imagem_url: '',
    link_url: '',
    alt_texto: 'Banner Topo do Player',
    script_codigo: '',
    tempo_rotacao: 60,
    ativo: 1,
  },
  header_beside_logo: {
    id: 'header_beside_logo',
    posicao: 'header_beside_logo',
    tipo_conteudo: 'image',
    imagem_url: '',
    link_url: '',
    alt_texto: 'Banner Cabeçalho',
    script_codigo: '',
    tempo_rotacao: 60,
    ativo: 0,
  },
  below_player: {
    id: 'below_player',
    posicao: 'below_player',
    tipo_conteudo: 'image',
    imagem_url: '',
    link_url: '',
    alt_texto: 'Banner Abaixo do Player',
    script_codigo: '',
    tempo_rotacao: 60,
    ativo: 0,
  },
  above_channels: {
    id: 'above_channels',
    posicao: 'above_channels',
    tipo_conteudo: 'image',
    imagem_url: '',
    link_url: '',
    alt_texto: 'Banner Acima dos Jogos',
    script_codigo: '',
    tempo_rotacao: 60,
    ativo: 0,
  },
  below_channels: {
    id: 'below_channels',
    posicao: 'below_channels',
    tipo_conteudo: 'image',
    imagem_url: '',
    link_url: '',
    alt_texto: 'Banner Abaixo dos Jogos',
    script_codigo: '',
    tempo_rotacao: 60,
    ativo: 0,
  },
};

const DEFAULT_ADMIN_CONFIG: AdminConfigRecord = {
  id: 1,
  total_usuarios_online: 1,
  chave_pix: 'pix@gatonet.live',
  status_captcha: 'ativo',
  usuario: 'Samuel',
  senha_hash: 'Mais@0917',
  tagline: 'Parceiro Oficial & Patrocinador Exclusivo',
  descricao:
    'Queremos que você comprove a estabilidade e a alta definição da nossa transmissão antes de tomar qualquer decisão. Clique nos botões de Play ao lado para assistir à demonstração em tempo real diretamente nesta página.',
  inplay_script: '',
  inplay_initial_delay_seconds: 30,
  inplay_interval_minutes: 8,
  inplay_duration_seconds: 5,
  cards_json: JSON.stringify([
    {
      id: 'card-1',
      badge: 'Bilhete Pronto 🔥',
      title: 'Múltipla dos Campeões',
      description: 'Seleção especial com 3 jogos de futebol europeu e alta probabilidade de retorno.',
      highlightText: 'Odd Total: 3.45',
      buttonText: 'Acessar Palpite',
      linkUrl: '#',
      themeColor: 'emerald',
      active: true,
    },
    {
      id: 'card-2',
      badge: 'Super Odds ⚡',
      title: 'Duelo dos Gigantes',
      description: 'Cotação turbinada para o clássico deste fim de semana com bônus de boas-vindas.',
      highlightText: 'Odd Especial: 2.80',
      buttonText: 'Ver Cotação',
      linkUrl: '#',
      themeColor: 'amber',
      active: true,
    },
  ]),
};

// Armazenamento em fallback local
interface LocalDatabaseState {
  canais: CanalRecord[];
  banners: Record<string, BannerRecord>;
  admin_config: AdminConfigRecord;
}

let localState: LocalDatabaseState = {
  canais: [...DEFAULT_CANAIS],
  banners: { ...DEFAULT_BANNERS },
  admin_config: { ...DEFAULT_ADMIN_CONFIG },
};

function loadLocalBackup() {
  try {
    if (fs.existsSync(BACKUP_DB_FILE)) {
      const raw = fs.readFileSync(BACKUP_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.canais)) localState.canais = parsed.canais;
        if (parsed.banners && typeof parsed.banners === 'object') localState.banners = parsed.banners;
        if (parsed.admin_config && typeof parsed.admin_config === 'object') {
          localState.admin_config = { ...DEFAULT_ADMIN_CONFIG, ...parsed.admin_config };
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Aviso ao ler arquivo local de backup:', err);
  }
}

function persistLocalBackup() {
  try {
    fs.writeFileSync(BACKUP_DB_FILE, JSON.stringify(localState, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Erro ao persistir backup local:', err);
  }
}

loadLocalBackup();

/**
 * Inicializa a conexão com o banco de dados definitivo MySQL/MariaDB
 * Se as variáveis de ambiente estiverem configuradas e acessíveis, cria tabelas e seeds.
 * Caso contrário, opera com o banco relacional persistente com sincronização automática.
 */
export async function initDatabase(): Promise<boolean> {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'gatonet_db';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

  if (!host || !user) {
    console.log('[DB] Variáveis MYSQL_HOST/MYSQL_USER não fornecidas. Operando com armazenamento persistente.');
    return false;
  }

  try {
    console.log(`[DB] Conectando ao MySQL em ${host}:${port} (banco: ${database})...`);
    mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000,
    });

    const conn = await mysqlPool.getConnection();
    console.log('✅ [DB] Conexão com o banco de dados MySQL/MariaDB estabelecida com sucesso!');
    isUsingMySQL = true;

    // 1. Criar tabela canais
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`canais\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`nome\` VARCHAR(255) NOT NULL,
        \`url_iptv\` TEXT NOT NULL,
        \`resolucao\` VARCHAR(50) DEFAULT '1080p FHD',
        \`categoria\` VARCHAR(100) DEFAULT 'Esportes',
        \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`ticker_texto\` TEXT NULL,
        \`ticker_habilitado\` TINYINT(1) NOT NULL DEFAULT 1,
        \`ordem\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Criar tabela banners
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`banners\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`posicao\` VARCHAR(64) NOT NULL,
        \`tipo_conteudo\` ENUM('image', 'script') NOT NULL DEFAULT 'image',
        \`imagem_url\` MEDIUMTEXT NULL,
        \`link_url\` TEXT NULL,
        \`alt_texto\` VARCHAR(255) NULL,
        \`script_codigo\` LONGTEXT NULL,
        \`tempo_rotacao\` INT NOT NULL DEFAULT 60,
        \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_posicao\` (\`posicao\`),
        INDEX \`idx_ativo\` (\`ativo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Criar tabela admin_config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`admin_config\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`total_usuarios_online\` INT NOT NULL DEFAULT 0,
        \`chave_pix\` VARCHAR(255) NULL,
        \`status_captcha\` VARCHAR(50) NOT NULL DEFAULT 'ativo',
        \`usuario\` VARCHAR(100) NOT NULL DEFAULT 'Samuel',
        \`senha_hash\` VARCHAR(255) NOT NULL DEFAULT 'Mais@0917',
        \`tagline\` VARCHAR(255) DEFAULT 'Parceiro Oficial & Patrocinador Exclusivo',
        \`descricao\` TEXT NULL,
        \`inplay_script\` LONGTEXT NULL,
        \`inplay_initial_delay_seconds\` INT NOT NULL DEFAULT 30,
        \`inplay_interval_minutes\` INT NOT NULL DEFAULT 8,
        \`inplay_duration_seconds\` INT NOT NULL DEFAULT 5,
        \`cards_json\` LONGTEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Inserir dados iniciais se tabelas estiverem vazias
    const [canalCount]: any = await conn.query('SELECT COUNT(*) as count FROM `canais`');
    if (canalCount && canalCount[0]?.count === 0) {
      console.log('[DB] Populando tabela canais com dados iniciais...');
      for (const c of localState.canais) {
        await conn.query(
          `INSERT INTO \`canais\` (\`id\`, \`nome\`, \`url_iptv\`, \`resolucao\`, \`categoria\`, \`ativo\`, \`ticker_texto\`, \`ticker_habilitado\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.nome, c.url_iptv, c.resolucao, c.categoria, c.ativo ? 1 : 0, c.ticker_texto, c.ticker_habilitado ? 1 : 0]
        );
      }
    }

    const [bannerCount]: any = await conn.query('SELECT COUNT(*) as count FROM \`banners\`');
    if (bannerCount && bannerCount[0]?.count === 0) {
      console.log('[DB] Populando tabela banners com dados iniciais...');
      for (const b of Object.values(localState.banners)) {
        await conn.query(
          `INSERT INTO \`banners\` (\`id\`, \`posicao\`, \`tipo_conteudo\`, \`imagem_url\`, \`link_url\`, \`alt_texto\`, \`script_codigo\`, \`tempo_rotacao\`, \`ativo\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.posicao, b.tipo_conteudo, b.imagem_url || '', b.link_url || '', b.alt_texto || '', b.script_codigo || '', b.tempo_rotacao || 60, b.ativo ? 1 : 0]
        );
      }
    }

    const [adminCount]: any = await conn.query('SELECT COUNT(*) as count FROM \`admin_config\`');
    if (adminCount && adminCount[0]?.count === 0) {
      console.log('[DB] Populando tabela admin_config com dados iniciais...');
      const cfg = localState.admin_config;
      await conn.query(
        `INSERT INTO \`admin_config\` (\`id\`, \`total_usuarios_online\`, \`chave_pix\`, \`status_captcha\`, \`usuario\`, \`senha_hash\`, \`tagline\`, \`descricao\`, \`inplay_script\`, \`inplay_initial_delay_seconds\`, \`inplay_interval_minutes\`, \`inplay_duration_seconds\`, \`cards_json\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          cfg.total_usuarios_online,
          cfg.chave_pix,
          cfg.status_captcha,
          cfg.usuario,
          cfg.senha_hash,
          cfg.tagline,
          cfg.descricao,
          cfg.inplay_script,
          cfg.inplay_initial_delay_seconds,
          cfg.inplay_interval_minutes,
          cfg.inplay_duration_seconds,
          cfg.cards_json,
        ]
      );
    }

    conn.release();
    return true;
  } catch (err: any) {
    console.warn(`[DB] Não foi possível conectar ao servidor MySQL (${err.message}). Operando em modo armazenamento persistente.`);
    isUsingMySQL = false;
    return false;
  }
}

// ----------------------------------------------------------------------------
// OPERAÇÕES DA TABELA `canais`
// ----------------------------------------------------------------------------
export async function getCanaisDB(onlyActive = false): Promise<CanalRecord[]> {
  if (isUsingMySQL && mysqlPool) {
    try {
      const sql = onlyActive
        ? 'SELECT id, nome, url_iptv, resolucao, categoria, ativo, ticker_texto, ticker_habilitado FROM `canais` WHERE `ativo` = 1 ORDER BY `ordem` ASC, `id` ASC'
        : 'SELECT id, nome, url_iptv, resolucao, categoria, ativo, ticker_texto, ticker_habilitado FROM `canais` ORDER BY `ordem` ASC, `id` ASC';
      const [rows]: any = await mysqlPool.query(sql);
      return rows.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        url_iptv: r.url_iptv,
        resolucao: r.resolucao,
        categoria: r.categoria,
        ativo: Boolean(r.ativo),
        ticker_texto: r.ticker_texto || '',
        ticker_habilitado: Boolean(r.ticker_habilitado),
      }));
    } catch (err) {
      console.error('[DB] Erro ao buscar canais no MySQL:', err);
    }
  }

  // Fallback
  if (onlyActive) {
    return localState.canais.filter((c) => c.ativo);
  }
  return [...localState.canais];
}

export async function saveCanaisDB(canais: CanalRecord[]): Promise<boolean> {
  // Atualiza localState e arquivo de disco
  localState.canais = canais.map((c, idx) => ({
    ...c,
    ordem: idx,
    ativo: c.ativo ? 1 : 0,
    ticker_habilitado: c.ticker_habilitado !== undefined ? (c.ticker_habilitado ? 1 : 0) : 1,
  }));
  persistLocalBackup();

  // Se o MySQL estiver ativo, executa comandos INSERT / UPDATE diretos no banco
  if (isUsingMySQL && mysqlPool) {
    try {
      const conn = await mysqlPool.getConnection();
      try {
        await conn.beginTransaction();

        // Limpa e reinsere a lista atualizada para manter a ordem exata
        await conn.query('DELETE FROM `canais`');
        for (let i = 0; i < canais.length; i++) {
          const c = canais[i];
          await conn.query(
            `INSERT INTO \`canais\` (\`id\`, \`nome\`, \`url_iptv\`, \`resolucao\`, \`categoria\`, \`ativo\`, \`ticker_texto\`, \`ticker_habilitado\`, \`ordem\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               \`nome\` = VALUES(\`nome\`),
               \`url_iptv\` = VALUES(\`url_iptv\`),
               \`resolucao\` = VALUES(\`resolucao\`),
               \`categoria\` = VALUES(\`categoria\`),
               \`ativo\` = VALUES(\`ativo\`),
               \`ticker_texto\` = VALUES(\`ticker_texto\`),
               \`ticker_habilitado\` = VALUES(\`ticker_habilitado\`),
               \`ordem\` = VALUES(\`ordem\`)`,
            [
              c.id,
              c.nome,
              c.url_iptv,
              c.resolucao || '1080p FHD',
              c.categoria || 'Geral',
              c.ativo ? 1 : 0,
              c.ticker_texto || '',
              c.ticker_habilitado ? 1 : 0,
              i,
            ]
          );
        }

        await conn.commit();
        console.log(`[DB] ${canais.length} canais salvos com sucesso no MySQL!`);
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('[DB] Erro ao sincronizar canais no MySQL:', err);
    }
  }

  return true;
}

// ----------------------------------------------------------------------------
// OPERAÇÕES DA TABELA `banners`
// ----------------------------------------------------------------------------
export async function getBannersDB(): Promise<Record<string, BannerRecord>> {
  if (isUsingMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(
        'SELECT id, posicao, tipo_conteudo, imagem_url, link_url, alt_texto, script_codigo, tempo_rotacao, ativo FROM `banners`'
      );
      const map: Record<string, BannerRecord> = {};
      for (const r of rows) {
        map[r.posicao] = {
          id: r.id,
          posicao: r.posicao,
          tipo_conteudo: r.tipo_conteudo,
          imagem_url: r.imagem_url || '',
          link_url: r.link_url || '',
          alt_texto: r.alt_texto || '',
          script_codigo: r.script_codigo || '',
          tempo_rotacao: r.tempo_rotacao || 60,
          ativo: Boolean(r.ativo),
        };
      }
      return map;
    } catch (err) {
      console.error('[DB] Erro ao buscar banners no MySQL:', err);
    }
  }

  return { ...localState.banners };
}

export async function saveBannersDB(banners: Record<string, BannerRecord>): Promise<boolean> {
  localState.banners = { ...banners };
  persistLocalBackup();

  if (isUsingMySQL && mysqlPool) {
    try {
      for (const b of Object.values(banners)) {
        await mysqlPool.query(
          `INSERT INTO \`banners\` (\`id\`, \`posicao\`, \`tipo_conteudo\`, \`imagem_url\`, \`link_url\`, \`alt_texto\`, \`script_codigo\`, \`tempo_rotacao\`, \`ativo\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`tipo_conteudo\` = VALUES(\`tipo_conteudo\`),
             \`imagem_url\` = VALUES(\`imagem_url\`),
             \`link_url\` = VALUES(\`link_url\`),
             \`alt_texto\` = VALUES(\`alt_texto\`),
             \`script_codigo\` = VALUES(\`script_codigo\`),
             \`tempo_rotacao\` = VALUES(\`tempo_rotacao\`),
             \`ativo\` = VALUES(\`ativo\`)`,
          [
            b.id,
            b.posicao,
            b.tipo_conteudo,
            b.imagem_url || '',
            b.link_url || '',
            b.alt_texto || '',
            b.script_codigo || '',
            b.tempo_rotacao || 60,
            b.ativo ? 1 : 0,
          ]
        );
      }
      console.log('[DB] Banners atualizados com sucesso no MySQL!');
    } catch (err) {
      console.error('[DB] Erro ao salvar banners no MySQL:', err);
    }
  }

  return true;
}

// ----------------------------------------------------------------------------
// OPERAÇÕES DA TABELA `admin_config`
// ----------------------------------------------------------------------------
export async function getAdminConfigDB(): Promise<AdminConfigRecord> {
  if (isUsingMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM `admin_config` WHERE `id` = 1 LIMIT 1');
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: 1,
          total_usuarios_online: Number(r.total_usuarios_online) || 0,
          chave_pix: r.chave_pix || '',
          status_captcha: r.status_captcha || 'ativo',
          usuario: r.usuario || 'Samuel',
          senha_hash: r.senha_hash || 'Mais@0917',
          tagline: r.tagline || DEFAULT_ADMIN_CONFIG.tagline,
          descricao: r.descricao !== undefined ? r.descricao : DEFAULT_ADMIN_CONFIG.descricao,
          inplay_script: r.inplay_script || '',
          inplay_initial_delay_seconds: Number(r.inplay_initial_delay_seconds) || 30,
          inplay_interval_minutes: Number(r.inplay_interval_minutes) || 8,
          inplay_duration_seconds: Number(r.inplay_duration_seconds) || 5,
          cards_json: r.cards_json || DEFAULT_ADMIN_CONFIG.cards_json,
        };
      }
    } catch (err) {
      console.error('[DB] Erro ao buscar admin_config no MySQL:', err);
    }
  }

  return { ...localState.admin_config };
}

export async function updateAdminConfigDB(partial: Partial<AdminConfigRecord>): Promise<AdminConfigRecord> {
  localState.admin_config = {
    ...localState.admin_config,
    ...partial,
  };
  persistLocalBackup();

  if (isUsingMySQL && mysqlPool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (partial.total_usuarios_online !== undefined) {
        fields.push('`total_usuarios_online` = ?');
        values.push(partial.total_usuarios_online);
      }
      if (partial.chave_pix !== undefined) {
        fields.push('`chave_pix` = ?');
        values.push(partial.chave_pix);
      }
      if (partial.status_captcha !== undefined) {
        fields.push('`status_captcha` = ?');
        values.push(partial.status_captcha);
      }
      if (partial.usuario !== undefined) {
        fields.push('`usuario` = ?');
        values.push(partial.usuario);
      }
      if (partial.senha_hash !== undefined) {
        fields.push('`senha_hash` = ?');
        values.push(partial.senha_hash);
      }
      if (partial.tagline !== undefined) {
        fields.push('`tagline` = ?');
        values.push(partial.tagline);
      }
      if (partial.descricao !== undefined) {
        fields.push('`descricao` = ?');
        values.push(partial.descricao);
      }
      if (partial.inplay_script !== undefined) {
        fields.push('`inplay_script` = ?');
        values.push(partial.inplay_script);
      }
      if (partial.inplay_initial_delay_seconds !== undefined) {
        fields.push('`inplay_initial_delay_seconds` = ?');
        values.push(partial.inplay_initial_delay_seconds);
      }
      if (partial.inplay_interval_minutes !== undefined) {
        fields.push('`inplay_interval_minutes` = ?');
        values.push(partial.inplay_interval_minutes);
      }
      if (partial.inplay_duration_seconds !== undefined) {
        fields.push('`inplay_duration_seconds` = ?');
        values.push(partial.inplay_duration_seconds);
      }
      if (partial.cards_json !== undefined) {
        fields.push('`cards_json` = ?');
        values.push(partial.cards_json);
      }

      if (fields.length > 0) {
        values.push(1);
        await mysqlPool.query(
          `UPDATE \`admin_config\` SET ${fields.join(', ')} WHERE \`id\` = ?`,
          values
        );
        console.log('[DB] admin_config atualizada com sucesso no MySQL!');
      }
    } catch (err) {
      console.error('[DB] Erro ao atualizar admin_config no MySQL:', err);
    }
  }

  return localState.admin_config;
}
