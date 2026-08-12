

/**
 * @typedef {Object} RawMessage
 * @property {string} id          - UUID gerado pelo canal
 * @property {string} canal       - 'whatsapp' | 'email' | 'teste'
 * @property {string} remetente   - Nome ou número do remetente
 * @property {string} timestamp   - ISO 8601
 * @property {string} texto       - Conteúdo bruto da mensagem
 */

/**
 * @typedef {Object} ClassifiedMessage
 * @property {string}      id
 * @property {string}      canal
 * @property {string}      remetente
 * @property {string}      recebido_em
 * @property {string}      texto_bruto
 * @property {string}      categoria
 * @property {number}      confianca
 * @property {string|null} cliente_nome
 * @property {string|null} numero_processo
 * @property {string|null} prazo_data
 * @property {string}      resumo
 * @property {string}      status_revisao  - 'novo' | 'revisado' | 'erro_extracao'
 */

/** Categorias válidas */
const CATEGORIAS = [
  'urgente_prazo',
  'duvida_processo',
  'agendamento',
  'financeiro',
  'documento_recebido',
  'spam_irrelevante',
];

module.exports = { CATEGORIAS };
