import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cancelConsulta, fetchMinhasConsultas, Consulta, fetchPerfil, sendFrontendTelemetryEvent, testarNotificacaoWhatsapp } from '../services/api';
import { clearAuthSession, getUser } from '../storage/localStorage';
import { handleApiError } from '../utils/errorHandler';
import { formatConsultaDateTime } from '../utils/datetime';
import { isConsultaCancelada, isConsultaConcluida, isConsultaRecusada, podeEntrarNaConsulta } from '../constants/consultaStatus';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

// Intervalo de polling do Dashboard: cobre tanto a transição PENDENTE -> ACEITA
// (quando o médico aceita e o meetLink passa a existir) quanto o atraso esperado
// do cron de auto-conclusão (roda a cada ~10min no backend).
const CONSULTAS_POLL_INTERVAL_MS = 30000;

type DashboardNavigationState = {
  bookingConfirmed?: boolean;
  paymentSuccess?: boolean;
  consultaId?: string;
} | null;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as DashboardNavigationState) ?? null;
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [userName, setUserName] = useState('');
  const [infoMessage] = useState<string | null>(
    navState?.bookingConfirmed
      ? 'Consulta agendada com sucesso! O pagamento é liberado automaticamente assim que a consulta é concluída (pode levar alguns minutos após o horário marcado).'
      : null,
  );
  // Payment.tsx só redireciona para cá após confirmar PAGO via API — usamos esse
  // sinal para esconder o botão "Pagar consulta" de imediato, sem esperar o
  // backend refletir o pagamento no proximo fetch de consultas.
  const [locallyPaidIds, setLocallyPaidIds] = useState<Set<string>>(() =>
    navState?.paymentSuccess && navState.consultaId ? new Set([navState.consultaId]) : new Set(),
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Limpa o state de navegação para não repetir o banner/flag num refresh futuro.
    if (navState && typeof window !== 'undefined') {
      window.history.replaceState({}, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    loadUserName();

    // Polling silencioso: detecta PENDENTE -> ACEITA (meetLink passa a existir)
    // e a conclusão automática (com atraso, já que o cron não é instantâneo)
    // sem depender de o usuário dar refresh manual na página.
    pollRef.current = setInterval(() => loadData({ silent: true }), CONSULTAS_POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadUserName() {
    const user = await getUser();
    if (user) setUserName(user.nome.split(' ')[0]);
  }

  async function loadData(options?: { silent?: boolean }) {
    try {
      if (!options?.silent) setLoadError(null);
      const data = await fetchMinhasConsultas();
      setConsultas(data);
      if (options?.silent) setLoadError(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Paciente profile not yet created — treat as empty list, not a hard error.
        setConsultas([]);
      } else if (!options?.silent) {
        setLoadError(handleApiError(error));
      }
      // Em polling silencioso, evita substituir os dados já exibidos por um erro passageiro.
    } finally { setLoading(false); }
  }

  // Regra do backend: um pagamento só pode ser criado quando a consulta está
  // CONCLUIDA (o cron marca isso ~10min após o horário, cobrindo tanto consultas
  // ACEITA quanto PENDENTE). Antes disso, a API responde 400/403 — então o botão
  // "Pagar consulta" não deve aparecer para nenhum outro status.
  function canPayConsulta(consulta: Consulta): boolean {
    if (!isConsultaConcluida(consulta.status)) return false;
    if (locallyPaidIds.has(consulta.id)) return false;
    // Se o backend já embutir o status do pagamento na consulta, respeita-o.
    const pagamentoStatus = (consulta.pagamentoStatus ?? '').toUpperCase();
    if (pagamentoStatus === 'PAGO') return false;
    return true;
  }

  // Consulta cujo horário já passou mas o cron de conclusão ainda não rodou —
  // usado apenas para exibir uma mensagem de "aguarde alguns minutos", nunca
  // para liberar o pagamento no frontend.
  function isAwaitingConclusion(consulta: Consulta): boolean {
    if (isConsultaConcluida(consulta.status) || isConsultaCancelada(consulta.status) || isConsultaRecusada(consulta.status)) return false;
    const scheduled = consulta.dataHora ?? consulta.data;
    if (!scheduled) return false;
    const scheduledTs = new Date(scheduled).getTime();
    return !Number.isNaN(scheduledTs) && scheduledTs <= Date.now();
  }

  function canCancel(status: string) {
    if (isConsultaCancelada(status) || isConsultaRecusada(status) || isConsultaConcluida(status)) return false;
    const n = (status ?? '').toLowerCase();
    if (n.includes('cancel') || n.includes('recus')) return false;
    if (n.includes('conclu') || n.includes('finaliz')) return false;
    return true;
  }

  function classifyCancelFailure(error: unknown) {
    if (!axios.isAxiosError(error)) return 'unknown';
    const status = error.response?.status;
    const message = String((error.response?.data as any)?.message ?? (error.response?.data as any)?.erro ?? '').toLowerCase();

    if (status === 403 || message.includes('sem permissao') || message.includes('não tem permissão')) return 'sem_permissao';
    if (status === 409 || message.includes('ja cancel') || message.includes('já cancel')) return 'consulta_ja_cancelada';
    if (status === 422 || message.includes('24h') || message.includes('24 horas')) return 'regra_24h';
    if (status === 400 && (message.includes('conclu') || message.includes('finaliz'))) return 'consulta_concluida';
    return `http_${status ?? 'erro'}`;
  }

  async function handleCancelConsulta(id: string) {
    if (!window.confirm('Deseja realmente cancelar esta consulta?')) return;
    setCancelingId(id);
    void sendFrontendTelemetryEvent('consulta_cancel_attempt', { consultaId: id });
    try {
      await cancelConsulta(id);
      setConsultas(prev => prev.filter(c => c.id !== id));
      void sendFrontendTelemetryEvent('consulta_cancel_success', { consultaId: id });
      window.alert('Consulta cancelada com sucesso.');
    } catch (error) {
      void sendFrontendTelemetryEvent('consulta_cancel_failure', {
        consultaId: id,
        reason: classifyCancelFailure(error),
      });
      window.alert(`Erro ao cancelar consulta\n${handleApiError(error)}`);
    } finally {
      setCancelingId(null);
    }
  }

  async function handleLogout() {
    if (!window.confirm('Tem certeza que deseja sair?')) return;
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  async function handleTestarWhatsapp() {
    setTestingWhatsapp(true);
    try {
      const profile = await fetchPerfil().catch(() => null);
      const profilePhone = profile?.telefone?.replace(/\D/g, '') ?? '';

      if (profilePhone.length < 10) {
        window.alert('Não foi possível testar o WhatsApp porque o telefone do seu perfil está ausente ou inválido. Atualize seu perfil e tente novamente.');
        return;
      }

      const res = await testarNotificacaoWhatsapp(profilePhone);
      if (res.ok) {
        window.alert(res.mensagem || `Mensagem de teste enviada para o telefone do perfil ${profilePhone}.`);
      } else {
        window.alert(res.mensagem || 'Não foi possível enviar a mensagem de teste agora. Tente novamente em instantes.');
      }
    } catch (error) {
      const rawMessage = handleApiError(error);
      const normalized = rawMessage.toLowerCase();

      if (normalized.includes('401') || normalized.includes('unauthorized') || normalized.includes('token')) {
        window.alert('Falha ao testar WhatsApp. Sua sessão expirou ou o token está inválido. Faça login novamente e tente de novo.');
      } else {
        window.alert(`Falha ao testar WhatsApp.\n${rawMessage}\n\nSe o erro persistir, o problema provavelmente está na integração SALVY do backend, no número cadastrado ou no endpoint canônico de envio.`);
      }
    } finally {
      setTestingWhatsapp(false);
    }
  }

  function formatDate(dateString: string | undefined) {
    return formatConsultaDateTime(dateString);
  }

  const upcoming = consultas.filter(c => { const s = c.status.toLowerCase(); return !s.includes('cancel') && !s.includes('conclu') && !s.includes('finaliz'); });
  const pendentes = consultas.filter(c => canPayConsulta(c)).length;

  const actions = [
    { label: 'Agendar\nConsulta', icon: 'calendar' as IconName, color: Colors.primary, bg: Colors.accent, path: '/book' },
    { label: 'Meu\nPerfil', icon: 'user' as IconName, color: Colors.admin, bg: Colors.adminLight, path: '/profile' },
    { label: 'Chat', icon: 'message-circle' as IconName, color: Colors.info, bg: Colors.infoLight, path: '/chat' },
    { label: testingWhatsapp ? 'Enviando...' : 'Testar\nWhatsApp', icon: 'send' as IconName, color: Colors.success, bg: Colors.successLight, onClick: handleTestarWhatsapp },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${Colors.gradientStart}, ${Colors.gradientEnd})`,
        padding: '28px 20px 20px', borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: Space.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Space.md }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>SA</span>
            </div>
            <div>
              <div style={{ fontSize: Font.lg, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Olá, {userName}!</div>
              <div style={{ fontSize: Font.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Bem-vindo de volta</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            backgroundColor: 'rgba(255,255,255,0.2)', padding: `${Space.sm}px ${Space.lg}px`,
            borderRadius: Radius.full, color: '#fff', fontWeight: 700, fontSize: Font.xs, border: 'none', cursor: 'pointer',
          }}>Sair</button>
        </div>

        <div style={{
          display: 'flex', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radius.lg,
          padding: Space.md, alignItems: 'center',
        }}>
          {[{ v: consultas.length, l: 'Consultas' }, { v: upcoming.length, l: 'Agendadas' }, { v: pendentes, l: 'Pendentes', warn: pendentes > 0 }].map((m, i) => (
            <React.Fragment key={m.l}>
              {i > 0 && <div style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' }} />}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: Font.xl, fontWeight: 800, color: m.warn ? Colors.warning : '#fff' }}>{m.v}</div>
                <div style={{ fontSize: Font.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: 600 }}>{m.l}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        <h3 style={{ fontSize: Font.lg - 2, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md, letterSpacing: -0.3 }}>Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: Space.xl }}>
          {actions.map(a => (
            <div key={a.path ?? a.label} onClick={() => (a as any).onClick ? (a as any).onClick() : navigate((a as any).path)}
              style={{
                flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
                padding: '18px 8px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                opacity: testingWhatsapp && (a as any).onClick ? 0.7 : 1,
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Icon name={a.icon} size={24} color={a.color} /></div>
              <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600, lineHeight: '16px', whiteSpace: 'pre-line' }}>{a.label}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: Font.lg - 2, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md, letterSpacing: -0.3 }}>Próximas Consultas</h3>

        {infoMessage && (
          <div style={{ backgroundColor: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: Radius.md, padding: `${Space.sm}px ${Space.lg}px`, marginBottom: Space.md, fontSize: Font.sm, color: '#0D47A1' }}>
            {infoMessage}
          </div>
        )}

        {loadError && (
          <div style={{ backgroundColor: Colors.errorLight, border: `1px solid ${Colors.error}`, borderRadius: Radius.md, padding: `${Space.sm}px ${Space.lg}px`, marginBottom: Space.md, fontSize: Font.sm, color: Colors.error }}>
            {loadError}
          </div>
        )}

        {loading ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></> : consultas.length === 0 ? (
          <EmptyState title="Nenhuma consulta" subtitle="Você ainda não tem consultas agendadas. Agende sua primeira consulta agora." actionLabel="Agendar agora" onAction={() => navigate('/book')} />
        ) : consultas.map(c => (
          <Card key={c.id} style={{ marginBottom: Space.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: Space.md }}>
              <Avatar name={c.medico?.usuario?.nome || 'M'} size={44} color={Colors.doctor} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: Font.md, fontWeight: 700, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.medico?.usuario?.nome || 'Médico'}</div>
                <div style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sintomas ?? c.motivo}</div>
              </div>
              <Badge status={c.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: Space.md, paddingTop: Space.md, borderTop: `1px solid ${Colors.borderLight}` }}>
              <span style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: 600 }}>{formatDate(c.dataHora ?? c.data)}</span>
            </div>
            {isAwaitingConclusion(c) && (
              <div style={{ backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: '10px 12px', marginTop: Space.md, fontSize: Font.xs, color: Colors.warning, fontWeight: 600 }}>
                Aguardando a confirmação de que a consulta foi concluída. O pagamento é liberado automaticamente em alguns minutos.
              </div>
            )}
            {canPayConsulta(c) && (
              <button onClick={() => navigate('/payment', { state: { consultaId: c.id, valor: typeof c.valor === 'number' ? c.valor : undefined } })} style={{
                width: '100%', backgroundColor: Colors.success, padding: 14, borderRadius: Radius.md,
                marginTop: Space.md, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}>Pagar consulta</button>
            )}
            {c.meetLink && podeEntrarNaConsulta(c) && (
              <button onClick={() => window.open(c.meetLink, '_blank', 'noopener,noreferrer')} style={{
                width: '100%', backgroundColor: Colors.accent, padding: 14, borderRadius: Radius.md,
                marginTop: Space.md, border: 'none', color: Colors.primary, fontWeight: 700, cursor: 'pointer',
              }}>Entrar na consulta</button>
            )}
            {canCancel(c.status) && (
              <button
                onClick={() => handleCancelConsulta(c.id)}
                disabled={cancelingId === c.id}
                style={{
                  width: '100%', backgroundColor: Colors.errorLight, padding: 14, borderRadius: Radius.md,
                  marginTop: Space.md, border: `1px solid ${Colors.error}`, color: Colors.error,
                  fontWeight: 700, cursor: cancelingId === c.id ? 'not-allowed' : 'pointer', opacity: cancelingId === c.id ? 0.6 : 1,
                }}
              >
                {cancelingId === c.id ? 'Cancelando...' : 'Cancelar consulta'}
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
