
'use strict';

require('dotenv').config();

const cron = require('node-cron');

const { classify } = require('./llm/classifier');
const { validateExtracted } = require('./validation/validators');
const { save, isDuplicate } = require('./storage/messageRepo');
const { imprimirResumo } = require('./resumo/gerarResumo');
const FolderWatcherChannel = require('./channels/folderWatcher');

const CONFIANCA_MINIMA = Number(process.env.CONFIANCA_MINIMA) || 0.6;

/**
 * Processa uma mensagem bruta através do pipeline completo:
 * 1. Classifica via LLM
 * 2. Valida campos extraídos
 * 3. Persiste no SQLite
 *
 * @param {import('./models/message').RawMessage} rawMsg
 */
async function processMessage(rawMsg) {
  const start = Date.now();

  // 1. Deduplicação (evita gastar tokens da API se for repetição)
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
    save({
      id: rawMsg.id,
      canal: rawMsg.canal,
      remetente: rawMsg.remetente,
      recebido_em: rawMsg.timestamp,
      texto_bruto: rawMsg.texto,
      categoria: 'irrelevante',
      confianca: 0,
      cliente_nome: null,
      numero_processo: null,
      prazo_data: null,
      resumo: `Erro na classificação: ${err.message}`,
      status_revisao: 'erro_extracao',
    });
    return;
  }

  // Validação pós-LLM (formato, não semântica)
  const validation = validateExtracted(classified);
  let status_revisao = 'novo';

  if (!validation.ok) {
    console.warn(`[Pipeline] Falha de validação em ${rawMsg.id}: ${validation.errors.join('; ')}`);
    status_revisao = 'erro_extracao';
  }

  // Confiança baixa → revisão humana
  if (classified.confianca < CONFIANCA_MINIMA) {
    console.warn(`[Pipeline] Confiança baixa (${classified.confianca}) em ${rawMsg.id} → revisão humana`);
    status_revisao = 'erro_extracao';
  }

  const prazo_data = validation.normalized?.prazo_data ?? classified.prazo_data;

  save({
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
  });

  const ms = Date.now() - start;
  console.log(
    `[Pipeline] ✓ ${rawMsg.id} → ${classified.categoria} (conf: ${classified.confianca.toFixed(2)}) | status: ${status_revisao} | ${ms}ms`
  );
}

// ──────────────────────────────────────────
// Canal: Folder Watcher
// ──────────────────────────────────────────
const folderWatcher = new FolderWatcherChannel(processMessage);
folderWatcher.start();

// ──────────────────────────────────────────
// Cron diário — resumo às 18h
// ──────────────────────────────────────────
cron.schedule('0 18 * * *', () => {
  console.log('[Cron] Gerando resumo diário...');
  imprimirResumo();
});

console.log('\n🚀 Pipeline de Triagem iniciado');
console.log('   Inbox: ./inbox (arquivos .txt, .eml, .json)');
console.log('   Resumo manual: npm run resumo\n');

module.exports = { processMessage };
