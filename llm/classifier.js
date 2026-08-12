

'use strict';

const { callWithTools } = require('./openaiClient');
const { TriagemSchema, TOOL_DEFINITION } = require('./schema');
const { buildMessages } = require('./prompt');

/**
 * Classifica uma mensagem bruta usando OpenAI tool use.
 *
 * @param {import('../models/message').RawMessage} rawMsg
 * @returns {Promise<{
 *   categoria: string,
 *   confianca: number,
 *   cliente_nome: string|null,
 *   numero_processo: string|null,
 *   prazo_data: string|null,
 *   resumo: string
 * }>}
 */
async function classify(rawMsg) {
  const messages = buildMessages(rawMsg);

  const rawResult = await callWithTools(
    messages,
    [TOOL_DEFINITION],
    'registrar_triagem'
  );

  // Valida e aplica defaults via Zod
  const parsed = TriagemSchema.parse(rawResult);
  return parsed;
}

module.exports = { classify };
