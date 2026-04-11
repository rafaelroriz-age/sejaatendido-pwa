import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Card from '../components/Card';

interface DemoConsulta { id: string; paciente: string; data: string; hora: string; status: string; motivo: string; }

const DEMO: DemoConsulta[] = [
  { id: '1', paciente: 'Maria Santos', data: '2025-01-20', hora: '09:00', status: 'CONFIRMADA', motivo: 'Check-up anual' },
  { id: '2', paciente: 'João Oliveira', data: '2025-01-20', hora: '10:30', status: 'PENDENTE', motivo: 'Dor de cabeça recorrente' },
  { id: '3', paciente: 'Ana Costa', data: '2025-01-21', hora: '14:00', status: 'CONFIRMADA', motivo: 'Retorno' },
  { id: '4', paciente: 'Carlos Pereira', data: '2025-01-22', hora: '08:30', status: 'PENDENTE', motivo: 'Consulta inicial' },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const consultas = DEMO;

  useEffect(() => { getUser().then(setUser); }, []);

  async function handleLogout() {
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  const stats = {
    hoje: consultas.filter(c => c.data === '2025-01-20').length,
    pendentes: consultas.filter(c => c.status === 'PENDENTE').length,
    confirmadas: consultas.filter(c => c.status === 'CONFIRMADA').length,
  };

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
      </div>

      <div style={{ padding: 20 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: Space.xl }}>
          {[
            { n: stats.hoje, l: 'Hoje', bg: Colors.doctorLight, icon: '📅' },
            { n: stats.pendentes, l: 'Pendentes', bg: Colors.warningLight, icon: '⏳' },
            { n: stats.confirmadas, l: 'Confirmadas', bg: Colors.successLight, icon: '✓' },
          ].map(s => (
            <Card key={s.l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 18 }}>{s.icon}</div>
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
                <Avatar name={c.paciente} size={42} color={Colors.doctor} />
                <div style={{ marginLeft: Space.md }}>
                  <div style={{ fontSize: Font.sm + 1, fontWeight: 700, color: Colors.textPrimary }}>{c.paciente}</div>
                  <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{c.motivo}</div>
                </div>
              </div>
              <Badge status={c.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: Space.md }}>
              <span style={{ backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '6px 10px', fontSize: Font.xs + 1, fontWeight: 700, color: Colors.textPrimary, marginRight: Space.md }}>{c.hora}</span>
              <span style={{ fontSize: Font.xs + 1, color: Colors.textSecondary }}>{c.data}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, backgroundColor: Colors.doctor, borderRadius: Radius.md, padding: 12, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Iniciar Consulta</button>
              {c.status === 'PENDENTE' && (
                <button style={{ flex: 1, backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.success, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
              )}
            </div>
          </Card>
        ))}

        <h3 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md + 2, letterSpacing: -0.3 }}>Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { l: 'Prontuarios', icon: '📋', bg: Colors.doctorLight },
            { l: 'Mensagens', icon: '💬', bg: Colors.accent, path: '/chat' },
            { l: 'Perfil', icon: '👤', bg: Colors.warningLight, path: '/profile' },
          ].map(a => (
            <div key={a.l} onClick={() => a.path && navigate(a.path)}
              style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.lg, textAlign: 'center', cursor: a.path ? 'pointer' : 'default', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 20 }}>{a.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: Colors.textPrimary }}>{a.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
