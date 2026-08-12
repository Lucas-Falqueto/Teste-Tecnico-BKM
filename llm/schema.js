

'use strict';

const { z } = require('zod');
const { CATEGORIAS } = require('../models/message');

const TriagemSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  confianca: z.number().min(0).max(1),
  cliente_nome: z.string().nullable().optional().default(null),
  numero_processo: z.string().nullable().optional().default(null),
  prazo_data: z.string().nullable().optional().default(null),
  resumo: z.string().min(1),
});

/** Tool definition enviada ao OpenAI */
const TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'registrar_triagem',
    description:
      'Classifica e extrai dados estruturados de uma mensagem de escritório de advocacia',
    parameters: {
      type: 'object',
      properties: {
        categoria: {
          type: 'string',
          enum: CATEGORIAS,
          description:
            'Categoria semântica da mensagem. Decidida por compreensão do texto — nunca por palavras-chave isoladas.',
        },
        confianca: {
          type: 'number',
          description: 'Confiança na classificação entre 0 e 1.',
        },
        cliente_nome: {
          type: ['string', 'null'],
          description: 'Nome do cliente mencionado, ou null.',
        },
        numero_processo: {
          type: ['string', 'null'],
          description: 'Número do processo judicial (padrão CNJ), ou null.',
        },
        prazo_data: {
          type: ['string', 'null'],
          description: 'Data do prazo no formato YYYY-MM-DD, ou null.',
        },
        resumo: {
          type: 'string',
          description: 'Resumo objetivo da mensagem em 1-2 frases.',
        },
      },
      required: ['categoria', 'confianca', 'resumo'],
      additionalProperties: false,
    },
  },
};

module.exports = { TriagemSchema, TOOL_DEFINITION };
