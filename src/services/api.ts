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
          `${API_URL}/auth/refresh`,
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
export interface RegisterRequest { nome: string; email: string; senha: string; tipo: 'PACIENTE' | 'MEDICO'; }
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  usuario: { id: string; nome: string; email: string; tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN'; };
}

export async function loginRequest(data: LoginRequest): Promise<AuthResponse> {
  const r = await api.post('/auth/login', data); return r.data;
}
export async function registerRequest(data: RegisterRequest): Promise<{ id: string }> {
  const r = await api.post('/auth/registro', data); return r.data;
}
export async function confirmEmailRequest(token: string): Promise<void> {
  try { await api.post('/auth/confirmar-email', { token }); }
  catch (error: any) {
    if (error?.response?.status === 404) { await api.post('/auth/confirm-email', { token }); return; }
    throw error;
  }
}
export async function resetPasswordRequest(token: string, senha: string): Promise<void> {
  const payload = { token, senha, novaSenha: senha, password: senha, newPassword: senha };
  try { await api.post('/auth/resetar-senha', payload); }
  catch (error: any) {
    if (error?.response?.status === 404) { await api.post('/auth/reset-password', payload); return; }
    throw error;
  }
}

// ============ MÉDICOS ============
export interface Medico {
  id: string; usuarioId: string; crm: string; especialidades: string[]; aprovado: boolean;
  usuario: { id: string; nome: string; email: string; };
}
export async function fetchMedicos(): Promise<Medico[]> { return (await api.get('/medicos')).data; }
export async function fetchMedicoById(id: string): Promise<Medico> { return (await api.get(`/medicos/${id}`)).data; }

// ============ CONSULTAS ============
export interface Consulta {
  id: string; medicoId: string; pacienteId: string; data: string; motivo: string; status: string;
  meetLink?: string; medico?: Medico;
}
export interface CreateConsultaRequest { medicoId: string; data: string; motivo: string; }
export async function fetchMinhasConsultas(): Promise<Consulta[]> { return (await api.get('/paciente/consultas')).data; }
export async function createConsulta(data: CreateConsultaRequest): Promise<Consulta> { return (await api.post('/paciente/consultas', data)).data; }
export async function cancelConsulta(id: string): Promise<void> { await api.delete(`/paciente/consultas/${id}`); }

// ============ ADMIN ============
export async function fetchMedicosPendentes(): Promise<Medico[]> { return (await api.get('/admin/medicos/pendentes')).data; }
export async function aprovarMedico(id: string): Promise<void> { await api.post(`/admin/medicos/${id}/aprovar`); }
export async function recusarMedico(id: string): Promise<void> { await api.post(`/admin/medicos/${id}/recusar`); }

// ============ PAGAMENTOS ============
export type MetodoPagamento = 'pix' | 'cartao' | 'card';
export interface CriarPagamentoRequest { consultaId: string; metodoPagamento?: MetodoPagamento; }
export interface PagamentoResponse {
  id: string; status?: string; qrCode?: string; qrCodeBase64?: string;
  copiaCola?: string; copiaECola?: string; linkPagamento?: string; paymentUrl?: string;
}
export async function criarPagamento(data: CriarPagamentoRequest): Promise<PagamentoResponse> { return (await api.post('/pagamentos', data)).data; }
export async function fetchPagamentoById(id: string): Promise<PagamentoResponse> { return (await api.get(`/pagamentos/${id}`)).data; }

// ============ DADOS BANCÁRIOS ============
export interface DadosBancarios { tipoChavePix?: string; chavePix?: string; banco?: string; agencia?: string; conta?: string; }
export async function fetchDadosBancarios(): Promise<DadosBancarios | null> { return (await api.get('/medico/dados-bancarios')).data; }
export async function saveDadosBancarios(data: DadosBancarios): Promise<void> { await api.put('/medico/dados-bancarios', data); }

// ============ PREFERÊNCIAS NOTIFICAÇÃO ============
export interface PreferenciasNotificacao {
  pushEnabled?: boolean; emailEnabled?: boolean; whatsappEnabled?: boolean; whatsappNumber?: string;
  confirmacaoAgendamento?: boolean; lembrete24h?: boolean; lembrete1h?: boolean;
  cancelamentos?: boolean; prescricoes?: boolean;
}
export async function fetchPreferenciasNotificacao(): Promise<PreferenciasNotificacao | null> { return (await api.get('/usuario/preferencias-notificacao')).data; }
export async function savePreferenciasNotificacao(data: PreferenciasNotificacao): Promise<void> { await api.put('/usuario/preferencias-notificacao', data); }

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
export async function fetchSaldoMedico(): Promise<SaldoMedico> { return (await api.get('/medico/saldo')).data; }
export async function fetchRepasses(): Promise<Repasse[]> { return (await api.get('/medico/repasses')).data; }
export async function fetchRepasseById(id: string): Promise<Repasse> { return (await api.get(`/medico/repasses/${id}`)).data; }

export default api;
