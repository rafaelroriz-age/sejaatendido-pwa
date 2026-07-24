import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import { Consulta, fetchConsultasMedico, fetchCrmStatus, updateConsultaMedico } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import { formatConsultaDate, formatConsultaTime } from '../utils/datetime';
import { isConsultaAceita, isConsultaConcluida, isConsultaPendente, podeEntrarNaConsulta } from '../constants/consultaStatus';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { Icon, IconName } from '../components/Icon';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmValidado, setCrmValidado] = useState<boolean | null>(null);
  const [statusAprovacao, setStatusAprovacao] = useState<'PENDENTE' | 'APROVADO' | 'REJEITADO' | null>(null);

  function mapStatusAprovacao(crm: any): 'PENDENTE' | 'APROVADO' | 'REJEITADO' {
    const explicitStatus = String(crm?.status ?? '').toUpperCase();
    if (explicitStatus.includes('REJEIT')) return 'REJEITADO';
    if (explicitStatus.includes('APROV') || explicitStatus.includes('ATIVO')) return 'APROVADO';
    if (explicitStatus.includes('PEND')) return 'PENDENTE';
    return crm?.crmCartaoValidado ? 'APROVADO' : 'PENDENTE';
  }

  async function loadConsultas() {
    try {
      setConsultas(await fetchConsultasMedico());
    } catch (error) {
      showErrorAlert(error, 'Erro ao carregar consultas do médico');
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [userData, consultasData] = await Promise.all([getUser(), fetchConsultasMedico()]);
        setUser(userData);
        setConsultas(consultasData);
        // Fetch CRM status independently (don't block main load on failure)
        fetchCrmStatus()
          .then(s => {
            setCrmValidado(s.crmCartaoValidado);
            setStatusAprovacao(mapStatusAprovacao(s));
          })
          .catch(() => {
            const fallback = userData?.crmCartaoValidado ?? null;
            setCrmValidado(fallback);
            setStatusAprovacao(fallback ? 'APROVADO' : 'PENDENTE');
          });
      } catch (error) {
        showErrorAlert(error, 'Erro ao carregar consultas do médico');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleLogout() {
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  async function handleUpdateConsulta(id: string, acao: 'ACEITA' | 'RECUSADA' | 'CONCLUIDA') {
    try {
      await updateConsultaMedico(id, acao);
      // Atualização otimista para feedback imediato...
      setConsultas(prev => prev.map(c => c.id === id ? { ...c, status: acao } : c));
      // ...seguida de um refetch, pois ao aceitar (ACEITA) o backend gera
      // automaticamente o meetLink (sala Jitsi) quando o médico não informa um
      // manualmente — esse dado só existe depois da ação, não no patch otimista.
      void loadConsultas();
    } catch (error) {
      showErrorAlert(error, 'Erro ao atualizar consulta');
    }
  }

  function handleIniciarConsulta(c: Consulta) {
    if (podeEntrarNaConsulta(c) && c.meetLink) {
      window.open(c.meetLink, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/chat?consultaId=${c.id}`);
    }
  }

  function toYmd(dateIso: string) {
    const d = new Date(dateIso);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  function formatDate(dateIso: string | undefined) {
    return formatConsultaDate(dateIso);
  }

  function formatHour(dateIso: string | undefined) {
    return formatConsultaTime(dateIso);
  }

  function getPatientName(c: Consulta) {
    const anyConsulta = c as any;
    return anyConsulta.paciente?.nome || anyConsulta.pacienteNome || anyConsulta.nomePaciente || 'Paciente';
  }

  const stats = {
    hoje: consultas.filter(c => { const d = c.dataHora ?? c.data; return d ? toYmd(d) === toYmd(new Date().toISOString()) : false; }).length,
    pendentes: consultas.filter(c => isConsultaPendente(c.status)).length,
    confirmadas: consultas.filter(c => isConsultaAceita(c.status)).length,
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}><div className="spinner--primary spinner" /></div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${Colors.doctor}, #26A69A)`,
        padding: '28px 20px 20px', borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>Ola, Dr(a).</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: -0.3, marginTop: 2 }}>{user?.nome || 'Medico'}</div>
          </div>
          <button onClick={handleLogout} style={{
            backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md,
            padding: `${Space.sm}px ${Space.lg}px`, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>Sair</button>
        </div>

        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: Radius.full, backgroundColor: statusAprovacao === 'APROVADO' ? Colors.successLight : statusAprovacao === 'REJEITADO' ? Colors.errorLight : Colors.warningLight }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusAprovacao === 'APROVADO' ? Colors.success : statusAprovacao === 'REJEITADO' ? Colors.error : Colors.warning }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: statusAprovacao === 'APROVADO' ? Colors.success : statusAprovacao === 'REJEITADO' ? Colors.error : Colors.warning }}>
            Status: {statusAprovacao ?? 'PENDENTE'}
          </span>
        </div>
      </div>

      {(statusAprovacao === 'PENDENTE' || crmValidado === false) && (
        <div
          onClick={() => navigate('/crm-validation')}
          style={{
            margin: '12px 20px 0',
            backgroundColor: '#FFF3CD',
            border: '1px solid #FFC107',
            borderRadius: Radius.md,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <Icon name="alert-triangle" size={20} color="#856404" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#856404' }}>CRM não validado</div>
            <div style={{ fontSize: 12, color: '#856404', marginTop: 2 }}>Valide sua carteirinha para receber pacientes. Toque aqui.</div>
          </div>
          <span style={{ fontSize: 18, color: '#856404' }}>›</span>
        </div>
      )}

      {statusAprovacao === 'REJEITADO' && (
        <div style={{ margin: '12px 20px 0', backgroundColor: Colors.errorLight, border: `1px solid ${Colors.error}`, borderRadius: Radius.md, padding: '12px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Colors.error }}>Seu CRM foi rejeitado</div>
          <div style={{ fontSize: 12, color: Colors.error, marginTop: 4 }}>Revise seus dados e envie uma nova validação.</div>
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: Space.xl }}>
          {[
            { n: stats.hoje, l: 'Hoje', bg: Colors.doctorLight, icon: 'calendar' as IconName, color: Colors.doctor },
            { n: stats.pendentes, l: 'Pendentes', bg: Colors.warningLight, icon: 'clock' as IconName, color: Colors.warning },
            { n: stats.confirmadas, l: 'Confirmadas', bg: Colors.successLight, icon: 'check-circle' as IconName, color: Colors.success },
          ].map(s => (
            <Card key={s.l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><Icon name={s.icon} size={18} color={s.color} /></div>
              <div style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary }}>{s.n}</div>
              <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600, marginTop: 2 }}>{s.l}</div>
            </Card>
          ))}
        </div>

        <h3 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md + 2, letterSpacing: -0.3 }}>Próximas Consultas</h3>
        {consultas.map(c => (
          <Card key={c.id} style={{ marginBottom: Space.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Space.md }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Avatar name={getPatientName(c)} size={42} color={Colors.doctor} />
                <div style={{ marginLeft: Space.md }}>
                  <div style={{ fontSize: Font.sm + 1, fontWeight: 700, color: Colors.textPrimary }}>{getPatientName(c)}</div>
                  <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{c.sintomas ?? c.motivo}</div>
                </div>
              </div>
              <Badge status={c.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: Space.md }}>
              <span style={{ backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '6px 10px', fontSize: Font.xs + 1, fontWeight: 700, color: Colors.textPrimary, marginRight: Space.md }}>{formatHour(c.dataHora ?? c.data)}</span>
              <span style={{ fontSize: Font.xs + 1, color: Colors.textSecondary }}>{formatDate(c.dataHora ?? c.data)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(() => {
                const isPending = isConsultaPendente(c.status);
                const isActive = isConsultaAceita(c.status);
                const isConcluded = isConsultaConcluida(c.status);
                return (
                  <>
                    {!isConcluded && (
                      <button
                        onClick={() => handleIniciarConsulta(c)}
                        style={{ flex: 1, backgroundColor: Colors.doctor, borderRadius: Radius.md, padding: 12, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isActive ? 'Entrar na Consulta' : 'Ver Consulta'}
                      </button>
                    )}
                    {isPending && (
                      <>
                        <button onClick={() => handleUpdateConsulta(c.id, 'ACEITA')} style={{ flex: 1, backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.success, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
                        <button onClick={() => handleUpdateConsulta(c.id, 'RECUSADA')} style={{ flex: 1, backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.error, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Recusar</button>
                      </>
                    )}
                    {isActive && (
                      <button
                        onClick={() => handleUpdateConsulta(c.id, 'CONCLUIDA')}
                        style={{ flex: 1, backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.success, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Finalizar
                      </button>
                    )}
                    {isConcluded && (
                      <div style={{ flex: 1, backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="check-circle" size={16} color={Colors.success} />
                        <span style={{ color: Colors.success, fontSize: 14, fontWeight: 700 }}>Concluída</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        ))}

        <h3 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md + 2, letterSpacing: -0.3 }}>Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { l: 'Agenda', icon: 'calendar' as IconName, color: Colors.doctor, bg: Colors.doctorLight, path: '/doctor/schedule' },
            { l: 'Mensagens', icon: 'message-circle' as IconName, color: Colors.primary, bg: Colors.accent, path: '/chat' },
            { l: 'Ganhos', icon: 'dollar-sign' as IconName, color: Colors.success, bg: Colors.successLight, path: '/earnings' },
            { l: 'Conta', icon: 'landmark' as IconName, color: Colors.info, bg: '#E3F2FD', path: '/bank-details' },
            { l: 'Perfil', icon: 'user' as IconName, color: Colors.warning, bg: Colors.warningLight, path: '/profile' },
          ].map(a => (
            <div key={a.l} onClick={() => a.path && navigate(a.path)}
              style={{ flex: '1 1 80px', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.lg, textAlign: 'center', cursor: a.path ? 'pointer' : 'default', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><Icon name={a.icon} size={20} color={a.color} /></div>
              <div style={{ fontSize: 12, fontWeight: 700, color: Colors.textPrimary }}>{a.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
