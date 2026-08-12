

'use strict';

/**
 * Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 * Exemplo: 0010702-33.2024.5.03.0069
 */
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

/**
 * Data no formato YYYY-MM-DD
 */
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Valida o número do processo no padrão CNJ.
 * @param {string|null} numero
 * @returns {{ valid: boolean, error?: string }}
 */
function validateNumeroProcesso(numero) {
  if (numero === null || numero === undefined) return { valid: true };
  const clean = numero.trim();
  if (!CNJ_REGEX.test(clean)) {
    return {
      valid: false,
      error: `Número de processo fora do padrão CNJ: "${clean}"`,
    };
  }
  return { valid: true };
}

/**
 * Valida e normaliza a data do prazo.
 * @param {string|null} data
 * @returns {{ valid: boolean, normalized?: string, error?: string }}
 */
function validatePrazoData(data) {
  if (data === null || data === undefined) return { valid: true };
  const clean = data.trim();

  // Tenta converter formatos comuns para YYYY-MM-DD
  const normalized = normalizeDate(clean);
  if (!normalized) {
    return {
      valid: false,
      error: `Data de prazo em formato inválido: "${clean}"`,
    };
  }

  return { valid: true, normalized };
}

/**
 * Tenta converter uma string de data para YYYY-MM-DD.
 * Suporta: YYYY-MM-DD (padrão), DD/MM/YYYY, DD-MM-YYYY.
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeDate(raw) {
  if (DATE_REGEX.test(raw)) return raw;

  // DD/MM/YYYY
  const dmySlash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmySlash) return `${dmySlash[3]}-${dmySlash[2]}-${dmySlash[1]}`;

  // DD-MM-YYYY
  const dmyDash = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyDash) return `${dmyDash[3]}-${dmyDash[2]}-${dmyDash[1]}`;

  return null;
}

/**
 * Executa todas as validações em um resultado classificado.
 * Retorna { ok: true } ou { ok: false, errors: string[] }.
 *
 * @param {{ numero_processo: string|null, prazo_data: string|null }} classified
 * @returns {{ ok: boolean, errors: string[], normalized: { prazo_data?: string } }}
 */
function validateExtracted(classified) {
  const errors = [];
  const normalized = {};

  const procResult = validateNumeroProcesso(classified.numero_processo);
  if (!procResult.valid) errors.push(procResult.error);

  const prazoResult = validatePrazoData(classified.prazo_data);
  if (!prazoResult.valid) {
    errors.push(prazoResult.error);
  } else if (prazoResult.normalized) {
    normalized.prazo_data = prazoResult.normalized;
  }

  return { ok: errors.length === 0, errors, normalized };
}

module.exports = { validateExtracted, validateNumeroProcesso, validatePrazoData, normalizeDate };
