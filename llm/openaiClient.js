

'use strict';

const { OpenAI } = require('openai');
require('dotenv').config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não definida. Copie .env.example para .env e configure a chave.');
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Chama o OpenAI com tool use e retorna o argumento parseado da ferramenta.
 * Inclui retry com backoff exponencial (até 3 tentativas).
 *
 * @param {Array} messages
 * @param {Array} tools
 * @param {string} toolName  - Nome da função que deve ser chamada
 * @param {number} [attempt=1]
 * @returns {Promise<Object>} - Argumentos da tool call parseados como JSON
 */
async function callWithTools(messages, tools, toolName, attempt = 1) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: { type: 'function', function: { name: toolName } },
      temperature: 0.1, // baixo para consistência na classificação
      max_tokens: 256,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('OpenAI não retornou tool_call');
    }

    return JSON.parse(toolCall.function.arguments);
  } catch (err) {
    if (attempt < 3) {
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[openaiClient] Tentativa ${attempt} falhou. Retentando em ${delay}ms... (${err.message})`);
      await new Promise((r) => setTimeout(r, delay));
      return callWithTools(messages, tools, toolName, attempt + 1);
    }
    throw err;
  }
}

module.exports = { callWithTools, MODEL };
