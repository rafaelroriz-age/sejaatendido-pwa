export const LEGAL_TERMS_VERSION = 'v1';
export const LEGAL_PRIVACY_VERSION = 'v1';

// Data de vigencia definida como a data do soft release (2026-07-24).
// Atualizar se a data real de ativacao dos termos for diferente.
export const LEGAL_EFFECTIVE_DATE = '24/07/2026';

export const LEGAL_CONTROLLER = {
  // Razao social confirmada via Cartao CNPJ (raiz 65.773.915) em 2026-07-24.
  razaoSocial: 'RAFAEL MENEZES BENTO RORIZ',
  cnpj: '65.773.915/0001-85',
  endereco: 'Avenida Doutor Jose Hermano, no 303, Jardim Vitoria, CEP 74865-090, Goiania/GO',
  contatoPrivacidade: 'contato@sejaatendido.api.br',
  // Provisorio: mesmo canal do controlador, ate indicacao formal de um encarregado dedicado.
  dpo: 'contato@sejaatendido.api.br (mesmo canal do controlador, ate indicacao formal de responsavel)',
  // Provisorio: comarca da sede da empresa (mesma cidade do endereco acima).
  foro: 'Goiania/GO',
  canalTitular: 'contato@sejaatendido.api.br',
  prazoResposta: '48 horas',
};
