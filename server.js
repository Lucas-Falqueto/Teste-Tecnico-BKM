'use strict';

require('dotenv').config();

const path    = require('path');
const express = require('express');
const cron    = require('node-cron');

const { router, notifyClients } = require('./api/routes');
const { classify }              = require('./llm/classifier');
const { validateExtracted }     = require('./validation/validators');
const { save, isDuplicate }     = require('./storage/messageRepo');
const { imprimirResumo }        = require('./resumo/gerarResumo');
const FolderWatcherChannel      = require('./channels/folderWatcher');

const PORT            = Number(process.env.PORT) || 3000;
const CONFIANCA_MINIMA = Number(process.env.CONFIANCA_MINIMA) || 0.6;

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline (idêntico ao index.js — reutilizado aqui para não duplicar lógica)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Processa uma mensagem bruta pelo pipeline completo e notifica clientes SSE.
 * @param {import('./models/message').RawMessage} rawMsg
 */
async function processMessage(rawMsg) {
  const start = Date.now();

  if (isDuplicate(rawMsg.remetente, rawMsg.texto)) {
    console.warn(`[Pipeline] 🔁 Ignorado (duplicada): ${rawMsg.id} de ${rawMsg.remetente}`);
    return;
  }

  console.log(`\n[Pipeline] Processando ${rawMsg.id} (${rawMsg.canal}) — "${rawMsg.texto.slice(0, 60)}..."`);

  let classified;
  try {
    classified = await classify(rawMsg);
  } catch (err) {
    console.error(`[Pipeline] Falha na classificação de ${rawMsg.id}:`, err.message);
    const saved = {
      id: rawMsg.id,
      canal: rawMsg.canal,
      remetente: rawMsg.remetente,
      recebido_em: rawMsg.timestamp,
      texto_bruto: rawMsg.texto,
      categoria: 'spam_irrelevante',
      confianca: 0,
      cliente_nome: null,
      numero_processo: null,
      prazo_data: null,
      resumo: `Erro na classificação: ${err.message}`,
      status_revisao: 'erro_extracao',
    };
    save(saved);
    notifyClients('new_message', saved);
    return;
  }

  const validation   = validateExtracted(classified);
  let status_revisao = 'novo';

  if (!validation.ok) {
    console.warn(`[Pipeline] Falha de validação em ${rawMsg.id}: ${validation.errors.join('; ')}`);
    status_revisao = 'erro_extracao';
  }

  if (classified.confianca < CONFIANCA_MINIMA) {
    console.warn(`[Pipeline] Confiança baixa (${classified.confianca}) em ${rawMsg.id} → revisão humana`);
    status_revisao = 'erro_extracao';
  }

  const prazo_data = validation.normalized?.prazo_data ?? classified.prazo_data;

  const record = {
    id: rawMsg.id,
    canal: rawMsg.canal,
    remetente: rawMsg.remetente,
    recebido_em: rawMsg.timestamp,
    texto_bruto: rawMsg.texto,
    categoria: classified.categoria,
    confianca: classified.confianca,
    cliente_nome: classified.cliente_nome ?? null,
    numero_processo: classified.numero_processo ?? null,
    prazo_data: prazo_data ?? null,
    resumo: classified.resumo,
    status_revisao,
  };

  save(record);

  // Notifica todos os browsers conectados via SSE
  notifyClients('new_message', record);

  const ms = Date.now() - start;
  console.log(
    `[Pipeline] ✓ ${rawMsg.id} → ${classified.categoria} (conf: ${classified.confianca.toFixed(2)}) | status: ${status_revisao} | ${ms}ms`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Express
// ──────────────────────────────────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));
app.use('/api', router);

// Fallback: qualquer rota não-API serve o index.html (SPA-friendly)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`\n🌐 Interface web disponível em: http://localhost:${PORT}`);
});

// ──────────────────────────────────────────────────────────────────────────────
// Canal: Folder Watcher
// ──────────────────────────────────────────────────────────────────────────────
const folderWatcher = new FolderWatcherChannel(processMessage);
folderWatcher.start();

// ──────────────────────────────────────────────────────────────────────────────
// Cron diário — resumo às 18h
// ──────────────────────────────────────────────────────────────────────────────
cron.schedule('0 18 * * *', () => {
  console.log('[Cron] Gerando resumo diário...');
  imprimirResumo();
});

console.log('🚀 Pipeline de Triagem iniciado (modo web)');
console.log('   Inbox: ./inbox (arquivos .txt, .eml, .json)');
console.log('   Resumo manual: npm run resumo\n');

module.exports = { processMessage };
