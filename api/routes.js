'use strict';

const express = require('express');
const router = express.Router();

const {
  findByDate,
  countByCategory,
  findUrgentByDate,
  findErros,
  updateStatus,
} = require('../storage/messageRepo');

// ── SSE: clientes conectados aguardando eventos ──────────────────────────────
const sseClients = new Set();

/**
 * Notifica todos os clientes SSE conectados.
 * Chamado pelo server.js após cada processMessage() concluído.
 * @param {string} event - nome do evento (ex: 'new_message')
 * @param {object} data  - payload JSON
 */
function notifyClients(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

// ── GET /api/events — Server-Sent Events ─────────────────────────────────────
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Mantém a conexão viva
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  sseClients.add(res);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// ── GET /api/messages?date=YYYY-MM-DD ────────────────────────────────────────
router.get('/messages', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const messages = findByDate(date);
    res.json({ ok: true, date, data: messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/messages/errors ─────────────────────────────────────────────────
router.get('/messages/errors', (req, res) => {
  try {
    const data = findErros();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/messages/urgent?date=YYYY-MM-DD ─────────────────────────────────
router.get('/messages/urgent', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = findUrgentByDate(date);
    res.json({ ok: true, date, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/stats?date=YYYY-MM-DD ───────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = countByCategory(date);
    res.json({ ok: true, date, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/messages/:id/status ───────────────────────────────────────────
const VALID_STATUSES = ['novo', 'revisado', 'erro_extracao'];

router.patch('/messages/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const result = updateStatus(id, status);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Mensagem não encontrada.' });
    }

    res.json({ ok: true, id, status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = { router, notifyClients };
