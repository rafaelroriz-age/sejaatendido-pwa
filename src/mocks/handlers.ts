import { http, HttpResponse } from 'msw';
import { API_URL } from '../config/api';

const BASE = API_URL;

// ─── Dados fake reutilizáveis ────────────────────────────────────────────────

const MOCK_TOKEN = 'mock-jwt-token';
const MOCK_REFRESH = 'mock-refresh-token';

const MOCK_PACIENTE = {
  id: 'paciente-001',
  nome: 'João Silva (Mock)',
  email: 'joao@mock.com',
  telefone: '+5511988888888',
  tipo: 'PACIENTE' as const,
};

const MOCK_MEDICO_USER = {
  id: 'medico-001',
  nome: 'Dra. Maria Santos (Mock)',
  email: 'maria@mock.com',
  telefone: '+5511999999999',
  tipo: 'MEDICO' as const,
  cpf: undefined as string | undefined,
  crmNumero: '12345',
  crmUf: 'SP',
  crmCartaoValidado: false,
};

const MOCK_ADMIN_USER = {
  id: 'admin-001',
  nome: 'Admin Mock',
  email: 'admin@mock.com',
  tipo: 'ADMIN' as const,
};

let MOCK_CURRENT_USER: typeof MOCK_PACIENTE | typeof MOCK_MEDICO_USER | typeof MOCK_ADMIN_USER = MOCK_PACIENTE;

const LOW_COST_MEDICO_ID = 'med-002';
const LOW_COST_CONSULTA_VALOR_CENTAVOS = 10; // R$ 0,10

const MOCK_MEDICOS = [
  {
    id: 'med-001',
    crm: 'CRM/SP 12345',
    especialidades: ['Clínico Geral'],
    aprovado: true,
    usuario: { id: 'usr-001', nome: 'Dr. Carlos Oliveira', email: 'carlos@mock.com', telefone: '+5511999991111' },
  },
  {
    id: 'med-002',
    crm: 'CRM/RJ 54321',
    especialidades: ['Cardiologia'],
    valorConsulta: LOW_COST_CONSULTA_VALOR_CENTAVOS,
    aprovado: true,
    usuario: { id: 'usr-002', nome: 'Dra. Ana Costa', email: 'ana@mock.com', telefone: '+5511999992222' },
  },
  {
    id: 'med-003',
    crm: 'CRM/MG 99999',
    especialidades: ['Dermatologia'],
    aprovado: true,
    usuario: { id: 'usr-003', nome: 'Dr. Pedro Lima', email: 'pedro@mock.com', telefone: '+5511999993333' },
  },
];

const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
})();

// ISO slots for /medicos/:id/slots endpoint (new format)
function buildIsoSlots(dateStr: string): string[] {
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  return times.map(t => {
    const d = new Date(dateStr);
    const [h, m] = t.split(':');
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString();
  });
}

const MOCK_DISPONIBILIDADE_MEDICO = [
  { id: 'disp-001', diaSemana: 1, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: true },
  { id: 'disp-002', diaSemana: 2, horaInicio: '09:00', horaFim: '17:00', duracaoSlot: 60, ativo: true },
  { id: 'disp-003', diaSemana: 3, horaInicio: '08:00', horaFim: '17:00', duracaoSlot: 60, ativo: true },
  { id: 'disp-004', diaSemana: 4, horaInicio: '08:00', horaFim: '17:00', duracaoSlot: 60, ativo: true },
  { id: 'disp-005', diaSemana: 5, horaInicio: '08:00', horaFim: '12:00', duracaoSlot: 60, ativo: true },
];

const MOCK_HORARIOS_BLOQUEADOS: Array<{ id: string; dataHora: string; duracao: number; motivo: string }> = [];

const MOCK_CONSULTAS_PACIENTE = [
  {
    id: 'consulta-001',
    medicoId: LOW_COST_MEDICO_ID,
    pacienteId: 'paciente-001',
    dataHora: tomorrow,
    sintomas: 'Consulta de rotina',
    status: 'PENDENTE',
    valor: LOW_COST_CONSULTA_VALOR_CENTAVOS,
    meetLink: null,
    medico: MOCK_MEDICOS[1],
  },
];

const MOCK_CONSULTAS_MEDICO = [
  {
    id: 'consulta-002',
    medicoId: LOW_COST_MEDICO_ID,
    pacienteId: 'paciente-001',
    dataHora: tomorrow,
    sintomas: 'Dor de cabeça frequente',
    status: 'CONFIRMADA',
    valor: LOW_COST_CONSULTA_VALOR_CENTAVOS,
    meetLink: 'https://meet.google.com/mock-link',
    paciente: { usuario: { nome: 'Maria Teste', email: 'maria.teste@mock.com', telefone: '+5511988880000' } },
  },
];

const MOCK_SALDO = {
  saldoALiberarCentavos: LOW_COST_CONSULTA_VALOR_CENTAVOS,
  saldoPendenteCentavos: LOW_COST_CONSULTA_VALOR_CENTAVOS,
  ganhosHojeCentavos: LOW_COST_CONSULTA_VALOR_CENTAVOS,
  proximoRepasse: '2026-05-15',
  ganhosSemana: [0, 0, LOW_COST_CONSULTA_VALOR_CENTAVOS, 0, 0, 0, 0],
};

const MOCK_REPASSES = {
  repasses: [
    {
      id: 'repasse-001',
      valorRepasse: LOW_COST_CONSULTA_VALOR_CENTAVOS,
      status: 'PENDENTE',
      dataRepasse: null,
      criadoEm: new Date().toISOString(),
      cicloRepasse: {
        semanaInicio: '2026-05-04T00:00:00.000Z',
        semanaFim: '2026-05-10T23:59:59.000Z',
      },
      consulta: {
        id: 'consulta-002',
        data: tomorrow,
        paciente: { usuario: { nome: 'Maria Teste', email: 'maria.teste@mock.com', telefone: '+5511988880000' } },
      },
    },
  ],
};

const MOCK_REPASSE_DETAIL = {
  id: 'ciclo-001',
  semanaInicio: '2026-05-04T00:00:00.000Z',
  semanaFim: '2026-05-10T23:59:59.000Z',
  status: 'PENDENTE',
  repasses: [
    {
      id: 'repasse-001',
      valorRepasse: LOW_COST_CONSULTA_VALOR_CENTAVOS,
      status: 'PENDENTE',
      consulta: {
        id: 'consulta-002',
        data: tomorrow,
        paciente: { usuario: { nome: 'Maria Teste', email: 'maria.teste@mock.com', telefone: '+5511988880000' } },
      },
    },
  ],
};

function getConsultaValorCentavos(consultaId: unknown): number {
  if (typeof consultaId !== 'string') return 15000;
  const allConsultas = [...MOCK_CONSULTAS_PACIENTE, ...MOCK_CONSULTAS_MEDICO];
  const found = allConsultas.find(c => c.id === consultaId);
  return found?.valor ?? 15000;
}

let MOCK_DADOS_BANCARIOS_MEDICO = {
  tipoChavePix: 'CPF',
  valorChavePix: '000.000.000-00',
  banco: 'Nubank',
  agencia: '0001',
  conta: '12345-6',
};

let MOCK_DADOS_BANCARIOS_PACIENTE = {
  tipoChavePix: 'EMAIL',
  valorChavePix: 'paciente@mock.com',
  banco: 'Banco do Brasil',
  agencia: '1234',
  conta: '99887-6',
};

const MOCK_MEDICOS_PENDENTES = [
  {
    id: 'med-pending-001',
    crm: 'CRM/SP 88888',
    especialidades: ['Pediatria'],
    aprovado: false,
    usuario: { id: 'usr-pending', nome: 'Dr. Lucas Fernandes', email: 'lucas@mock.com', telefone: '+5511999994444' },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authResponse(user: typeof MOCK_PACIENTE | typeof MOCK_MEDICO_USER | typeof MOCK_ADMIN_USER) {
  MOCK_CURRENT_USER = user;
  return HttpResponse.json({
    accessToken: MOCK_TOKEN,
    refreshToken: MOCK_REFRESH,
    usuario: user,
  });
}

function buildRegisteredUser(body: {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  tipo?: 'PACIENTE' | 'MEDICO';
  crmNumero?: string;
  crmUf?: string;
  crmCartaoPdfNome?: string;
  crmCartaoPdfBase64?: string;
}): typeof MOCK_PACIENTE | typeof MOCK_MEDICO_USER {
  if (body.tipo === 'MEDICO') {
    const crmCartaoValidado = Boolean(body.crmCartaoPdfNome && body.crmCartaoPdfBase64);
    return {
      id: `medico-${Date.now()}`,
      nome: body.nome ?? 'Médico Mock',
      email: body.email ?? 'medico@mock.com',
      telefone: body.telefone ? `+55${body.telefone}` : '+5511999999999',
      tipo: 'MEDICO' as const,
      cpf: body.cpf,
      crmNumero: body.crmNumero ?? '12345',
      crmUf: body.crmUf ?? 'SP',
      crmCartaoValidado,
    };
  }

  return {
    id: `paciente-${Date.now()}`,
    nome: body.nome ?? MOCK_PACIENTE.nome,
    email: body.email ?? MOCK_PACIENTE.email,
    telefone: body.telefone ? `+55${body.telefone}` : MOCK_PACIENTE.telefone,
    tipo: 'PACIENTE' as const,
  };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // ── AUTH ──────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; cpf?: string };
    const email = body?.email ?? '';
    const cpf = body?.cpf ?? '';
    // Roteamento por email para testar diferentes papéis
    if (cpf.replace(/\D/g, '').length === 11) return authResponse(MOCK_MEDICO_USER);
    if (email.includes('admin')) return authResponse(MOCK_ADMIN_USER);
    if (email.includes('medico') || email.includes('doctor') || email.includes('med')) return authResponse(MOCK_MEDICO_USER);
    return authResponse(MOCK_PACIENTE);
  }),

  http.post(`${BASE}/auth/google`, () => authResponse(MOCK_PACIENTE)),
  http.post(`${BASE}/auth/login-google`, () => authResponse(MOCK_PACIENTE)),

  http.post(`${BASE}/auth/registro`, async ({ request }) => {
    const body = await request.json() as {
      nome?: string;
      email?: string;
      cpf?: string;
      telefone?: string;
      tipo?: 'PACIENTE' | 'MEDICO';
      crmNumero?: string;
      crmUf?: string;
      crmCartaoPdfNome?: string;
      crmCartaoPdfBase64?: string;
    };
    await new Promise(r => setTimeout(r, 800)); // simula latência
    const usuario = buildRegisteredUser(body);
    MOCK_CURRENT_USER = usuario;
    return HttpResponse.json({
      id: 'novo-usuario-mock',
      accessToken: MOCK_TOKEN,
      refreshToken: MOCK_REFRESH,
      usuario,
      mensagem: 'Cadastro realizado. Verifique seu email.',
    }, { status: 201 });
  }),

  http.post(`${BASE}/auth/medicos/login`, async ({ request }) => {
    const body = await request.json() as { cpf?: string };
    if (!body?.cpf) return HttpResponse.json({ erro: 'CPF obrigatorio' }, { status: 400 });
    return authResponse(MOCK_MEDICO_USER);
  }),

  http.post(`${BASE}/auth/apple`, async ({ request }) => {
    const body = await request.json() as { identityToken?: string };
    if (!body?.identityToken) return HttpResponse.json({ erro: 'identityToken obrigatório' }, { status: 400 });
    return authResponse(MOCK_PACIENTE);
  }),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({ ok: true })),

  http.post(`${BASE}/auth/refresh-token`, () =>
    HttpResponse.json({ accessToken: MOCK_TOKEN, refreshToken: MOCK_REFRESH }),
  ),
  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({ accessToken: MOCK_TOKEN, refreshToken: MOCK_REFRESH }),
  ),

  // ── EMAILS ────────────────────────────────────────────────────────────────

  http.post(`${BASE}/emails/confirmar-email`, () =>
    HttpResponse.json({ message: 'Email confirmado com sucesso!' }),
  ),

  http.post(`${BASE}/emails/recuperar-senha`, () =>
    HttpResponse.json({ message: 'Email de recuperação enviado.' }),
  ),

  http.post(`${BASE}/emails/resetar-senha`, () =>
    HttpResponse.json({ message: 'Senha redefinida com sucesso.' }),
  ),

  http.post(`${BASE}/emails/reenviar-confirmacao`, () =>
    HttpResponse.json({ message: 'Email reenviado.' }),
  ),

  // Alias usado por resendConfirmEmailRequest() em services/api.ts
  http.post(`${BASE}/emails/confirmar-email/enviar`, () =>
    HttpResponse.json({ message: 'Email reenviado.' }),
  ),

  // ── MÉDICOS ───────────────────────────────────────────────────────────────

  http.get(`${BASE}/medicos`, () => HttpResponse.json({ medicos: MOCK_MEDICOS, total: MOCK_MEDICOS.length, page: 1 })),

  http.get(`${BASE}/medicos/:id`, ({ params }) => {
    const found = MOCK_MEDICOS.find(m => m.id === params.id);
    return found
      ? HttpResponse.json({ medico: found })
      : HttpResponse.json({ erro: 'Médico não encontrado' }, { status: 404 });
  }),

  // Doctor own profile
  http.get(`${BASE}/medicos/me`, () => HttpResponse.json({ medico: { ...MOCK_MEDICOS[0], bio: 'Médico de demonstração.', valorConsulta: 15000, especialidade: 'Clínico Geral' } })),
  http.put(`${BASE}/medicos/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ medico: { ...MOCK_MEDICOS[0], ...body } });
  }),

  // CRM
  http.get(`${BASE}/medicos/me/crm/status`, () => {
    const current = MOCK_CURRENT_USER as any;
    const validado = Boolean(current?.crmCartaoValidado);
    return HttpResponse.json({
      crmCartaoValidado: validado,
      status: validado ? 'APROVADO' : 'PENDENTE',
      crmNumero: current?.crmNumero ?? '12345',
      crmUf: current?.crmUf ?? 'SP',
    });
  }),
  http.post(`${BASE}/medicos/me/crm/validar-cartao`, () => {
    const current = MOCK_CURRENT_USER as any;
    if (current && current.tipo === 'MEDICO') {
      current.crmCartaoValidado = true;
    }
    return HttpResponse.json({
      crmCartaoValidado: true,
      status: 'APROVADO',
      crmNumero: current?.crmNumero ?? '12345',
      crmUf: current?.crmUf ?? 'SP',
    });
  }),

  // New slots endpoint — returns ISO timestamps
  http.get(`${BASE}/medicos/:id/slots`, ({ request }) => {
    const url = new URL(request.url);
    const data = url.searchParams.get('data') ?? new Date().toISOString().split('T')[0];
    return HttpResponse.json({
      slots: buildIsoSlots(data),
      duracaoSlotMinutos: 60,
    });
  }),

  // Doctor self — disponibilidade
  http.get(`${BASE}/medicos/me/disponibilidade`, () =>
    HttpResponse.json({ disponibilidades: MOCK_DISPONIBILIDADE_MEDICO }),
  ),

  http.put(`${BASE}/medicos/me/disponibilidade`, async ({ request }) => {
    const body = await request.json() as { disponibilidades?: typeof MOCK_DISPONIBILIDADE_MEDICO };
    const updated = (body.disponibilidades ?? []).map((d, i) => ({ ...d, id: d.id ?? `disp-new-${i}` }));
    MOCK_DISPONIBILIDADE_MEDICO.length = 0;
    updated.forEach(d => MOCK_DISPONIBILIDADE_MEDICO.push(d));
    return HttpResponse.json({ disponibilidades: MOCK_DISPONIBILIDADE_MEDICO });
  }),

  // Blocked slots
  http.post(`${BASE}/medicos/me/horario-bloqueado`, async ({ request }) => {
    const body = await request.json() as { dataHora: string; duracao?: number; motivo?: string };
    const novo = { id: `blk-${Date.now()}`, dataHora: body.dataHora, duracao: body.duracao ?? 60, motivo: body.motivo ?? '' };
    MOCK_HORARIOS_BLOQUEADOS.push(novo);
    return HttpResponse.json({ horarioBloqueado: novo }, { status: 201 });
  }),

  http.delete(`${BASE}/medicos/me/horario-bloqueado/:id`, ({ params }) => {
    const idx = MOCK_HORARIOS_BLOQUEADOS.findIndex(b => b.id === params.id);
    if (idx !== -1) MOCK_HORARIOS_BLOQUEADOS.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${BASE}/medicos/me/horarios-bloqueados`, () =>
    HttpResponse.json({ horariosBloqueados: MOCK_HORARIOS_BLOQUEADOS }),
  ),

  // Painel médico
  http.get(`${BASE}/medicos/me/consultas`, () => HttpResponse.json({ consultas: MOCK_CONSULTAS_MEDICO, total: MOCK_CONSULTAS_MEDICO.length })),
  http.patch(`${BASE}/medicos/me/consultas/:id`, async ({ request, params }) => {
    const body = await request.json() as { acao?: string };
    const statusMap: Record<string, string> = { ACEITAR: 'ACEITA', RECUSAR: 'RECUSADA' };
    const novoStatus = statusMap[body.acao ?? ''] ?? body.acao ?? 'PENDENTE';
    const consulta = MOCK_CONSULTAS_MEDICO.find(c => c.id === params.id);
    if (consulta) (consulta as any).status = novoStatus;
    return HttpResponse.json({ consulta: { ...consulta, status: novoStatus } });
  }),
  http.get(`${BASE}/medicos/me/saldo`, () => HttpResponse.json(MOCK_SALDO)),
  http.get(`${BASE}/medicos/me/repasses`, () => HttpResponse.json(MOCK_REPASSES)),
  http.get(`${BASE}/medicos/me/ciclos-repasse/:id`, () => HttpResponse.json(MOCK_REPASSE_DETAIL)),
  http.get(`${BASE}/medicos/me/dados-bancarios`, () => HttpResponse.json(MOCK_DADOS_BANCARIOS_MEDICO)),
  http.put(`${BASE}/medicos/me/dados-bancarios`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    MOCK_DADOS_BANCARIOS_MEDICO = {
      ...MOCK_DADOS_BANCARIOS_MEDICO,
      tipoChavePix: String(body.tipoChavePix ?? MOCK_DADOS_BANCARIOS_MEDICO.tipoChavePix),
      valorChavePix: String(body.valorChavePix ?? MOCK_DADOS_BANCARIOS_MEDICO.valorChavePix),
      banco: String(body.banco ?? MOCK_DADOS_BANCARIOS_MEDICO.banco),
      agencia: String(body.agencia ?? MOCK_DADOS_BANCARIOS_MEDICO.agencia),
      conta: String(body.conta ?? MOCK_DADOS_BANCARIOS_MEDICO.conta),
    };
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/pacientes/me/dados-bancarios`, () => HttpResponse.json(MOCK_DADOS_BANCARIOS_PACIENTE)),
  http.put(`${BASE}/pacientes/me/dados-bancarios`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    MOCK_DADOS_BANCARIOS_PACIENTE = {
      ...MOCK_DADOS_BANCARIOS_PACIENTE,
      tipoChavePix: String(body.tipoChavePix ?? MOCK_DADOS_BANCARIOS_PACIENTE.tipoChavePix),
      valorChavePix: String(body.valorChavePix ?? MOCK_DADOS_BANCARIOS_PACIENTE.valorChavePix),
      banco: String(body.banco ?? MOCK_DADOS_BANCARIOS_PACIENTE.banco),
      agencia: String(body.agencia ?? MOCK_DADOS_BANCARIOS_PACIENTE.agencia),
      conta: String(body.conta ?? MOCK_DADOS_BANCARIOS_PACIENTE.conta),
    };
    return HttpResponse.json({ ok: true });
  }),

  // ── CONSULTAS (PACIENTE) ──────────────────────────────────────────────────

  http.get(`${BASE}/pacientes/me/consultas`, () =>
    HttpResponse.json({ consultas: MOCK_CONSULTAS_PACIENTE, total: MOCK_CONSULTAS_PACIENTE.length }),
  ),

  http.get(`${BASE}/consultas`, () =>
    HttpResponse.json({ consultas: MOCK_CONSULTAS_PACIENTE, total: MOCK_CONSULTAS_PACIENTE.length }),
  ),

  http.post(`${BASE}/pacientes/consultas`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const medico = MOCK_MEDICOS.find(m => m.id === body.medicoId) ?? MOCK_MEDICOS[0];
    const nova = {
      id: `consulta-${Date.now()}`,
      medicoId: body.medicoId,
      pacienteId: 'paciente-001',
      dataHora: body.dataHora ?? body.data,
      sintomas: body.sintomas ?? body.motivo ?? 'Consulta geral',
      status: 'PENDENTE',
      valor: medico.valorConsulta ?? 15000,
      meetLink: null,
      medico,
    };
    MOCK_CONSULTAS_PACIENTE.push(nova as typeof MOCK_CONSULTAS_PACIENTE[0]);
    return HttpResponse.json({ consulta: nova }, { status: 201 });
  }),

  http.post(`${BASE}/consultas`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const medico = MOCK_MEDICOS.find(m => m.id === body.medicoId) ?? MOCK_MEDICOS[0];
    const nova = {
      id: `consulta-${Date.now()}`,
      medicoId: body.medicoId,
      pacienteId: 'paciente-001',
      dataHora: body.dataHora ?? body.data,
      sintomas: body.sintomas ?? body.motivo ?? 'Consulta geral',
      status: 'PENDENTE',
      valor: medico.valorConsulta ?? 15000,
      meetLink: null,
      medico,
    };
    MOCK_CONSULTAS_PACIENTE.push(nova as typeof MOCK_CONSULTAS_PACIENTE[0]);
    return HttpResponse.json({ consulta: nova }, { status: 201 });
  }),

  http.delete(`${BASE}/pacientes/me/consultas/:id`, ({ params }) => {
    const idx = MOCK_CONSULTAS_PACIENTE.findIndex(c => c.id === params.id);
    if (idx !== -1) MOCK_CONSULTAS_PACIENTE.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.delete(`${BASE}/consultas/:id`, ({ params }) => {
    const idx = MOCK_CONSULTAS_PACIENTE.findIndex(c => c.id === params.id);
    if (idx !== -1) MOCK_CONSULTAS_PACIENTE.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  // ── PAGAMENTOS ────────────────────────────────────────────────────────────

  http.post(`${BASE}/v1/pagamentos/pix`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const valor = getConsultaValorCentavos(body.consultaId);
    const pixCode = '00020126580014BR.GOV.BCB.PIX0136mock-pix-key-para-testes';
    const pagId = `pag-${Date.now()}`;
    return HttpResponse.json({
      pagamento: {
        id: pagId,
        consultaId: body.consultaId,
        valor,
        status: 'PENDENTE',
        metodo: 'PIX',
        criadoEm: new Date().toISOString(),
      },
      pix: {
        qrCode: pixCode,
        qrCodeBase64: '',  // mock: empty; real backend returns PNG base64
        ticketUrl: 'https://www.mercadopago.com.br/payments/mock/ticket',
        validade: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
  }),

  http.post(`${BASE}/v1/pagamentos/cartao`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const valor = getConsultaValorCentavos(body.consultaId);
    const pagId = `pag-mp-${Date.now()}`;
    return HttpResponse.json({
      pagamento: {
        id: pagId,
        consultaId: body.consultaId,
        valor,
        status: 'PENDENTE',
        metodo: 'CARTAO',
        criadoEm: new Date().toISOString(),
      },
      mercadopago: {
        publicKey: 'APP_USR-mock-public-key',
        preferenceId: 'mock-preference-id',
        initPoint: 'https://www.mercadopago.com.br/checkout/mock',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.br/checkout/mock',
      },
    });
  }),

  http.get(`${BASE}/v1/pagamentos/sync/:consultaId`, () =>
    HttpResponse.json({ status: 'PENDENTE', pagamento: { id: 'pag-001', status: 'PENDENTE' } }),
  ),

  // ── ADMIN ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/admin/medicos/pendentes`, () => HttpResponse.json(MOCK_MEDICOS_PENDENTES)),

  http.post(`${BASE}/admin/medicos/:id/aprovar`, ({ params }) => {
    const idx = MOCK_MEDICOS_PENDENTES.findIndex(m => m.id === params.id);
    if (idx !== -1) MOCK_MEDICOS_PENDENTES.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${BASE}/admin/medicos/:id/recusar`, ({ params }) => {
    const idx = MOCK_MEDICOS_PENDENTES.findIndex(m => m.id === params.id);
    if (idx !== -1) MOCK_MEDICOS_PENDENTES.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${BASE}/admin/dashboard`, () =>
    HttpResponse.json({
      totalUsuarios: 42,
      totalMedicos: 8,
      medicosAprovados: 6,
      medicosPendentes: 2,
      totalPacientes: 34,
      totalConsultas: 120,
      consultasPendentes: 15,
      consultasConcluidas: 95,
      receitaTotal: 1800000,
    }),
  ),

  http.get(`${BASE}/admin/medicos`, () =>
    HttpResponse.json({ medicos: [...MOCK_MEDICOS, ...MOCK_MEDICOS_PENDENTES] }),
  ),

  http.get(`${BASE}/admin/consultas`, () =>
    HttpResponse.json({ consultas: [...MOCK_CONSULTAS_PACIENTE, ...MOCK_CONSULTAS_MEDICO] }),
  ),

  http.get(`${BASE}/admin/usuarios`, () =>
    HttpResponse.json({
      usuarios: [
        { id: 'paciente-001', nome: 'João Silva (Mock)', email: 'joao@mock.com', tipo: 'PACIENTE', criadoEm: new Date().toISOString() },
        { id: 'medico-001', nome: 'Dra. Maria Santos (Mock)', email: 'maria@mock.com', tipo: 'MEDICO', criadoEm: new Date().toISOString() },
        { id: 'admin-001', nome: 'Admin Mock', email: 'admin@mock.com', tipo: 'ADMIN', criadoEm: new Date().toISOString() },
      ],
    }),
  ),

  http.delete(`${BASE}/admin/usuarios/:id`, () => HttpResponse.json({ ok: true })),

  // ── NOTIFICAÇÕES ──────────────────────────────────────────────────────────

  // Preferências de notificação — todos os aliases usados por fetchPreferenciasNotificacao / savePreferenciasNotificacao
  http.get(`${BASE}/usuarios/me/preferencias-notificacao`, () =>
    HttpResponse.json({
      pushEnabled: false,
      emailEnabled: true,
      whatsappEnabled: false,
      confirmacaoAgendamento: true,
      lembrete24h: true,
      lembrete1h: true,
      cancelamentos: true,
      prescricoes: false,
    }),
  ),
  http.put(`${BASE}/usuarios/me/preferencias-notificacao`, () => HttpResponse.json({ ok: true })),
  http.get(`${BASE}/usuarios/me/notificacoes/preferencias`, () =>
    HttpResponse.json({
      pushEnabled: false,
      emailEnabled: true,
      whatsappEnabled: false,
      confirmacaoAgendamento: true,
      lembrete24h: true,
      lembrete1h: true,
      cancelamentos: true,
      prescricoes: false,
    }),
  ),
  http.put(`${BASE}/usuarios/me/notificacoes/preferencias`, () => HttpResponse.json({ ok: true })),
  http.get(`${BASE}/notificacoes/preferencias`, () =>
    HttpResponse.json({
      pushEnabled: false,
      emailEnabled: true,
      whatsappEnabled: false,
      confirmacaoAgendamento: true,
      lembrete24h: true,
      lembrete1h: true,
      cancelamentos: true,
      prescricoes: false,
    }),
  ),
  http.put(`${BASE}/notificacoes/preferencias`, () => HttpResponse.json({ ok: true })),

  http.post(`${BASE}/notificacoes/whatsapp-test`, () => HttpResponse.json({ ok: true, mensagem: 'Mensagem de teste enviada (mock).' })),
  http.post(`${BASE}/notificacoes/whatsapp/teste`, () => HttpResponse.json({ ok: true, mensagem: 'Mensagem de teste enviada (mock).' })),
  http.post(`${BASE}/usuarios/me/notificacoes/whatsapp/teste`, () => HttpResponse.json({ ok: true, mensagem: 'Mensagem de teste enviada (mock).' })),
  http.post(`${BASE}/usuarios/me/push-token`, () => HttpResponse.json({ ok: true })),
  http.delete(`${BASE}/usuarios/me/push-token`, () => HttpResponse.json({ ok: true })),

  // ── CHAT ──────────────────────────────────────────────────────────────────

  http.get(`${BASE}/api/chats/usuario/:userId`, () =>
    HttpResponse.json([]),
  ),

  http.get(`${BASE}/api/chats/:chatId/mensagens`, () =>
    HttpResponse.json([]),
  ),

  http.post(`${BASE}/api/chats/:chatId/mensagens`, async ({ request }) => {
    const body = await request.json() as { texto?: string };
    return HttpResponse.json({
      id: `msg-${Date.now()}`,
      texto: body.texto ?? '',
      remetente: { id: 'paciente-001', nome: 'João Silva (Mock)' },
      criadoEm: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${BASE}/api/chats/iniciar`, async ({ request }) => {
    const body = await request.json() as { consultaId?: string };
    return HttpResponse.json({ chatId: `chat-${body.consultaId ?? Date.now()}` });
  }),

  // ── PERFIL ────────────────────────────────────────────────────────────────

  http.get(`${BASE}/usuarios/me`, async ({ request }) => {
    const auth = request.headers.get('Authorization') ?? '';
    // Retorna perfil baseado no token mock; em dev todos usam o mesmo token
    return HttpResponse.json({ ...MOCK_CURRENT_USER });
  }),

  http.put(`${BASE}/usuarios/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    MOCK_CURRENT_USER = { ...MOCK_CURRENT_USER, ...body };
    return HttpResponse.json({ ...MOCK_CURRENT_USER });
  }),

  http.put(`${BASE}/usuarios/me/senha`, () => HttpResponse.json({ ok: true })),

  // ── PACIENTE PERFIL ──────────────────────────────────────────────────

  http.get(`${BASE}/pacientes/me`, () =>
    HttpResponse.json({ paciente: { id: 'paciente-001', usuarioId: 'paciente-001', dataNascimento: '1990-01-01', fotoPerfil: null } }),
  ),
  http.put(`${BASE}/pacientes/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ paciente: { id: 'paciente-001', usuarioId: 'paciente-001', ...body } });
  }),

  // ── AVALIAÇÕES ──────────────────────────────────────────────────

  http.post(`${BASE}/pacientes/avaliacoes`, async ({ request }) => {
    const body = await request.json() as { consultaId?: string; nota?: number; comentario?: string };
    return HttpResponse.json({
      avaliacao: {
        id: `aval-${Date.now()}`,
        consultaId: body.consultaId,
        nota: body.nota ?? 5,
        comentario: body.comentario ?? '',
        criadoEm: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.get(`${BASE}/medicos/:id/avaliacoes`, () => {
    return HttpResponse.json({
      avaliacoes: [
        { id: 'aval-mock-1', consultaId: 'consulta-001', nota: 5, comentario: 'Excelente atendimento!', criadoEm: new Date().toISOString() },
        { id: 'aval-mock-2', consultaId: 'consulta-002', nota: 4, comentario: 'Muito bom.', criadoEm: new Date().toISOString() },
      ],
      media: 4.5,
      total: 2,
    });
  }),
];
