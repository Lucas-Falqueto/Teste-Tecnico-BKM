
'use strict';

const fs = require('fs');
const path = require('path');
const { countByCategory, findUrgentByDate, findByDate } = require('../storage/messageRepo');
const { CATEGORIAS } = require('../models/message');

/**
 * Formata uma data ISO para DD/MM/YYYY.
 * @param {string} iso
 */
function formatDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Gera o texto do resumo diário.
 * @param {string} [dateStr] - 'YYYY-MM-DD'. Padrão: hoje (UTC).
 * @returns {string}
 */
function gerarResumo(dateStr) {
  const date = dateStr || new Date().toISOString().split('T')[0];

  const totaisList = countByCategory(date);
  const messages = findByDate(date); // Pega todas as mensagens do dia

  // Monta mapa de totais
  const totaisMap = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
  for (const row of totaisList) {
    totaisMap[row.categoria] = row.total;
  }

  const totalGeral = Object.values(totaisMap).reduce((a, b) => a + b, 0);

  // Linha de totais por categoria
  const totaisLinha = CATEGORIAS.map((c) => `${c}:${totaisMap[c]}`).join('  ');

  // Ordem de urgência desejada para exibição
  const ordemCategorias = [
    { cat: 'urgente_prazo', titulo: '🔴 URGENTES' },
    { cat: 'agendamento', titulo: '📅 AGENDAMENTOS' },
    { cat: 'duvida_processo', titulo: '❓ DÚVIDAS DE PROCESSO' },
    { cat: 'financeiro', titulo: '💰 FINANCEIRO' },
    { cat: 'documento_recebido', titulo: '📄 DOCUMENTOS RECEBIDOS' },
    { cat: 'spam_irrelevante', titulo: '🗑️ SPAM / IRRELEVANTES' },
  ];

  const blocos = [];

  for (const { cat, titulo } of ordemCategorias) {
    const msgs = messages.filter(m => m.categoria === cat);
    if (msgs.length > 0) {
      const linhas = msgs.map((m) => {
        const cliente = m.cliente_nome || m.remetente || 'Cliente não identificado';
        const proc = m.numero_processo ? `Proc. ${m.numero_processo}` : 'Sem nº processo';
        const prazo = m.prazo_data ? `prazo: ${formatDate(m.prazo_data)}` : 'sem prazo definido';
        const alerta = m.status_revisao === 'erro_extracao' ? '[⚠️ REVISÃO] ' : '';
        return `  - ${alerta}${cliente} | ${proc} | ${prazo} | ${m.resumo}`;
      });
      blocos.push(`\n${titulo} (${msgs.length})\n${linhas.join('\n')}`);
    }
  }

  if (blocos.length === 0) {
    blocos.push('\n✅ Nenhuma mensagem processada hoje.');
  }

  const resumo = [
    `╔════════════════════════════════════════╗`,
    `  RESUMO DIÁRIO — ${formatDate(date + 'T00:00:00')}`,
    `  Total de mensagens: ${totalGeral}`,
    `╚════════════════════════════════════════╝`,
    blocos.join('\n'),
    `\nTOTAIS POR CATEGORIA:`,
    `  ${totaisLinha}`,
  ].join('\n');

  return resumo;
}

/**
 * Exporta o resumo diário para um arquivo TXT.
 * @param {string} texto - O texto do resumo já formatado.
 * @param {string} [dateStr]
 * @returns {string} Caminho do arquivo
 */
function exportarTXT(texto, dateStr) {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const filename = `relatorio-${date}.txt`;

  // Salva dentro da pasta 'relatorios'
  const outDir = path.join(process.cwd(), 'relatorios');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, texto, 'utf8');
  return filepath;
}

/**
 * Imprime o resumo diário no stdout e exporta o TXT correspondente.
 * @param {string} [date]
 */
function imprimirResumo(date) {
  const texto = gerarResumo(date);
  console.log('\n' + texto + '\n');

  try {
    const txtPath = exportarTXT(texto, date);
    console.log(`📄 Relatório em texto salvo em: ${txtPath}\n`);
  } catch (err) {
    console.error(`Falha ao salvar TXT: ${err.message}`);
  }

  return texto;
}

module.exports = { gerarResumo, imprimirResumo, exportarTXT };

// Se executado diretamente: node relatorio/gerarResumo.js [YYYY-MM-DD]
if (require.main === module) {
  const date = process.argv[2];
  imprimirResumo(date);
}
