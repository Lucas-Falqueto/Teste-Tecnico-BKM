'use strict';

require('dotenv').config();

const { OpenAI } = require('openai');
const { SYSTEM_PROMPT, buildMessages } = require('../llm/prompt');
const { MODEL } = require('../llm/openaiClient');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Apenas o PRIMEIRO item do JSON de teste
const primeiroItem = {
  id: '1',
  canal: 'email',
  remetente: 'carlos.pereira@uol.com.br',
  texto: 'Bom dia. Recebi uma intimação dizendo que tenho até 15/08/2026 para me manifestar no processo 0011456-78.2025.5.03.0132. O que eu faço? Carlos',
  timestamp: new Date().toISOString(),
};

(async () => {
  console.log('='.repeat(60));
  console.log('🔍 Teste de consumo de tokens — 1 item');
  console.log('   Modelo:', MODEL);
  console.log('='.repeat(60));
  console.log('\n📨 Mensagem de entrada:');
  console.log(`   Canal: ${primeiroItem.canal}`);
  console.log(`   De: ${primeiroItem.remetente}`);
  console.log(`   Texto: "${primeiroItem.texto}"`);
  console.log('\n⏳ Chamando OpenAI...\n');

  const messages = buildMessages(primeiroItem);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: [
      {
        type: 'function',
        function: {
          name: 'registrar_triagem',
          description: 'Registra a triagem de uma mensagem',
          parameters: {
            type: 'object',
            properties: {
              categoria: { type: 'string' },
              confianca: { type: 'number' },
              cliente_nome: { type: ['string', 'null'] },
              numero_processo: { type: ['string', 'null'] },
              prazo_data: { type: ['string', 'null'] },
              resumo: { type: 'string' },
            },
            required: ['categoria', 'confianca', 'resumo'],
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'registrar_triagem' } },
    temperature: 0.1,
    max_tokens: 256,
  });

  const usage = response.usage;
  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  const resultado = toolCall ? JSON.parse(toolCall.function.arguments) : null;

  console.log('✅ Resultado da classificação:');
  console.log(JSON.stringify(resultado, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 Uso de tokens:');
  console.log(`   Tokens de entrada  (prompt):     ${usage.prompt_tokens}`);
  console.log(`   Tokens de saída    (completion):  ${usage.completion_tokens}`);
  console.log(`   Total:                            ${usage.total_tokens}`);
  console.log('='.repeat(60));

  // Estimativa de custo para gpt-4o-mini (preços aproximados em USD → BRL)
  const USD_TO_BRL = 5.20; // cotação aproximada
  const inputCostUSD = (usage.prompt_tokens / 1_000_000) * 0.15;
  const outputCostUSD = (usage.completion_tokens / 1_000_000) * 0.60;
  const totalCostUSD = inputCostUSD + outputCostUSD;

  const inputCost = inputCostUSD * USD_TO_BRL;
  const outputCost = outputCostUSD * USD_TO_BRL;
  const totalCost = totalCostUSD * USD_TO_BRL;

  const brl = (v, dec = 6) => `R$ ${v.toFixed(dec).replace('.', ',')}`;

  console.log(`\n💰 Estimativa de custo (gpt-4o-mini | cotação: R$ ${USD_TO_BRL.toFixed(2)}/USD):`);
  console.log(`   Entrada:  ${brl(inputCost)}`);
  console.log(`   Saída:    ${brl(outputCost)}`);
  console.log(`   Total:    ${brl(totalCost)}`);

  const totalItems = Number(process.env.TOKEN_TEST_TOTAL_ITENS) || 500;
  const estimatedTotal = totalCost * totalItems;
  console.log(`\n📈 Projeção para os ${totalItems} itens do JSON:`);
  console.log(`   ~${(usage.total_tokens * totalItems).toLocaleString()} tokens`);
  console.log(`   ~${brl(estimatedTotal, 4)}`);
  console.log('='.repeat(60));
})();
