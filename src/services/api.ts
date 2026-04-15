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
        if (!refreshToken) { await clearAuthSession(); return Promise.reject(error); }

        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
        );

        const accessToken: string | undefined =
          refreshResponse.data?.accessToken ?? refreshResponse.data?.token;
        const newRefreshToken: string | undefined = refreshResponse.data?.refreshToken;

        if (!accessToken) { await clearAuthSession(); return Promise.reject(error); }

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

// ============ AUTH ============
export interface LoginRequest { email: string; senha: string; }
export interface RegisterRequest {
  nome: string;
  email: string;
  senha: string;
  tipo: 'PACIENTE' | 'MEDICO';
  crm?: string;
  diplomaFileName?: string;
  diplomaFileBase64?: string;
}
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  usuario: { id: string; nome: string; email: string; tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN'; };
}

export async function loginRequest(data: LoginRequest): Promise<AuthResponse> {
  const r = await api.post('/auth/login', data); return r.data;
}
export async function loginGoogleRequest(idToken: string): Promise<AuthResponse> {
  const r = await api.post('/auth/login-google', { idToken });
  return r.data;
}
export async function registerRequest(data: RegisterRequest): Promise<{ id: string }> {
  const r = await api.post('/auth/registro', data); return r.data;
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

// ============ MÉDICOS ============
export interface Medico {
  id: string; usuarioId: string; crm: string; especialidades: string[]; aprovado: boolean;
  usuario: { id: string; nome: string; email: string; };
}
export async function fetchMedicos(): Promise<Medico[]> { return (await api.get('/medicos')).data; }
export async function fetchMedicoById(id: string): Promise<Medico> { return (await api.get(`/medicos/${id}`)).data; }
export async function fetchDisponibilidadeMedico(medicoId: string, data: string): Promise<string[]> {
  try {
    const response = await api.get(`/medicos/${medicoId}/disponibilidade`, { params: { data } });
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    return payload?.slots ?? payload?.horarios ?? payload?.disponibilidade ?? [];
  } catch {
    // Endpoint may not exist yet in backend — return empty to allow any slot
    return [];
  }
}

// ============ CONSULTAS ============
export interface Consulta {
  id: string; medicoId: string; pacienteId: string; data: string; motivo: string; status: string;
  meetLink?: string; medico?: Medico;
}
export interface CreateConsultaRequest { medicoId: string; data: string; motivo: string; }
export async function fetchMinhasConsultas(): Promise<Consulta[]> { return (await api.get('/paciente/consultas')).data; }
export async function fetchConsultasMedico(): Promise<Consulta[]> { return (await api.get('/medicos/me/consultas')).data; }
export async function createConsulta(data: CreateConsultaRequest): Promise<Consulta> { return (await api.post('/paciente/consultas', data)).data; }
export async function cancelConsulta(id: string): Promise<void> { await api.delete(`/paciente/consultas/${id}`); }

// ============ ADMIN ============
export async function fetchMedicosPendentes(): Promise<Medico[]> { return (await api.get('/admin/medicos/pendentes')).data; }
export async function aprovarMedico(id: string): Promise<void> { await api.post(`/admin/medicos/${id}/aprovar`); }
export async function recusarMedico(id: string): Promise<void> { await api.post(`/admin/medicos/${id}/recusar`); }

// ============ PAGAMENTOS ============
export type MetodoPagamento = 'pix' | 'cartao' | 'card';
export interface CriarPagamentoRequest { consultaId: string; metodoPagamento?: MetodoPagamento; valorCentavos?: number; }
export interface PagamentoResponse {
  id: string; status?: string; qrCode?: string; qrCodeBase64?: string;
  copiaCola?: string; copiaECola?: string; linkPagamento?: string; paymentUrl?: string;
  pagamento?: any;
  pix?: { codigo?: string; qrcode?: string; validade?: string };
  mercadopago?: { preferenceId?: string; initPoint?: string; sandboxInitPoint?: string };
}
export async function criarPagamento(data: CriarPagamentoRequest): Promise<PagamentoResponse> {
  const metodo = data.metodoPagamento || 'pix';
  if (metodo === 'pix') {
    const r = await api.post('/pagamentos/pix', {
      consultaId: data.consultaId,
      valorCentavos: data.valorCentavos,
    });
    return r.data;
  }
  // cartao/card → Mercado Pago Checkout Pro
  const r = await api.post('/pagamentos/mercadopago/checkout', {
    consultaId: data.consultaId,
    valorCentavos: data.valorCentavos,
  });
  const res = r.data;
  // Normalize response so Payment page can use linkPagamento
  return {
    ...res,
    id: res.pagamento?.id ?? res.id,
    status: res.pagamento?.status ?? res.status,
    linkPagamento: res.mercadopago?.initPoint ?? res.linkPagamento,
    paymentUrl: res.mercadopago?.initPoint ?? res.paymentUrl,
  };
}
export async function fetchPagamentoById(id: string): Promise<PagamentoResponse> { return (await api.get(`/pagamentos/${id}`)).data; }
export async function syncPagamento(id: string): Promise<any> { return (await api.post(`/pagamentos/mercadopago/${id}/sync`)).data; }

// ============ DADOS BANCÁRIOS ============
export interface DadosBancarios { tipoChavePix?: string; chavePix?: string; banco?: string; agencia?: string; conta?: string; }
export async function fetchDadosBancarios(): Promise<DadosBancarios | null> {
  const raw = (await api.get('/medicos/me/dados-bancarios')).data;
  // Backend uses "valorChavePix", PWA uses "chavePix"
  return raw ? { tipoChavePix: raw.tipoChavePix, chavePix: raw.valorChavePix, banco: raw.banco, agencia: raw.agencia, conta: raw.conta } : null;
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

// ============ PREFERÊNCIAS NOTIFICAÇÃO ============
export interface PreferenciasNotificacao {
  pushEnabled?: boolean; emailEnabled?: boolean; whatsappEnabled?: boolean; whatsappNumber?: string;
  confirmacaoAgendamento?: boolean; lembrete24h?: boolean; lembrete1h?: boolean;
  cancelamentos?: boolean; prescricoes?: boolean;
}
export async function fetchPreferenciasNotificacao(): Promise<PreferenciasNotificacao | null> {
  // Notification preferences are managed locally; backend only handles device tokens
  return null;
}
export async function savePreferenciasNotificacao(_data: PreferenciasNotificacao): Promise<void> {
  // No-op: backend does not have a preferences endpoint; preferences are local-only
}
export interface PushTokenPayload {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
  userAgent?: string;
  platform?: string;
}
export async function registerPushToken(data: PushTokenPayload): Promise<void> {
  // Backend expects { token, platform } for FCM device tokens
  await api.post('/notificacoes/device-token', {
    token: data.endpoint,
    platform: data.platform || 'web-pwa',
  });
}

// ============ PERFIL ============
export interface SavePerfilRequest {
  nome?: string;
  telefone?: string;
  senhaAtual?: string;
  novaSenha?: string;
}
export interface PerfilResponse {
  id: string;
  nome: string;
  email: string;
  tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN';
  telefone?: string;
}
export async function savePerfil(data: SavePerfilRequest): Promise<PerfilResponse> {
  // Password change uses a separate endpoint
  if (data.senhaAtual && data.novaSenha) {
    await api.put('/usuarios/me/senha', { senhaAtual: data.senhaAtual, novaSenha: data.novaSenha });
  }
  // Profile update (nome/email)
  const res = await api.put('/usuarios/me', { nome: data.nome });
  return { ...res.data, telefone: data.telefone };
}

// ============ SALDO / GANHOS ============
export interface SaldoMedico {
  saldo_a_liberar: number; saldo_pendente: number; ganhos_hoje: number;
  proximo_repasse: string; ganhos_semana: number[];
}
export interface ConsultaRepasse { id: string; paciente: string; horario: string; valor: number; status: 'pendente' | 'confirmado'; }
export interface Repasse {
  id: string; periodo: string; valor: number; status: 'concluido' | 'erro' | 'pendente';
  data_repasse: string; chave_pix_destino?: string; consultas?: ConsultaRepasse[]; comprovante_url?: string;
}
export async function fetchSaldoMedico(): Promise<SaldoMedico> {
  const raw = (await api.get('/medicos/me/saldo')).data;
  // Backend returns camelCase + Centavos; normalize to the shape pages expect
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
  // Backend wraps in { repasses: [...], resumo: {...} }
  const list = raw.repasses ?? raw ?? [];
  return list.map((r: any) => ({
    id: r.id,
    periodo: r.cicloRepasse?.semanaInicio ? `${new Date(r.cicloRepasse.semanaInicio).toLocaleDateString('pt-BR')} - ${new Date(r.cicloRepasse.semanaFim).toLocaleDateString('pt-BR')}` : '',
    valor: (r.valorRepasse ?? 0) / 100,
    status: (r.status ?? 'PENDENTE').toLowerCase(),
    data_repasse: r.dataRepasse ?? r.criadoEm ?? '',
    chave_pix_destino: undefined,
    consultas: r.consulta ? [{
      id: r.consulta.id,
      paciente: r.consulta.paciente?.usuario?.nome ?? 'Paciente',
      horario: new Date(r.consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      valor: (r.valorRepasse ?? 0) / 100,
      status: r.status === 'PROCESSADO' ? 'confirmado' : 'pendente',
    }] : [],
  }));
}
export async function fetchRepasseById(id: string): Promise<Repasse> {
  const raw = (await api.get(`/medicos/me/ciclos-repasse/${id}`)).data;
  const repasses = raw.repasses ?? [];
  const totalValor = repasses.reduce((acc: number, r: any) => acc + (r.valorRepasse ?? 0), 0);
  return {
    id: raw.id,
    periodo: raw.semanaInicio ? `${new Date(raw.semanaInicio).toLocaleDateString('pt-BR')} - ${new Date(raw.semanaFim).toLocaleDateString('pt-BR')}` : '',
    valor: totalValor / 100,
    status: (raw.status ?? 'pendente').toLowerCase(),
    data_repasse: raw.semanaFim ?? '',
    chave_pix_destino: undefined,
    consultas: repasses.map((r: any) => ({
      id: r.consulta?.id ?? r.id,
      paciente: r.consulta?.paciente?.usuario?.nome ?? 'Paciente',
      horario: r.consulta?.data ? new Date(r.consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      valor: (r.valorRepasse ?? 0) / 100,
      status: r.status === 'PROCESSADO' ? 'confirmado' : 'pendente',
    })),
  };
}

export default api;
