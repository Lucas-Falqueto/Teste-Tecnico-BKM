
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');
const Channel = require('./channel');

const INBOX_PATH = path.join(__dirname, '..', 'inbox');

class FolderWatcherChannel extends Channel {
  constructor(onMessage) {
    super();
    /**
     * Callback chamado para cada mensagem detectada.
     * @type {(msg: import('../models/message').RawMessage) => Promise<void>}
     */
    this.onMessage = onMessage;
    this._watcher = null;
  }

  /**
   * Inicia o watcher. Chama onMessage para cada mensagem encontrada no arquivo.
   */
  start() {
    console.log(`[FolderWatcher] Observando ${INBOX_PATH}`);

    this._watcher = chokidar.watch(INBOX_PATH, {
      persistent: true,
      ignoreInitial: false,       // processa arquivos já existentes ao iniciar
      awaitWriteFinish: {         // espera o arquivo terminar de ser escrito
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this._watcher.on('add', (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.txt' && ext !== '.eml' && ext !== '.json') return;

      try {
        const msgs = this._parseFile(filePath);
        console.log(`[FolderWatcher] ${path.basename(filePath)} → ${msgs.length} mensagem(ns) detectada(s)`);

        for (const msg of msgs) {
          this.onMessage(msg).catch((err) =>
            console.error(`[FolderWatcher] Erro ao processar msg ${msg.id}:`, err)
          );
        }
      } catch (err) {
        console.error(`[FolderWatcher] Erro ao ler ${filePath}:`, err);
      }
    });

    this._watcher.on('error', (err) => {
      console.error('[FolderWatcher] Erro no watcher:', err);
    });
  }

  stop() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Lê o arquivo e retorna um array de RawMessages.
   *
   * @param {string} filePath
   * @returns {import('../models/message').RawMessage[]}
   */
  _parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (content.startsWith('[')) {
      let items;
      try {
        items = JSON.parse(content);
      } catch {
        throw new Error(`JSON inválido em ${path.basename(filePath)}`);
      }

      if (!Array.isArray(items)) {
        throw new Error(`Esperava um array JSON em ${path.basename(filePath)}`);
      }

      return items.map((item) => ({

        id: crypto.randomUUID(),
        canal: item.canal,
        remetente: item.de || item.remetente || 'desconhecido',
        timestamp: item.timestamp || new Date().toISOString(),
        texto: item.texto || '',
      }));
    }


    const lines = content.split('\n');
    let remetente = path.basename(filePath, path.extname(filePath));
    let texto = content;

    if (lines[0].toLowerCase().startsWith('remetente:')) {
      remetente = lines[0].replace(/^remetente:\s*/i, '').trim();
      texto = lines.slice(2).join('\n').trim();
    }

    return [{
      id: crypto.randomUUID(),
      canal: 'email',
      remetente,
      timestamp: new Date().toISOString(),
      texto,
    }];
  }
  async fetchNewMessages() {
    return [];
  }
}

module.exports = FolderWatcherChannel;
