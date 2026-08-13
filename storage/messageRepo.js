

'use strict';

const { getDb } = require('./db');

/**
 * Persiste uma mensagem classificada.
 * @param {import('../models/message').ClassifiedMessage} msg
 */
function save(msg) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages
      (id, canal, remetente, recebido_em, texto_bruto, categoria, confianca,
       cliente_nome, numero_processo, prazo_data, resumo, status_revisao)
    VALUES
      (@id, @canal, @remetente, @recebido_em, @texto_bruto, @categoria, @confianca,
       @cliente_nome, @numero_processo, @prazo_data, @resumo, @status_revisao)
  `);
  return stmt.run(msg);
}

/**
 * Busca todas as mensagens do dia (UTC).
 * @param {string} date - 'YYYY-MM-DD'
 */
function findByDate(date) {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM messages WHERE recebido_em LIKE ? ORDER BY recebido_em DESC`)
    .all(`${date}%`);
}

/**
 * Retorna contagem por categoria para uma data.
 * @param {string} date - 'YYYY-MM-DD'
 */
function countByCategory(date) {
  const db = getDb();
  return db
    .prepare(`
      SELECT categoria, COUNT(*) as total
      FROM messages
      WHERE recebido_em LIKE ?
      GROUP BY categoria
    `)
    .all(`${date}%`);
}

/**
 * Busca urgentes com prazo definido para uma data, ordenados por prazo.
 * @param {string} date - 'YYYY-MM-DD'
 */
function findUrgentByDate(date) {
  const db = getDb();
  return db
    .prepare(`
      SELECT * FROM messages
      WHERE recebido_em LIKE ?
        AND categoria = 'urgente_prazo'
      ORDER BY prazo_data ASC
    `)
    .all(`${date}%`);
}

/**
 * Lista todas as mensagens com status de erro de extração.
 */
function findErros() {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM messages WHERE status_revisao = 'erro_extracao' ORDER BY recebido_em DESC`)
    .all();
}

/**
 * Verifica se a mensagem já foi processada (mesmo remetente e mesmo texto).
 * Usado para deduplicação antes de bater na OpenAI.
 * @param {string} remetente
 * @param {string} texto
 * @returns {boolean}
 */
function isDuplicate(remetente, texto) {
  const db = getDb();
  const row = db
    .prepare(`SELECT 1 FROM messages WHERE remetente = ? AND texto_bruto = ? LIMIT 1`)
    .get(remetente, texto);
  return !!row;
}

/**
 * Atualiza o status de revisão de uma mensagem.
 * @param {string} id
 * @param {string} status - 'novo' | 'revisado' | 'erro_extracao'
 */
function updateStatus(id, status) {
  const db = getDb();
  return db
    .prepare(`UPDATE messages SET status_revisao = ? WHERE id = ?`)
    .run(status, id);
}

module.exports = { save, findByDate, countByCategory, findUrgentByDate, findErros, isDuplicate, updateStatus };

