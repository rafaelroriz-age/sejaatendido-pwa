import { http, HttpResponse } from 'msw';

const BASE = 'https://sejaatendido-backend.onrender.com';

// ─── Dados fake reutilizáveis ────────────────────────────────────────────────

const MOCK_TOKEN = 'mock-jwt-token';
const MOCK_REFRESH = 'mock-refresh-token';

const MOCK_PACIENTE = {
  id: 'paciente-001',
  nome: 'João Silva (Mock)',
  email: 'joao@mock.com',
  tipo: 'PACIENTE' as const,
};

const MOCK_MEDICO_USER = {
  id: 'medico-001',
  nome: 'Dra. Maria Santos (Mock)',
  email: 'maria@mock.com',
  tipo: 'MEDICO' as const,
};

const MOCK_ADMIN_USER = {
  id: 'admin-001',
  nome: 'Admin Mock',
  email: 'admin@mock.com',
  tipo: 'ADMIN' as const,
};

const MOCK_MEDICOS = [
  {
    id: 'med-001',
    crm: 'CRM/SP 12345',
    especialidades: ['Clínico Geral'],
    aprovado: true,
    usuario: { id: 'usr-001', nome: 'Dr. Carlos Oliveira', email: 'carlos@mock.com' },
  },
  {
    id: 'med-002',
    crm: 'CRM/RJ 54321',
    especialidades: ['Cardiologia'],
    aprovado: true,
    usuario: { id: 'usr-002', nome: 'Dra. Ana Costa', email: 'ana@mock.com' },
  },
  {
    id: 'med-003',
    crm: 'CRM/MG 99999',
    especialidades: ['Dermatologia'],
    aprovado: true,
    usuario: { id: 'usr-003', nome: 'Dr. Pedro Lima', email: 'pedro@mock.com' },
  },
];

const MOCK_SLOTS = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00'];

const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
})();

const MOCK_CONSULTAS_PACIENTE = [
  {
    id: 'consulta-001',
    medicoId: 'med-001',
    pacienteId: 'paciente-001',
    data: tomorrow,
    motivo: 'Consulta de rotina',
    status: 'AGUARDANDO_PAGAMENTO',
    meetLink: null,
    medico: MOCK_MEDICOS[0],
  },
];

const MOCK_CONSULTAS_MEDICO = [
  {
    id: 'consulta-002',
    medicoId: 'med-001',
    pacienteId: 'paciente-001',
    data: tomorrow,
    motivo: 'Dor de cabeça frequente',
    status: 'CONFIRMADA',
    meetLink: 'https://meet.google.com/mock-link',
    paciente: { usuario: { nome: 'Maria Teste' } },
  },
];

const MOCK_SALDO = {
  saldoALiberarCentavos: 35000,
  saldoPendenteCentavos: 15000,
  ganhosHojeCentavos: 15000,
  proximoRepasse: '2026-05-15',
  ganhosSemana: [5000, 10000, 15000, 0, 20000, 8000, 0],
};

const MOCK_REPASSES = {
  repasses: [
    {
      id: 'repasse-001',
      valorRepasse: 35000,
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
        paciente: { usuario: { nome: 'Maria Teste' } },
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
      valorRepasse: 35000,
      status: 'PENDENTE',
      consulta: {
        id: 'consulta-002',
        data: tomorrow,
        paciente: { usuario: { nome: 'Maria Teste' } },
      },
    },
  ],
};

const MOCK_DADOS_BANCARIOS = {
  tipoChavePix: 'CPF',
  valorChavePix: '000.000.000-00',
  banco: 'Nubank',
  agencia: '0001',
  conta: '12345-6',
};

const MOCK_MEDICOS_PENDENTES = [
  {
    id: 'med-pending-001',
    crm: 'CRM/SP 88888',
    especialidades: ['Pediatria'],
    aprovado: false,
    usuario: { id: 'usr-pending', nome: 'Dr. Lucas Fernandes', email: 'lucas@mock.com' },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authResponse(user: typeof MOCK_PACIENTE | typeof MOCK_MEDICO_USER | typeof MOCK_ADMIN_USER) {
  return HttpResponse.json({
    token: MOCK_TOKEN,
    refreshToken: MOCK_REFRESH,
    usuario: user,
  });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // ── AUTH ──────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string };
    const email = body?.email ?? '';
    // Roteamento por email para testar diferentes papéis
    if (email.includes('admin')) return authResponse(MOCK_ADMIN_USER);
    if (email.includes('medico') || email.includes('doctor') || email.includes('med')) return authResponse(MOCK_MEDICO_USER);
    return authResponse(MOCK_PACIENTE);
  }),

  http.post(`${BASE}/auth/login-google`, () => authResponse(MOCK_PACIENTE)),

  http.post(`${BASE}/auth/registro`, async () => {
    await new Promise(r => setTimeout(r, 800)); // simula latência
    return HttpResponse.json({ id: 'novo-usuario-mock' }, { status: 201 });
  }),

  http.post(`${BASE}/auth/refresh-token`, () =>
    HttpResponse.json({ token: MOCK_TOKEN, refreshToken: MOCK_REFRESH }),
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

  // ── MÉDICOS ───────────────────────────────────────────────────────────────

  http.get(`${BASE}/medicos`, () => HttpResponse.json(MOCK_MEDICOS)),

  http.get(`${BASE}/medicos/:id`, ({ params }) => {
    const found = MOCK_MEDICOS.find(m => m.id === params.id);
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
  }),

  http.get(`${BASE}/medicos/:id/disponibilidade`, () => HttpResponse.json(MOCK_SLOTS)),

  // Painel médico
  http.get(`${BASE}/medicos/me/consultas`, () => HttpResponse.json(MOCK_CONSULTAS_MEDICO)),
  http.get(`${BASE}/medicos/me/saldo`, () => HttpResponse.json(MOCK_SALDO)),
  http.get(`${BASE}/medicos/me/repasses`, () => HttpResponse.json(MOCK_REPASSES)),
  http.get(`${BASE}/medicos/me/ciclos-repasse/:id`, () => HttpResponse.json(MOCK_REPASSE_DETAIL)),
  http.get(`${BASE}/medicos/me/dados-bancarios`, () => HttpResponse.json(MOCK_DADOS_BANCARIOS)),
  http.put(`${BASE}/medicos/me/dados-bancarios`, () => HttpResponse.json({ ok: true })),

  // ── CONSULTAS (PACIENTE) ──────────────────────────────────────────────────

  http.get(`${BASE}/paciente/consultas`, () => HttpResponse.json(MOCK_CONSULTAS_PACIENTE)),

  http.post(`${BASE}/paciente/consultas`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const nova = {
      id: `consulta-${Date.now()}`,
      medicoId: body.medicoId,
      pacienteId: 'paciente-001',
      data: body.data,
      motivo: body.motivo ?? 'Consulta geral',
      status: 'AGUARDANDO_PAGAMENTO',
      meetLink: null,
      medico: MOCK_MEDICOS.find(m => m.id === body.medicoId) ?? MOCK_MEDICOS[0],
    };
    MOCK_CONSULTAS_PACIENTE.push(nova as typeof MOCK_CONSULTAS_PACIENTE[0]);
    return HttpResponse.json(nova, { status: 201 });
  }),

  http.delete(`${BASE}/paciente/consultas/:id`, ({ params }) => {
    const idx = MOCK_CONSULTAS_PACIENTE.findIndex(c => c.id === params.id);
    if (idx !== -1) MOCK_CONSULTAS_PACIENTE.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── PAGAMENTOS ────────────────────────────────────────────────────────────

  http.post(`${BASE}/pagamentos/pix`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `pag-${Date.now()}`,
      status: 'PENDENTE',
      qrCode: '00020126580014BR.GOV.BCB.PIX0136mock-pix-key-para-testes',
      qrCodeBase64: '',
      copiaCola: '00020126580014BR.GOV.BCB.PIX0136mock-pix-key-para-testes',
      pix: {
        codigo: '00020126580014BR.GOV.BCB.PIX0136mock-pix-key-para-testes',
        qrcode: '',
        validade: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
      consultaId: body.consultaId,
    });
  }),

  http.post(`${BASE}/pagamentos/mercadopago/checkout`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `pag-mp-${Date.now()}`,
      status: 'PENDENTE',
      linkPagamento: 'https://www.mercadopago.com.br/checkout/mock',
      paymentUrl: 'https://www.mercadopago.com.br/checkout/mock',
      mercadopago: {
        preferenceId: 'mock-preference-id',
        initPoint: 'https://www.mercadopago.com.br/checkout/mock',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.br/checkout/mock',
      },
      pagamento: { id: `pag-mp-${Date.now()}`, status: 'PENDENTE' },
      consultaId: body.consultaId,
    });
  }),

  http.get(`${BASE}/pagamentos/:id`, () =>
    HttpResponse.json({ id: 'pag-001', status: 'PAGO' }),
  ),

  http.post(`${BASE}/pagamentos/mercadopago/:id/sync`, () =>
    HttpResponse.json({ id: 'pag-001', status: 'PAGO' }),
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

  // ── NOTIFICAÇÕES ──────────────────────────────────────────────────────────

  http.post(`${BASE}/notificacoes/device-token`, () => HttpResponse.json({ ok: true })),

  // ── PERFIL ────────────────────────────────────────────────────────────────

  http.put(`${BASE}/usuarios/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...MOCK_PACIENTE, ...body });
  }),

  http.put(`${BASE}/usuarios/me/senha`, () => HttpResponse.json({ ok: true })),
];
