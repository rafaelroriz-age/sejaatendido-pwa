import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import { fetchMedicosPendentes, aprovarMedico, recusarMedico, Medico } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendentes, setPendentes] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [userData, medicosData] = await Promise.all([getUser(), fetchMedicosPendentes()]);
      setUser(userData);
      setPendentes(medicosData);
    } catch (error) {
      showErrorAlert(error, 'Erro ao carregar painel admin');
    } finally { setLoading(false); }
  }

  async function handleAprovar(id: string) {
    setActionLoading(id);
    try { await aprovarMedico(id); setPendentes(p => p.filter(m => m.id !== id)); window.alert('Médico aprovado com sucesso!'); }
    catch (error) { showErrorAlert(error, 'Erro ao aprovar médico'); }
    finally { setActionLoading(null); }
  }

  async function handleRecusar(id: string) {
    if (!window.confirm('Tem certeza que deseja recusar este médico?')) return;
    setActionLoading(id);
    try {
      await recusarMedico(id);
      setPendentes(p => p.filter(m => m.id !== id));
      window.alert('Médico recusado com sucesso.');
    }
    catch (error) { showErrorAlert(error, 'Erro ao recusar médico'); }
    finally { setActionLoading(null); }
  }

  async function handleLogout() {
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}><div className="spinner--primary spinner" /></div>;

  const stats = [
    { label: 'Pendentes', value: pendentes.length, icon: '⏳', bg: Colors.warningLight },
    { label: 'Médicos', value: 24, icon: '🩺', bg: Colors.doctorLight },
    { label: 'Pacientes', value: 156, icon: '👥', bg: Colors.accent },
    { label: 'Consultas', value: 89, icon: '📋', bg: Colors.successLight },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${Colors.admin}, #9C7CFF)`,
        padding: '28px 20px 20px', borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>Painel Admin</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: -0.3, marginTop: 2 }}>{user?.nome || 'Administrador'}</div>
          </div>
          <button onClick={handleLogout} style={{
            backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md,
            padding: `${Space.sm}px ${Space.lg}px`, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>Sair</button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <button onClick={loadData} style={{
          width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 12,
          border: `1px solid ${Colors.border}`, color: Colors.textPrimary, fontWeight: 700,
          cursor: 'pointer', marginBottom: 12,
        }}>Atualizar dados</button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: Space.xl }}>
          {stats.map(s => (
            <Card key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary }}>{s.value}</div>
              <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        <h3 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md + 2, letterSpacing: -0.3 }}>Médicos Pendentes</h3>

        {pendentes.length === 0 ? (
          <EmptyState title="Nenhum pendente" subtitle="Nenhum medico pendente de aprovacao" />
        ) : pendentes.map(medico => (
          <Card key={medico.id} style={{ marginBottom: Space.md }}>
            <div style={{ display: 'flex', marginBottom: Space.md + 2 }}>
              <Avatar name={medico.usuario.nome} size={48} color={Colors.admin} />
              <div style={{ flex: 1, marginLeft: Space.md + 2 }}>
                <div style={{ fontSize: Font.md, fontWeight: 700, color: Colors.textPrimary }}>{medico.usuario.nome}</div>
                <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{medico.usuario.email}</div>
                <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2, fontWeight: 600 }}>CRM: {medico.crm}</div>
                {medico.especialidades?.length > 0 && <div style={{ fontSize: Font.xs, color: Colors.admin, marginTop: Space.xs, fontWeight: 600 }}>{medico.especialidades.join(', ')}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {actionLoading === medico.id ? (
                <div style={{ flex: 1, textAlign: 'center', padding: 12 }}><div className="spinner--primary spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <>
                  <button onClick={() => handleAprovar(medico.id)} style={{ flex: 1, backgroundColor: Colors.success, borderRadius: Radius.md, padding: 12, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Aprovar</button>
                  <button onClick={() => handleRecusar(medico.id)} style={{ flex: 1, backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.error, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Recusar</button>
                </>
              )}
            </div>
          </Card>
        ))}

        <h3 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md + 2, letterSpacing: -0.3 }}>Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { l: 'Gerenciar Usuarios', icon: '👥', bg: Colors.adminLight },
            { l: 'Relatorios', icon: '📊', bg: Colors.warningLight },
            { l: 'Configuracoes', icon: '⚙️', bg: Colors.accent, path: '/profile' },
          ].map(a => (
            <div key={a.l} onClick={() => a.path && navigate(a.path)}
              style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.lg, textAlign: 'center', cursor: a.path ? 'pointer' : 'default', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 20 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textPrimary }}>{a.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
