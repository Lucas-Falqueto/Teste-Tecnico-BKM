

'use strict';

const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'triagem.db');

let _db;

function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // WAL mode para leituras concorrentes sem bloquear escritas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      canal           TEXT NOT NULL,
      remetente       TEXT,
      recebido_em     TEXT NOT NULL,
      texto_bruto     TEXT NOT NULL,
      categoria       TEXT NOT NULL,
      confianca       REAL,
      cliente_nome    TEXT,
      numero_processo TEXT,
      prazo_data      TEXT,
      resumo          TEXT,
      status_revisao  TEXT NOT NULL DEFAULT 'novo'
    );

    CREATE INDEX IF NOT EXISTS idx_categoria ON messages(categoria);
    CREATE INDEX IF NOT EXISTS idx_recebido_em ON messages(recebido_em);
    CREATE INDEX IF NOT EXISTS idx_status ON messages(status_revisao);
  `);

  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = { getDb, closeDb };
