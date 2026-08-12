
// Testes unitários dos validadores pós-LLM (sem precisar de API key)

'use strict';

const {
  validateNumeroProcesso,
  validatePrazoData,
  validateExtracted,
  normalizeDate,
} = require('../validation/validators');

describe('validateNumeroProcesso', () => {
  test('aceita número CNJ válido', () => {
    expect(validateNumeroProcesso('0010702-33.2024.5.03.0069').valid).toBe(true);
  });

  test('aceita null (campo opcional)', () => {
    expect(validateNumeroProcesso(null).valid).toBe(true);
  });

  test('rejeita número sem hífen', () => {
    expect(validateNumeroProcesso('001070233.2024.5.03.0069').valid).toBe(false);
  });

  test('rejeita número com caracteres extras', () => {
    expect(validateNumeroProcesso('0010702-33.2024.5.03.0069-extra').valid).toBe(false);
  });

  test('rejeita string vazia', () => {
    expect(validateNumeroProcesso('').valid).toBe(false);
  });
});

describe('normalizeDate', () => {
  test('aceita YYYY-MM-DD sem alteração', () => {
    expect(normalizeDate('2026-08-13')).toBe('2026-08-13');
  });

  test('normaliza DD/MM/YYYY', () => {
    expect(normalizeDate('13/08/2026')).toBe('2026-08-13');
  });

  test('normaliza DD-MM-YYYY', () => {
    expect(normalizeDate('13-08-2026')).toBe('2026-08-13');
  });

  test('retorna null para formato inválido', () => {
    expect(normalizeDate('agosto 2026')).toBeNull();
  });
});

describe('validatePrazoData', () => {
  test('aceita null (campo opcional)', () => {
    expect(validatePrazoData(null).valid).toBe(true);
  });

  test('normaliza DD/MM/YYYY', () => {
    const result = validatePrazoData('13/08/2026');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('2026-08-13');
  });

  test('rejeita formato inválido', () => {
    expect(validatePrazoData('próxima semana').valid).toBe(false);
  });
});

describe('validateExtracted', () => {
  test('ok quando todos os campos são null', () => {
    const result = validateExtracted({ numero_processo: null, prazo_data: null });
    expect(result.ok).toBe(true);
  });

  test('ok com campos válidos', () => {
    const result = validateExtracted({
      numero_processo: '0010702-33.2024.5.03.0069',
      prazo_data: '2026-08-13',
    });
    expect(result.ok).toBe(true);
  });

  test('erro se número CNJ inválido', () => {
    const result = validateExtracted({
      numero_processo: 'INVALIDO',
      prazo_data: null,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('aplica normalização de data', () => {
    const result = validateExtracted({
      numero_processo: null,
      prazo_data: '13/08/2026',
    });
    expect(result.ok).toBe(true);
    expect(result.normalized.prazo_data).toBe('2026-08-13');
  });
});
