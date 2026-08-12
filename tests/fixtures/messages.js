
// 20 mensagens de teste cobrindo as 7 categorias + casos adversariais

'use strict';

/** @type {Array<{ msg: import('../../models/message').RawMessage, expected: string, desc: string }>} */
const FIXTURES = [
  // ── financeiro (3) ────────────────────────────────────────────────────
  {
    desc: 'financeiro — boleto de honorários',
    expected: 'financeiro',
    msg: {
      id: 'fix-001', canal: 'email', remetente: 'Maria Souza',
      timestamp: '2026-08-11T10:00:00Z',
      texto: 'Olá, gostaria de saber se meu boleto dos honorários de julho já foi emitido. Pode me enviar por favor?',
    },
  },
  {
    desc: 'financeiro — depósito confirmado',
    expected: 'financeiro',
    msg: {
      id: 'fix-002', canal: 'whatsapp', remetente: '11987654321',
      timestamp: '2026-08-11T11:00:00Z',
      texto: 'Boa tarde! Realizei o depósito do valor acordado na conta do escritório. Segue comprovante.',
    },
  },
  {
    desc: 'financeiro — cobrança de nota fiscal',
    expected: 'financeiro',
    msg: {
      id: 'fix-003', canal: 'email', remetente: 'Carlos Lima',
      timestamp: '2026-08-11T14:00:00Z',
      texto: 'Preciso da nota fiscal referente aos serviços prestados em julho para dar entrada no reembolso da empresa.',
    },
  },

  // ── documento_recebido (3) ─────────────────────────────────────────────
  {
    desc: 'documento_recebido — procuração e certidão',
    expected: 'documento_recebido',
    msg: {
      id: 'fix-004', canal: 'email', remetente: 'Ana Paula',
      timestamp: '2026-08-11T09:00:00Z',
      texto: 'Segue em anexo a procuração assinada e a certidão de nascimento que vocês solicitaram.',
    },
  },
  {
    desc: 'documento_recebido — contrato assinado',
    expected: 'documento_recebido',
    msg: {
      id: 'fix-005', canal: 'email', remetente: 'Pedro Rocha',
      timestamp: '2026-08-11T15:00:00Z',
      texto: 'Conforme combinado, segue o contrato de prestação de serviços devidamente assinado por ambas as partes.',
    },
  },
  {
    desc: 'documento_recebido — laudo médico',
    expected: 'documento_recebido',
    msg: {
      id: 'fix-006', canal: 'whatsapp', remetente: 'Fernanda Costa',
      timestamp: '2026-08-11T16:00:00Z',
      texto: 'Dra., consegui o laudo médico que o senhor havia solicitado. Estou enviando agora pelo WhatsApp.',
    },
  },

  // ── urgente_prazo (3) ──────────────────────────────────────────────────
  {
    desc: 'urgente_prazo — recurso em 2 dias',
    expected: 'urgente_prazo',
    msg: {
      id: 'fix-007', canal: 'whatsapp', remetente: 'João Silva',
      timestamp: '2026-08-11T08:00:00Z',
      texto: 'Dr., a sentença saiu hoje. O prazo para recurso encerra em 13/08/2026 e preciso que o senhor tome as providências urgentemente.',
    },
  },
  {
    desc: 'urgente_prazo — audiência amanhã',
    expected: 'urgente_prazo',
    msg: {
      id: 'fix-008', canal: 'email', remetente: 'Beatriz Mendes',
      timestamp: '2026-08-11T17:00:00Z',
      texto: 'Lembrei agora que a audiência é amanhã às 9h (12/08/2026) e ainda não recebi confirmação do advogado.',
    },
  },
  {
    desc: 'urgente_prazo — prazo em 3 dias',
    expected: 'urgente_prazo',
    msg: {
      id: 'fix-009', canal: 'teste', remetente: 'Roberto Alves',
      timestamp: '2026-08-11T10:00:00Z',
      texto: 'Doutor, o prazo para contestação do processo 0007654-12.2024.5.03.0012 vence em 14/08/2026. Precisamos agir.',
    },
  },

  // ── duvida_processo (3) ────────────────────────────────────────────────
  {
    desc: 'duvida_processo — andamento do processo',
    expected: 'duvida_processo',
    msg: {
      id: 'fix-010', canal: 'whatsapp', remetente: 'Claudia Nunes',
      timestamp: '2026-08-11T11:30:00Z',
      texto: 'Boa tarde, queria saber em que fase está o processo 0010702-33.2024.5.03.0069.',
    },
  },
  {
    desc: 'duvida_processo — decisão judicial',
    expected: 'duvida_processo',
    msg: {
      id: 'fix-011', canal: 'email', remetente: 'Luís Ferreira',
      timestamp: '2026-08-11T13:00:00Z',
      texto: 'Gostaria de entender melhor a decisão do juiz que saiu na semana passada no meu processo. Ela foi favorável?',
    },
  },
  {
    desc: 'duvida_processo — pergunta sobre custas processuais',
    expected: 'duvida_processo',
    msg: {
      id: 'fix-012', canal: 'whatsapp', remetente: 'Mariana Santos',
      timestamp: '2026-08-11T14:30:00Z',
      texto: 'Olá, queria saber se tenho que pagar as custas do processo ou se isso fica por conta da outra parte.',
    },
  },

  // ── agendamento (2) ────────────────────────────────────────────────────
  {
    desc: 'agendamento — solicita reunião',
    expected: 'agendamento',
    msg: {
      id: 'fix-013', canal: 'whatsapp', remetente: 'Thiago Braga',
      timestamp: '2026-08-11T10:00:00Z',
      texto: 'Poderia marcar uma reunião para discutir o andamento do meu caso na próxima sexta às 14h?',
    },
  },
  {
    desc: 'agendamento — cancelamento de consulta',
    expected: 'agendamento',
    msg: {
      id: 'fix-014', canal: 'email', remetente: 'Letícia Pires',
      timestamp: '2026-08-11T09:30:00Z',
      texto: 'Infelizmente precisarei cancelar minha consulta de amanhã às 10h. Podemos remarcar para a semana que vem?',
    },
  },

  // ── spam (3) ──────────────────────────────────────────────────────────
  {
    desc: 'spam — oferta de software',
    expected: 'spam_irrelevante',
    msg: {
      id: 'fix-015', canal: 'email', remetente: 'promo@juridicosoftware.com',
      timestamp: '2026-08-11T08:00:00Z',
      texto: 'OFERTA IMPERDÍVEL! Software jurídico completo com 50% de desconto esta semana. Acesse agora!',
    },
  },
  {
    desc: 'spam — publicidade de evento',
    expected: 'spam_irrelevante',
    msg: {
      id: 'fix-016', canal: 'email', remetente: 'eventos@oab.org.br',
      timestamp: '2026-08-11T07:00:00Z',
      texto: 'Inscreva-se no nosso webinar gratuito: "Como aumentar sua carteira de clientes em 2026". Vagas limitadas!',
    },
  },
  {
    desc: 'spam — seguros',
    expected: 'spam_irrelevante',
    msg: {
      id: 'fix-017', canal: 'email', remetente: 'contato@segurosvip.com',
      timestamp: '2026-08-11T06:00:00Z',
      texto: 'Seu escritório merece proteção! Planos de seguro empresarial com as melhores coberturas do mercado. Solicite uma proposta.',
    },
  },

  // ── irrelevante (2) ───────────────────────────────────────────────────
  {
    desc: 'irrelevante — mensagem sem sentido',
    expected: 'spam_irrelevante',
    msg: {
      id: 'fix-018', canal: 'whatsapp', remetente: '11900000000',
      timestamp: '2026-08-11T07:00:00Z',
      texto: 'kkkkk bom dia',
    },
  },
  {
    desc: 'irrelevante — número errado',
    expected: 'spam_irrelevante',
    msg: {
      id: 'fix-019', canal: 'whatsapp', remetente: '11988887777',
      timestamp: '2026-08-11T08:00:00Z',
      texto: 'Oi, você viu o jogo ontem? Que resultado hein!',
    },
  },

  // ── adversariais (keyword enganosa) ──────────────────────────────────
  {
    desc: 'ADVERSARIAL — "cobrar" numa mensagem de agendamento',
    expected: 'agendamento',
    msg: {
      id: 'fix-020', canal: 'whatsapp', remetente: 'Sofia Ramos',
      timestamp: '2026-08-11T10:00:00Z',
      texto: 'Vocês cobram para agendar uma reunião inicial de consulta? Gostaria de marcar para a semana que vem.',
    },
  },
];

module.exports = { FIXTURES };
