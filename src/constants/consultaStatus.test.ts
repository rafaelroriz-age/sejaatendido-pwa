import { describe, expect, it } from 'vitest';
import {
  CONSULTA_STATUS,
  isConsultaAceita,
  isConsultaCancelada,
  isConsultaConcluida,
  isConsultaEncerrada,
  isConsultaPendente,
  isConsultaRecusada,
  podeEntrarNaConsulta,
} from './consultaStatus';

describe('consultaStatus helpers', () => {
  it('reconhece cada status oficial do backend, case-insensitive', () => {
    expect(isConsultaPendente('pendente')).toBe(true);
    expect(isConsultaAceita('ACEITA')).toBe(true);
    expect(isConsultaConcluida(' Concluida ')).toBe(true);
    expect(isConsultaCancelada(CONSULTA_STATUS.CANCELADA)).toBe(true);
    expect(isConsultaRecusada('recusada')).toBe(true);
  });

  it('não confunde status parecidos', () => {
    expect(isConsultaAceita('PENDENTE')).toBe(false);
    expect(isConsultaConcluida('ACEITA')).toBe(false);
  });

  it('isConsultaEncerrada cobre apenas os estados terminais', () => {
    expect(isConsultaEncerrada('CONCLUIDA')).toBe(true);
    expect(isConsultaEncerrada('CANCELADA')).toBe(true);
    expect(isConsultaEncerrada('RECUSADA')).toBe(true);
    expect(isConsultaEncerrada('PENDENTE')).toBe(false);
    expect(isConsultaEncerrada('ACEITA')).toBe(false);
  });

  describe('podeEntrarNaConsulta', () => {
    it('permite entrar quando status é ACEITA e o meetLink já foi gerado', () => {
      expect(podeEntrarNaConsulta({ status: 'ACEITA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' })).toBe(true);
    });

    it('permite entrar quando status é CONCLUIDA e o meetLink existe', () => {
      expect(podeEntrarNaConsulta({ status: 'CONCLUIDA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' })).toBe(true);
    });

    it('bloqueia quando a consulta ainda está PENDENTE, mesmo que meetLink exista', () => {
      expect(podeEntrarNaConsulta({ status: 'PENDENTE', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' })).toBe(false);
    });

    it('bloqueia quando o meetLink ainda não foi gerado', () => {
      expect(podeEntrarNaConsulta({ status: 'ACEITA', meetLink: undefined })).toBe(false);
      expect(podeEntrarNaConsulta({ status: 'ACEITA', meetLink: '' })).toBe(false);
    });

    it('bloqueia para status cancelados/recusados', () => {
      expect(podeEntrarNaConsulta({ status: 'CANCELADA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' })).toBe(false);
      expect(podeEntrarNaConsulta({ status: 'RECUSADA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' })).toBe(false);
    });
  });
});
