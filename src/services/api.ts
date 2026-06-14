import axios, { AxiosHeaders } from 'axios';
import { API_URL } from '../config/api';
import {
  clearAuthSession,
  getRefreshToken,
  getToken,
  saveRefreshToken,
  saveToken,
} from '../storage/localStorage';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

type RetriableAxiosRequestConfig = {
  _retry?: boolean;
} & Parameters<typeof api.request>[0];

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      if (!config.headers) config.headers = new AxiosHeaders();
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error.response?.status;
    const originalConfig = error.config as RetriableAxiosRequestConfig | undefined;

    if (status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearAuthSession();
          return Promise.reject(error);
        }

        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
        );

        const accessToken: string | undefined =
          refreshResponse.data?.accessToken ?? refreshResponse.data?.token;
        const newRefreshToken: string | undefined = refreshResponse.data?.refreshToken;

        if (!accessToken) {
          await clearAuthSession();
          return Promise.reject(error);
        }

        await saveToken(accessToken);
        if (newRefreshToken) await saveRefreshToken(newRefreshToken);

        if (!originalConfig.headers) originalConfig.headers = new AxiosHeaders();
        if (originalConfig.headers instanceof AxiosHeaders) {
          originalConfig.headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
          (originalConfig.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
        }
        return api.request(originalConfig);
      } catch {
        await clearAuthSession();
        return Promise.reject(error);
      }
    }

    if (status === 401) await clearAuthSession();
    return Promise.reject(error);
  },
);

// AUTH
export interface LoginRequest { email: string; senha: string; }
export interface LoginCpfRequest { cpf: string; senha: string; }
export interface RegisterRequest {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  aceitouTermos?: boolean;
  aceitouPrivacidade?: boolean;
  senha: string;
  tipo: 'PACIENTE' | 'MEDICO';
}
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    cpf?: string;
    tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN';
    crmCartaoValidado?: boolean;
    crmNumero?: string;
    crmUf?: string;
  };
}

export async function loginRequest(data: LoginRequest): Promise<AuthResponse> {
  const r = await api.post('/auth/login', data);
  return r.data;
}

export async function loginCpfRequest(data: LoginCpfRequest): Promise<AuthResponse> {
  const r = await api.post('/auth/login', data);
  return r.data;
}

export async function loginGoogleRequest(idToken: string): Promise<AuthResponse> {
  const r = await api.post('/auth/google', { idToken });
  return r.data;
}

export async function loginAppleRequest(identityToken: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
  const body: Record<string, unknown> = { identityToken };
  if (firstName || lastName) body.user = { name: { firstName: firstName ?? '', lastName: lastName ?? '' } };
  const r = await api.post('/auth/apple', body);
  return r.data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export interface RegisterResponse {
  id?: string;
  accessToken: string;
  refreshToken: string;
  usuario: AuthResponse['usuario'];
  mensagem?: string;
}

export async function registerRequest(data: RegisterRequest): Promise<RegisterResponse> {
  const r = await api.post('/auth/registro', data, { timeout: 30000 });
  return r.data;
}

export async function confirmEmailRequest(token: string): Promise<void> {
  await api.post('/emails/confirmar-email', { token });
}

export async function resetPasswordRequest(token: string, novaSenha: string): Promise<void> {
  await api.post('/emails/resetar-senha', { token, novaSenha });
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await api.post('/emails/recuperar-senha', { email });
}

export async function resendConfirmEmailRequest(): Promise<void> {
  await api.post('/emails/confirmar-email/enviar');
}

// CRM
export interface CrmStatusResponse {
  crmCartaoValidado: boolean;
  status?: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | string;
  crmNumero?: string;
  crmUf?: string;
}

export async function fetchCrmStatus(): Promise<CrmStatusResponse> {
  const r = await api.get('/medicos/me/crm/status');
  return r.data;
}

export async function validarCrmQr(payload: string): Promise<CrmStatusResponse> {
  const r = await api.post('/medicos/me/crm/validar-cartao', { payload });
  return r.data;
}

// MEDICOS
export interface Medico {
  id: string;
  usuarioId: string;
  especialidade?: string;
  especialidades?: string[];
  crmNumero?: string;
  crmUf?: string;
  crm?: string;
  fotoPerfil?: string;
  bio?: string;
  valorConsulta?: number;
  status?: string;
  aprovado?: boolean;
  usuario: { id: string; nome: string; email: string; telefone?: string };
}

export interface MedicoListResponse {
  medicos: Medico[];
  total: number;
  page: number;
}

function normalizeMedico(raw: any): Medico {
  const medicoRaw = raw?.medico && typeof raw.medico === 'object' ? raw.medico : raw;
  const usuarioRaw = raw?.usuario ?? medicoRaw?.usuario ?? {};
  const nome = usuarioRaw?.nome ?? medicoRaw?.nome ?? raw?.nome ?? medicoRaw?.usuarioNome ?? raw?.usuarioNome ?? 'Médico';
  const email = usuarioRaw?.email ?? medicoRaw?.email ?? raw?.email ?? '';
  const telefone = usuarioRaw?.telefone ?? medicoRaw?.telefone ?? raw?.telefone;
  const especialidades = Array.isArray(medicoRaw?.especialidades)
    ? medicoRaw.especialidades
    : medicoRaw?.especialidade
      ? [medicoRaw.especialidade]
      : undefined;

  return {
    id: String(medicoRaw?.id ?? raw?.id ?? medicoRaw?.medicoId ?? raw?.medicoId ?? medicoRaw?.usuarioId ?? raw?.usuarioId ?? ''),
    usuarioId: String(medicoRaw?.usuarioId ?? raw?.usuarioId ?? usuarioRaw?.id ?? medicoRaw?.idUsuario ?? raw?.idUsuario ?? ''),
    especialidade: medicoRaw?.especialidade ?? raw?.especialidade ?? especialidades?.[0],
    especialidades,
    crmNumero: medicoRaw?.crmNumero ?? raw?.crmNumero,
    crmUf: medicoRaw?.crmUf ?? raw?.crmUf,
    crm: medicoRaw?.crm ?? raw?.crm,
    fotoPerfil: medicoRaw?.fotoPerfil ?? raw?.fotoPerfil,
    bio: medicoRaw?.bio ?? raw?.bio,
    valorConsulta: medicoRaw?.valorConsulta ?? raw?.valorConsulta,
    status: medicoRaw?.status ?? raw?.status,
    aprovado: medicoRaw?.aprovado ?? raw?.aprovado,
    usuario: {
      id: String(usuarioRaw?.id ?? medicoRaw?.usuarioId ?? raw?.usuarioId ?? medicoRaw?.id ?? raw?.id ?? ''),
      nome,
      email,
      telefone,
    },
  };
}

function logMedicosTelemetry(rawPayload: unknown, normalized: Medico[], params?: { especialidade?: string; nome?: string; page?: number; limit?: number }) {
  if (!import.meta.env.DEV) return;

  const rawList = Array.isArray((rawPayload as any)?.medicos)
    ? (rawPayload as any).medicos
    : Array.isArray(rawPayload)
      ? rawPayload
      : [];

  console.groupCollapsed('[telemetry] GET /medicos payload diagnostics');
  console.log('query params:', params ?? null);
  console.log('raw payload type:', typeof rawPayload, 'raw length:', rawList.length);
  console.log('raw payload sample:', rawPayload);

  const rawShape = rawList.map((item: any, index: number) => ({
    index,
    id: item?.id,
    usuarioId: item?.usuarioId,
    hasUsuarioObject: Boolean(item?.usuario && typeof item.usuario === 'object'),
    usuarioKeys: item?.usuario && typeof item.usuario === 'object' ? Object.keys(item.usuario) : [],
    topLevelKeys: item && typeof item === 'object' ? Object.keys(item) : [],
    nomeCandidates: {
      usuarioNome: item?.usuario?.nome,
      nome: item?.nome,
      usuarioNomeFlat: item?.usuarioNome,
    },
    status: item?.status,
    aprovado: item?.aprovado,
  }));

  console.table(rawShape);
  console.log('normalized doctors:', normalized);
  console.groupEnd();
}

export async function fetchMedicos(params?: { especialidade?: string; nome?: string; page?: number; limit?: number }): Promise<Medico[]> {
  const mergedParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    ...(params?.especialidade ? { especialidade: params.especialidade } : {}),
    ...(params?.nome ? { nome: params.nome } : {}),
  };
  const r = await api.get('/medicos', { params: mergedParams });
  const list = r.data?.medicos ?? r.data ?? [];
  if (!Array.isArray(list)) {
    logMedicosTelemetry(r.data, [], mergedParams);
    return [];
  }

  const normalized = list.map(normalizeMedico).filter((m) => Boolean(m.id));
  logMedicosTelemetry(r.data, normalized, mergedParams);
  return normalized;
}

export async function fetchMedicoById(id: string): Promise<Medico> {
  const r = await api.get(`/medicos/${id}`);
  return normalizeMedico(r.data?.medico ?? r.data);
}

export async function fetchMedicoPerfil(): Promise<Medico> {
  const r = await api.get('/medicos/me');
  return normalizeMedico(r.data?.medico ?? r.data);
}

export async function updateMedicoPerfil(data: { especialidade?: string; bio?: string; valorConsulta?: number; fotoPerfil?: string }): Promise<Medico> {
  const r = await api.put('/medicos/me', data);
  return normalizeMedico(r.data?.medico ?? r.data);
}

export interface SlotsResponse {
  slots: string[];
  duracaoSlotMinutos: number;
}

export async function fetchDisponibilidadeMedico(medicoId: string | string[], data: string): Promise<string[]> {
  const ids = Array.isArray(medicoId) ? medicoId : [medicoId];
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  for (const id of uniqueIds) {
    try {
      const response = await api.get(`/medicos/${id}/slots`, { params: { data } });
      const payload = response.data as SlotsResponse;
      return payload?.slots ?? [];
    } catch {
      // Try next candidate ID.
    }
  }

  return [];
}

export interface DisponibilidadeItem {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  duracaoSlot?: number;
  ativo?: boolean;
}

export interface HorarioBloqueado {
  id?: string;
  dataHora: string;
  duracao?: number;
  motivo?: string;
}

export async function fetchMinhaDisponibilidade(): Promise<DisponibilidadeItem[]> {
  const r = await api.get('/medicos/me/disponibilidade');
  return r.data?.disponibilidades ?? r.data ?? [];
}

export async function saveMinhaDisponibilidade(disponibilidades: DisponibilidadeItem[]): Promise<DisponibilidadeItem[]> {
  const r = await api.put('/medicos/me/disponibilidade', { disponibilidades });
  return r.data?.disponibilidades ?? r.data ?? [];
}

export async function criarHorarioBloqueado(data: HorarioBloqueado): Promise<HorarioBloqueado> {
  const r = await api.post('/medicos/me/horario-bloqueado', data);
  return r.data?.horarioBloqueado ?? r.data;
}

export async function deletarHorarioBloqueado(id: string): Promise<void> {
  await api.delete(`/medicos/me/horario-bloqueado/${id}`);
}

export async function fetchHorariosBloqueados(from?: string): Promise<HorarioBloqueado[]> {
  const r = await api.get('/medicos/me/horarios-bloqueados', { params: from ? { from } : undefined });
  return r.data?.horariosBloqueados ?? r.data ?? [];
}

// PACIENTE PERFIL
export interface PacientePerfil {
  id: string;
  usuarioId: string;
  dataNascimento?: string;
  fotoPerfil?: string;
}

export async function fetchPacientePerfil(): Promise<PacientePerfil> {
  const r = await api.get('/pacientes/me');
  return r.data?.paciente ?? r.data;
}

export async function updatePacientePerfil(data: { dataNascimento?: string; fotoPerfil?: string }): Promise<PacientePerfil> {
  const r = await api.put('/pacientes/me', data);
  return r.data?.paciente ?? r.data;
}

// AVALIACOES
export interface Avaliacao {
  id: string;
  consultaId: string;
  nota: number;
  comentario?: string;
  criadoEm: string;
}

export interface AvaliacoesMedicoResponse {
  avaliacoes: Avaliacao[];
  media: number;
  total: number;
}

export async function criarAvaliacao(consultaId: string, nota: number, comentario?: string): Promise<Avaliacao> {
  const r = await api.post('/pacientes/avaliacoes', { consultaId, nota, ...(comentario ? { comentario } : {}) });
  return r.data?.avaliacao ?? r.data;
}

export async function fetchAvaliacoesMedico(medicoId: string): Promise<AvaliacoesMedicoResponse> {
  const r = await api.get(`/medicos/${medicoId}/avaliacoes`);
  return r.data;
}

// CONSULTAS
export interface Consulta {
  id: string;
  medicoId: string;
  pacienteId: string;
  dataHora?: string;
  data?: string;
  sintomas?: string;
  motivo?: string;
  status: string;
  valor?: number;
  meetLink?: string;
  medico?: Medico;
}

export interface CreateConsultaRequest {
  medicoId: string;
  dataHora: string;
  sintomas: string;
}

function normalizeConsulta(raw: any): Consulta {
  const medicoRaw = raw?.medico && typeof raw.medico === 'object' ? normalizeMedico(raw.medico) : undefined;
  const pacienteRaw = raw?.paciente && typeof raw.paciente === 'object' ? raw.paciente : undefined;
  return {
    id: String(raw?.id ?? raw?.consultaId ?? ''),
    medicoId: String(raw?.medicoId ?? raw?.medico?.id ?? raw?.medico?.usuarioId ?? ''),
    pacienteId: String(raw?.pacienteId ?? raw?.paciente?.id ?? raw?.paciente?.usuarioId ?? ''),
    dataHora: raw?.dataHora ?? raw?.dataConsulta ?? raw?.inicio ?? raw?.data,
    data: raw?.data ?? raw?.dataHora ?? raw?.dataConsulta,
    sintomas: raw?.sintomas ?? raw?.motivo,
    motivo: raw?.motivo ?? raw?.sintomas,
    status: String(raw?.status ?? 'PENDENTE'),
    valor: raw?.valor,
    meetLink: raw?.meetLink,
    medico: medicoRaw,
    ...(pacienteRaw ? { paciente: pacienteRaw } : {}),
  } as Consulta;
}

function extractConsultas(payload: any): Consulta[] {
  const list =
    (Array.isArray(payload?.consultas) ? payload.consultas : null)
    ?? (Array.isArray(payload?.data?.consultas) ? payload.data.consultas : null)
    ?? (Array.isArray(payload?.items) ? payload.items : null)
    ?? (Array.isArray(payload) ? payload : []);
  return list.map(normalizeConsulta);
}

export async function fetchMinhasConsultas(): Promise<Consulta[]> {
  const endpoints = ['/consultas', '/pacientes/me/consultas'];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const r = await api.get(endpoint);
      return extractConsultas(r.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export async function fetchConsultasMedico(): Promise<Consulta[]> {
  const endpoints = ['/medicos/me/consultas', '/consultas/medico'];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const r = await api.get(endpoint);
      return extractConsultas(r.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export async function createConsulta(data: CreateConsultaRequest): Promise<Consulta> {
  const endpoints = ['/consultas', '/pacientes/consultas'];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const r = await api.post(endpoint, data, { timeout: 30000 });
      return normalizeConsulta(r.data?.consulta ?? r.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('Não foi possível criar consulta.');
}

export async function cancelConsulta(id: string): Promise<void> {
  try {
    await api.delete(`/consultas/${id}`);
  } catch (error) {
    const status = (error as any)?.response?.status;
    if (status !== 404) throw error;
    await api.delete(`/pacientes/me/consultas/${id}`);
  }
}

export async function updateConsultaMedico(id: string, acao: 'ACEITA' | 'RECUSADA', motivoRecusa?: string): Promise<void> {
  const acaoMap = { ACEITA: 'ACEITAR', RECUSADA: 'RECUSAR' } as const;
  await api.patch(`/medicos/me/consultas/${id}`, {
    acao: acaoMap[acao],
    ...(motivoRecusa ? { motivoRecusa } : {}),
  });
}

// ADMIN
export interface AdminDashboardStats {
  totalUsuarios: number;
  totalMedicos: number;
  medicosAprovados: number;
  medicosPendentes: number;
  totalPacientes: number;
  totalConsultas: number;
  consultasPendentes: number;
  consultasConcluidas: number;
  receitaTotal: number;
}

export interface AdminMedico {
  id: string;
  cpf?: string;
  crm?: string;
  status?: string;
  aprovado?: boolean;
  especialidades?: string[];
  usuarioId?: string;
  usuario: { id?: string; nome: string; email: string };
}

export interface AdminUsuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  cpf?: string;
  criadoEm?: string;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  return (await api.get('/admin/dashboard')).data;
}

export async function fetchMedicosPendentes(): Promise<AdminMedico[]> {
  const r = await api.get('/admin/medicos/pendentes');
  return r.data?.medicos ?? r.data ?? [];
}

export async function fetchAdminMedicos(): Promise<AdminMedico[]> {
  const r = await api.get('/admin/medicos');
  return r.data?.medicos ?? r.data ?? [];
}

export async function aprovarMedico(id: string): Promise<void> {
  await api.post(`/admin/medicos/${id}/aprovar`);
}

export async function rejeitarMedico(id: string, motivo: string): Promise<void> {
  await api.post(`/admin/medicos/${id}/recusar`, { motivo });
}

export async function fetchAdminConsultas(): Promise<Consulta[]> {
  const r = await api.get('/admin/consultas');
  return r.data?.consultas ?? r.data ?? [];
}

export async function fetchAdminUsuarios(): Promise<AdminUsuario[]> {
  const r = await api.get('/admin/usuarios');
  return r.data?.usuarios ?? r.data ?? [];
}

export async function deleteAdminUsuario(id: string): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`);
}

// PAGAMENTOS
export type MetodoPagamento = 'pix' | 'cartao' | 'card';
export interface CriarPagamentoRequest {
  consultaId: string;
  metodoPagamento?: MetodoPagamento;
  valorCentavos?: number;
}

export interface PagamentoCriado {
  id: string;
  consultaId: string;
  valor: number;
  status: string;
  metodo: string;
  criadoEm: string;
}

export interface PagamentoResponse {
  id: string;
  status?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  copiaCola?: string;
  copiaECola?: string;
  linkPagamento?: string;
  paymentUrl?: string;
  preferenceId?: string;
  pagamento?: PagamentoCriado;
  pix?: {
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    validade?: string;
  };
  mercadopago?: {
    publicKey?: string;
    preferenceId?: string;
    initPoint?: string;
    sandboxInitPoint?: string;
  };
}

function normalizePagamentoResponse(res: any): PagamentoResponse {
  return {
    ...res,
    id: res?.pagamento?.id ?? res?.id ?? '',
    status: res?.pagamento?.status ?? res?.status,
    qrCode: res?.pix?.qrCode ?? res?.qrCode,
    qrCodeBase64: res?.pix?.qrCodeBase64 ?? res?.qrCodeBase64,
    copiaCola: res?.pix?.qrCode ?? res?.copiaCola ?? res?.copiaECola,
    preferenceId: res?.mercadopago?.preferenceId ?? res?.preferenceId,
    linkPagamento: res?.mercadopago?.initPoint ?? res?.linkPagamento ?? res?.paymentUrl,
    paymentUrl: res?.mercadopago?.initPoint ?? res?.paymentUrl ?? res?.linkPagamento,
  };
}

export async function criarPagamento(data: CriarPagamentoRequest): Promise<PagamentoResponse> {
  const metodo = data.metodoPagamento === 'card' ? 'cartao' : (data.metodoPagamento || 'pix');
  const endpoint = metodo === 'pix' ? '/v1/pagamentos/pix' : '/v1/pagamentos/cartao';
  const body: Record<string, unknown> = { consultaId: data.consultaId };
  const r = await api.post(endpoint, body);
  return normalizePagamentoResponse(r.data);
}

export async function fetchPagamentoById(id: string): Promise<PagamentoResponse> {
  return (await api.get(`/v1/pagamentos/${id}`)).data;
}

export async function syncPagamento(consultaId: string): Promise<PagamentoResponse> {
  const r = await api.get(`/v1/pagamentos/sync/${consultaId}`);
  return normalizePagamentoResponse(r.data);
}

// DADOS BANCARIOS
export interface DadosBancarios {
  tipoChavePix?: string;
  chavePix?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
}

export async function fetchDadosBancarios(): Promise<DadosBancarios | null> {
  const raw = (await api.get('/medicos/me/dados-bancarios')).data;
  return raw
    ? {
        tipoChavePix: raw.tipoChavePix,
        chavePix: raw.valorChavePix,
        banco: raw.banco,
        agencia: raw.agencia,
        conta: raw.conta,
      }
    : null;
}

export async function saveDadosBancarios(data: DadosBancarios): Promise<void> {
  await api.put('/medicos/me/dados-bancarios', {
    tipoChavePix: data.tipoChavePix,
    valorChavePix: data.chavePix,
    banco: data.banco,
    agencia: data.agencia,
    conta: data.conta,
  });
}

// PREFERENCIAS NOTIFICACAO
export interface PreferenciasNotificacao {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  whatsappNumber?: string;
  confirmacaoAgendamento?: boolean;
  lembrete24h?: boolean;
  lembrete1h?: boolean;
  cancelamentos?: boolean;
  prescricoes?: boolean;
}

export async function fetchPreferenciasNotificacao(): Promise<PreferenciasNotificacao | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('@notificationPreferences');
    return raw ? JSON.parse(raw) as PreferenciasNotificacao : null;
  } catch {
    return null;
  }
}

export async function savePreferenciasNotificacao(_data: PreferenciasNotificacao): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('@notificationPreferences', JSON.stringify(_data));
  } catch {
    // ignore local persistence failures
  }
}

export interface WhatsappTestResponse {
  ok: boolean;
  mensagem?: string;
}

export async function testarNotificacaoWhatsapp(): Promise<WhatsappTestResponse> {
  const endpoints = [
    '/notificacoes/whatsapp-test',
    '/notificacoes/whatsapp/teste',
    '/usuarios/me/notificacoes/whatsapp/teste',
  ];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const res = await api.post(endpoint, {}, { timeout: 30000 });
      return {
        ok: Boolean(res.data?.ok ?? true),
        mensagem: res.data?.mensagem ?? res.data?.message,
      };
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404 || status === 405) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Endpoint de teste de WhatsApp não encontrado.');
}

export interface Frontend404Telemetry {
  route: string;
  host: string;
  expectedHost?: string;
  userAgent: string;
  occurredAt: string;
}

export async function sendFrontend404Telemetry(data: Frontend404Telemetry): Promise<void> {
  try {
    await api.post('/telemetria/frontend-404', data);
  } catch {
    // telemetry endpoint is optional; don't break UX
  }
}

export interface PushTokenPayload {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
  userAgent?: string;
  platform?: string;
}

export async function registerPushToken(data: PushTokenPayload): Promise<void> {
  const plataforma =
    data.platform?.toUpperCase() === 'IOS' || data.platform?.toUpperCase() === 'ANDROID'
      ? (data.platform.toUpperCase() as 'IOS' | 'ANDROID')
      : null;
  if (!plataforma) return;
  await api.post('/usuarios/me/push-token', { token: data.endpoint, plataforma });
}

export async function unregisterPushToken(): Promise<void> {
  await api.delete('/usuarios/me/push-token');
}

// PERFIL
export interface SavePerfilRequest {
  nome?: string;
  cpf?: string;
  telefone?: string;
  senhaAtual?: string;
  novaSenha?: string;
}

export interface PerfilResponse {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN';
  telefone?: string;
}

export async function fetchPerfil(): Promise<PerfilResponse> {
  const res = await api.get('/usuarios/me');
  return res.data;
}

export async function savePerfil(data: SavePerfilRequest): Promise<PerfilResponse> {
  if (data.senhaAtual && data.novaSenha) {
    await api.put('/usuarios/me/senha', { senhaAtual: data.senhaAtual, novaSenha: data.novaSenha });
  }
  const body: Record<string, unknown> = { nome: data.nome };
  if (data.cpf !== undefined) body.cpf = data.cpf;
  if (data.telefone !== undefined) body.telefone = data.telefone;
  const res = await api.put('/usuarios/me', body);
  return res.data;
}

// SALDO / GANHOS
export interface SaldoMedico {
  saldo_a_liberar: number;
  saldo_pendente: number;
  ganhos_hoje: number;
  proximo_repasse: string;
  ganhos_semana: number[];
}

export interface ConsultaRepasse {
  id: string;
  paciente: string;
  horario: string;
  valor: number;
  status: 'pendente' | 'confirmado';
}

export interface Repasse {
  id: string;
  periodo: string;
  valor: number;
  status: 'concluido' | 'erro' | 'pendente';
  data_repasse: string;
  chave_pix_destino?: string;
  consultas?: ConsultaRepasse[];
  comprovante_url?: string;
}

export async function fetchSaldoMedico(): Promise<SaldoMedico> {
  const raw = (await api.get('/medicos/me/saldo')).data;
  return {
    saldo_a_liberar: (raw.saldoALiberarCentavos ?? 0) / 100,
    saldo_pendente: (raw.saldoPendenteCentavos ?? 0) / 100,
    ganhos_hoje: (raw.ganhosHojeCentavos ?? 0) / 100,
    proximo_repasse: raw.proximoRepasse ?? '',
    ganhos_semana: raw.ganhosSemana ?? [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function fetchRepasses(): Promise<Repasse[]> {
  const raw = (await api.get('/medicos/me/repasses')).data;
  const list = raw.repasses ?? raw ?? [];
  return list.map((r: any) => ({
    id: r.id,
    periodo: r.cicloRepasse?.semanaInicio
      ? `${new Date(r.cicloRepasse.semanaInicio).toLocaleDateString('pt-BR')} - ${new Date(r.cicloRepasse.semanaFim).toLocaleDateString('pt-BR')}`
      : '',
    valor: (r.valorRepasse ?? 0) / 100,
    status: (r.status ?? 'PENDENTE').toLowerCase(),
    data_repasse: r.dataRepasse ?? r.criadoEm ?? '',
    chave_pix_destino: undefined,
    consultas: r.consulta
      ? [
          {
            id: r.consulta.id,
            paciente: r.consulta.paciente?.usuario?.nome ?? 'Paciente',
            horario: new Date(r.consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            valor: (r.valorRepasse ?? 0) / 100,
            status: r.status === 'PROCESSADO' ? 'confirmado' : 'pendente',
          },
        ]
      : [],
  }));
}

export async function fetchRepasseById(id: string): Promise<Repasse> {
  const raw = (await api.get(`/medicos/me/ciclos-repasse/${id}`)).data;
  const repasses = raw.repasses ?? [];
  const totalValor = repasses.reduce((acc: number, r: any) => acc + (r.valorRepasse ?? 0), 0);
  return {
    id: raw.id,
    periodo: raw.semanaInicio
      ? `${new Date(raw.semanaInicio).toLocaleDateString('pt-BR')} - ${new Date(raw.semanaFim).toLocaleDateString('pt-BR')}`
      : '',
    valor: totalValor / 100,
    status: (raw.status ?? 'pendente').toLowerCase(),
    data_repasse: raw.semanaFim ?? '',
    chave_pix_destino: undefined,
    consultas: repasses.map((r: any) => ({
      id: r.consulta?.id ?? r.id,
      paciente: r.consulta?.paciente?.usuario?.nome ?? 'Paciente',
      horario: r.consulta?.data
        ? new Date(r.consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '',
      valor: (r.valorRepasse ?? 0) / 100,
      status: r.status === 'PROCESSADO' ? 'confirmado' : 'pendente',
    })),
  };
}

// CHAT
export interface ChatSummary {
  chatId: string;
  consultaId: string;
  outraParte?: { id: string; nome: string };
  ultimaMensagem?: string;
  naoLidas?: number;
  atualizadoEm?: string;
}

export interface ChatMessage {
  id: string;
  texto: string;
  remetente: { id: string; nome?: string };
  criadoEm: string;
}

export async function fetchChatsUsuario(userId: string): Promise<ChatSummary[]> {
  const r = await api.get(`/api/chats/usuario/${userId}`);
  return r.data;
}

export async function fetchMensagensChat(chatId: string, limit = 50, cursor?: string): Promise<ChatMessage[]> {
  const r = await api.get(`/api/chats/${chatId}/mensagens`, { params: { limit, ...(cursor ? { cursor } : {}) } });
  return r.data;
}

export async function enviarMensagem(chatId: string, texto: string): Promise<ChatMessage> {
  const r = await api.post(`/api/chats/${chatId}/mensagens`, { texto });
  return r.data;
}

export async function iniciarChat(consultaId: string): Promise<{ chatId: string }> {
  const r = await api.post('/api/chats/iniciar', { consultaId });
  return r.data;
}

export default api;
