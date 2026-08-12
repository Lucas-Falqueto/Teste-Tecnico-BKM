
// Testes de integração do classificador com a API OpenAI real
// Execute apenas com OPENAI_API_KEY configurado no .env
// Timeout alto pois são chamadas de rede reais

'use strict';

require('dotenv').config();

const { classify } = require('../llm/classifier');
const { FIXTURES } = require('./fixtures/messages');

// Pula se não há API key (ex.: CI sem segredos configurados)
const SKIP = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-...');

const descOrSkip = SKIP ? describe.skip : describe;

descOrSkip('Classificador LLM — integração', () => {
  // Timeout de 30s por teste (latência da API)
  jest.setTimeout(30_000);

  for (const { desc, expected, msg } of FIXTURES) {
    test(desc, async () => {
      const result = await classify(msg);

      expect(result).toHaveProperty('categoria');
      expect(result).toHaveProperty('confianca');
      expect(result).toHaveProperty('resumo');
      expect(result.confianca).toBeGreaterThanOrEqual(0);
      expect(result.confianca).toBeLessThanOrEqual(1);

      // Validação principal: categoria deve bater com o esperado
      expect(result.categoria).toBe(expected);
    });
  }
});

// ── Testes adversariais explícitos ────────────────────────────────────────────
descOrSkip('Testes adversariais', () => {
  jest.setTimeout(30_000);

  test('Mensagem com "cobrar" em contexto de agendamento → agendamento (não financeiro)', async () => {
    const msg = {
      id: 'adv-001',
      canal: 'whatsapp',
      remetente: 'Cliente',
      timestamp: new Date().toISOString(),
      texto: 'Vocês cobram para agendar uma reunião inicial de consulta? Quero marcar para semana que vem.',
    };
    const result = await classify(msg);
    expect(result.categoria).toBe('agendamento');
    expect(result.categoria).not.toBe('financeiro');
  });

  test('Mensagem com "documento" mas pedindo informação sobre ele → duvida_processo (não documento_recebido)', async () => {
    const msg = {
      id: 'adv-002',
      canal: 'email',
      remetente: 'Cliente',
      timestamp: new Date().toISOString(),
      texto: 'Preciso que vocês me expliquem qual documento preciso enviar para dar continuidade ao processo.',
    };
    const result = await classify(msg);
    expect(result.categoria).toBe('duvida_processo');
    expect(result.categoria).not.toBe('documento_recebido');
  });

  test('Prazo explícito em mensagem de dúvida → urgente_prazo tem precedência', async () => {
    const msg = {
      id: 'adv-003',
      canal: 'whatsapp',
      remetente: 'Cliente',
      timestamp: '2026-08-11T10:00:00Z',
      texto: 'Gostaria de saber o status do processo, mas o prazo para recurso é amanhã 12/08/2026. É urgente!',
    };
    const result = await classify(msg);
    expect(result.categoria).toBe('urgente_prazo');
  });
});
