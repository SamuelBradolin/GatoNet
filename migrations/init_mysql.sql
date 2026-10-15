-- ============================================================================
-- SCRIPT DE MIGRAÇÃO: BANCO DE DADOS DEFINITIVO (MySQL / MariaDB)
-- Sistema: Gato Net Oficial - IPTV & Streaming
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `gatonet_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `gatonet_db`;

-- ----------------------------------------------------------------------------
-- 1. TABELA: canais
-- Estrutura: (id, nome, url_iptv, resolucao, ativo, ticker_texto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `canais` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `url_iptv` TEXT NOT NULL,
  `resolucao` VARCHAR(50) DEFAULT '1080p FHD',
  `categoria` VARCHAR(100) DEFAULT 'Esportes',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `ticker_texto` TEXT NULL,
  `ticker_habilitado` TINYINT(1) NOT NULL DEFAULT 1,
  `ordem` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABELA: banners
-- Estrutura: (id, posicao, tipo_conteudo, imagem_url, link_url, script_codigo, tempo_rotacao, ativo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `banners` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `posicao` VARCHAR(64) NOT NULL,
  `tipo_conteudo` ENUM('image', 'script') NOT NULL DEFAULT 'image',
  `imagem_url` MEDIUMTEXT NULL,
  `link_url` TEXT NULL,
  `alt_texto` VARCHAR(255) NULL,
  `script_codigo` LONGTEXT NULL,
  `tempo_rotacao` INT NOT NULL DEFAULT 60,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_posicao` (`posicao`),
  INDEX `idx_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABELA: admin_config
-- Estrutura: (id, total_usuarios_online, chave_pix, status_captcha, ...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_config` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `total_usuarios_online` INT NOT NULL DEFAULT 0,
  `chave_pix` VARCHAR(255) NULL,
  `status_captcha` VARCHAR(50) NOT NULL DEFAULT 'ativo',
  `usuario` VARCHAR(100) NOT NULL DEFAULT 'Samuel',
  `senha_hash` VARCHAR(255) NOT NULL DEFAULT 'Mais@0917',
  `tagline` VARCHAR(255) DEFAULT 'Parceiro Oficial & Patrocinador Exclusivo',
  `descricao` TEXT NULL,
  `inplay_script` LONGTEXT NULL,
  `inplay_initial_delay_seconds` INT NOT NULL DEFAULT 30,
  `inplay_interval_minutes` INT NOT NULL DEFAULT 8,
  `inplay_duration_seconds` INT NOT NULL DEFAULT 5,
  `cards_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DADOS INICIAIS (SEEDS)
-- ============================================================================

-- Inserção dos Canais Iniciais
INSERT INTO `canais` (`id`, `nome`, `url_iptv`, `resolucao`, `categoria`, `ativo`, `ticker_texto`, `ticker_habilitado`, `ordem`)
VALUES
  ('canal-1', 'Novo Canal 1', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', '1080p FHD', 'Abertos', 1, '🔴 AO VIVO: Informações e notícias em tempo real sobre a transmissão deste canal.', 1, 1),
  ('canal-2', 'ESPN Brasil', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', '1080p FHD', 'Esportes', 1, '⚽ FUTEBOL AO VIVO: Rodada dos campeonatos estaduais e torneios internacionais com sinal 60 FPS.', 1, 2),
  ('canal-3', 'SporTV HD', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', '1080p FHD', 'Esportes', 1, '🏆 COPA DO BRASIL & LIBERTADORES: Cobertura completa, pré-jogo e análises ao vivo.', 1, 3),
  ('canal-4', 'Premiere Futebol Clube', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', '4K UHD', 'Futebol', 1, '⚡ TRANSMISSÃO EXCLUSIVA: Pay-Per-View liberado com tecnologia Anti-Travamento.', 1, 4),
  ('canal-5', 'Combate UFC', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', '1080p FHD', 'Lutas', 1, '🥊 UFC AO VIVO: Card preliminar e card principal das maiores lutas da temporada.', 1, 5)
ON DUPLICATE KEY UPDATE 
  `nome` = VALUES(`nome`),
  `url_iptv` = VALUES(`url_iptv`),
  `resolucao` = VALUES(`resolucao`),
  `ativo` = VALUES(`ativo`),
  `ticker_texto` = VALUES(`ticker_texto`);

-- Inserção dos Banners Iniciais
INSERT INTO `banners` (`id`, `posicao`, `tipo_conteudo`, `imagem_url`, `link_url`, `alt_texto`, `script_codigo`, `tempo_rotacao`, `ativo`)
VALUES
  ('top_player', 'top_player', 'image', '', '', 'Banner Topo do Player', '', 60, 1),
  ('header_beside_logo', 'header_beside_logo', 'image', '', '', 'Banner Cabeçalho', '', 60, 0),
  ('below_player', 'below_player', 'image', '', '', 'Banner Abaixo do Player', '', 60, 0),
  ('above_channels', 'above_channels', 'image', '', '', 'Banner Acima dos Jogos', '', 60, 0),
  ('below_channels', 'below_channels', 'image', '', '', 'Banner Abaixo dos Jogos', '', 60, 0)
ON DUPLICATE KEY UPDATE 
  `posicao` = VALUES(`posicao`),
  `tipo_conteudo` = VALUES(`tipo_conteudo`);

-- Inserção da Configuração Administrativa Padrão
INSERT INTO `admin_config` (`id`, `total_usuarios_online`, `chave_pix`, `status_captcha`, `usuario`, `senha_hash`, `tagline`, `descricao`, `inplay_initial_delay_seconds`, `inplay_interval_minutes`, `inplay_duration_seconds`)
VALUES
  (1, 1, 'pix@gatonet.live', 'ativo', 'Samuel', 'Mais@0917', 'Parceiro Oficial & Patrocinador Exclusivo', 'Queremos que você comprove a estabilidade e a alta definição da nossa transmissão antes de tomar qualquer decisão. Clique nos botões de Play ao lado para assistir à demonstração em tempo real diretamente nesta página.', 30, 8, 5)
ON DUPLICATE KEY UPDATE
  `usuario` = VALUES(`usuario`),
  `senha_hash` = VALUES(`senha_hash`);
