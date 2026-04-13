import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelConsulta, fetchMinhasConsultas, Consulta } from '../services/api';
import { clearAuthSession, getUser } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => { loadData(); loadUserName(); }, []);

  async function loadUserName() {
    const user = await getUser();
    if (user) setUserName(user.nome.split(' ')[0]);
  }

  async function loadData() {
    try { setConsultas(await fetchMinhasConsultas()); }
    catch (error) { showErrorAlert(error, 'Erro ao carregar consultas'); }
    finally { setLoading(false); }
  }

  function isPendingPayment(status: string) {
    const n = (status ?? '').toLowerCase();
    return n.includes('pend') || n.includes('aguard') || n.includes('waiting') || n.includes('unpaid');
  }

  function canCancel(status: string) {
    const n = (status ?? '').toLowerCase();
    if (n.includes('cancel')) return false;
    if (n.includes('conclu') || n.includes('finaliz')) return false;
    return true;
  }

  async function handleCancelConsulta(id: string) {
    if (!window.confirm('Deseja realmente cancelar esta consulta?')) return;
    setCancelingId(id);
    try {
      await cancelConsulta(id);
      setConsultas(prev => prev.filter(c => c.id !== id));
      window.alert('Consulta cancelada com sucesso.');
    } catch (error) {
      showErrorAlert(error, 'Erro ao cancelar consulta');
    } finally {
      setCancelingId(null);
    }
  }

  async function handleLogout() {
    if (!window.confirm('Tem certeza que deseja sair?')) return;
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const upcoming = consultas.filter(c => { const s = c.status.toLowerCase(); return !s.includes('cancel') && !s.includes('conclu') && !s.includes('finaliz'); });
  const pendentes = consultas.filter(c => isPendingPayment(c.status)).length;

  const actions = [
    { label: 'Agendar\nConsulta', icon: '+', bg: Colors.accent, path: '/book' },
    { label: 'Meu\nPerfil', icon: '👤', bg: Colors.adminLight, path: '/profile' },
    { label: 'Chat', icon: '💬', bg: Colors.infoLight, path: '/chat' },
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
            <div key={a.path} onClick={() => navigate(a.path)}
              style={{
                flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
                padding: '18px 8px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 24 }}>{a.icon}</div>
              <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600, lineHeight: '16px', whiteSpace: 'pre-line' }}>{a.label}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: Font.lg - 2, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md, letterSpacing: -0.3 }}>Próximas Consultas</h3>

        {loading ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></> : consultas.length === 0 ? (
          <EmptyState title="Nenhuma consulta" subtitle="Você ainda não tem consultas agendadas. Agende sua primeira consulta agora." actionLabel="Agendar agora" onAction={() => navigate('/book')} />
        ) : consultas.map(c => (
          <Card key={c.id} style={{ marginBottom: Space.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: Space.md }}>
              <Avatar name={c.medico?.usuario?.nome || 'M'} size={44} color={Colors.doctor} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: Font.md, fontWeight: 700, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.medico?.usuario?.nome || 'Médico'}</div>
                <div style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.motivo}</div>
              </div>
              <Badge status={c.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: Space.md, paddingTop: Space.md, borderTop: `1px solid ${Colors.borderLight}` }}>
              <span style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: 600 }}>{formatDate(c.data)}</span>
            </div>
            {isPendingPayment(c.status) && (
              <button onClick={() => navigate('/payment', { state: { consultaId: c.id, valor: 150 } })} style={{
                width: '100%', backgroundColor: Colors.success, padding: 14, borderRadius: Radius.md,
                marginTop: Space.md, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}>Pagar consulta</button>
            )}
            {c.meetLink && (
              <button onClick={() => window.open(c.meetLink, '_blank')} style={{
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
