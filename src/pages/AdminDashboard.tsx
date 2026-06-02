import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import {
  fetchAdminDashboard,
  fetchMedicosPendentes,
  fetchAdminMedicos,
  aprovarMedico,
  rejeitarMedico,
  fetchAdminConsultas,
  fetchAdminUsuarios,
  deleteAdminUsuario,
  AdminDashboardStats,
  AdminMedico,
  AdminUsuario,
  Consulta,
} from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';

type Tab = 'pendentes' | 'medicos' | 'consultas' | 'usuarios';

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase();
  let bg: string = Colors.warningLight, color: string = Colors.warning, label = status ?? '—';
  if (s === 'APROVADO' || s === 'ATIVO') { bg = Colors.successLight; color = Colors.success; label = 'Aprovado'; }
  else if (s === 'PENDENTE') { bg = Colors.warningLight; color = Colors.warning; label = 'Pendente'; }
  else if (s === 'REJEITADO' || s === 'RECUSADO') { bg = Colors.errorLight; color = Colors.error; label = 'Rejeitado'; }
  else if (s.includes('CONFIRM') || s.includes('ACEITA')) { bg = Colors.successLight; color = Colors.success; label = 'Confirmada'; }
  else if (s.includes('CANCEL')) { bg = Colors.errorLight; color = Colors.error; label = 'Cancelada'; }
  else if (s.includes('CONCLU') || s.includes('FINALIZ')) { bg = Colors.infoLight; color = Colors.info; label = 'Concluída'; }
  return (
    <span style={{ backgroundColor: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: Radius.full }}>
      {label}
    </span>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('pendentes');

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [pendentes, setPendentes] = useState<AdminMedico[]>([]);
  const [medicos, setMedicos] = useState<AdminMedico[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [userData, statsData, pendentesData] = await Promise.all([
          getUser(),
          fetchAdminDashboard().catch(() => null),
          fetchMedicosPendentes().catch(() => []),
        ]);
        setUser(userData);
        if (statsData) setStats(statsData);
        setPendentes(pendentesData);
      } catch (error) {
        showErrorAlert(error, 'Erro ao carregar painel admin');
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, []);

  const loadTab = useCallback(async (t: Tab) => {
    setLoadingTab(true);
    try {
      if (t === 'pendentes') setPendentes(await fetchMedicosPendentes());
      else if (t === 'medicos') setMedicos(await fetchAdminMedicos());
      else if (t === 'consultas') setConsultas(await fetchAdminConsultas());
      else if (t === 'usuarios') setUsuarios(await fetchAdminUsuarios());
    } catch (error) {
      showErrorAlert(error, 'Erro ao carregar dados');
    } finally {
      setLoadingTab(false);
    }
  }, []);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  async function handleLogout() {
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  async function handleAprovar(id: string) {
    if (!window.confirm('Aprovar este médico? Um email será enviado automaticamente.')) return;
    setActionId(id);
    try {
      await aprovarMedico(id);
      setPendentes(p => p.filter(m => m.id !== id));
      if (stats) setStats({ ...stats, medicosPendentes: Math.max(0, stats.medicosPendentes - 1), medicosAprovados: stats.medicosAprovados + 1 });
      window.alert('Médico aprovado! Email enviado ao médico.');
    } catch (error) {
      showErrorAlert(error, 'Erro ao aprovar médico');
    } finally { setActionId(null); }
  }

  async function handleRejeitar(id: string) {
    const motivo = window.prompt('Informe o motivo da rejeição:');
    if (!motivo || !motivo.trim()) { window.alert('Informe o motivo da rejeição.'); return; }
    setActionId(id);
    try {
      await rejeitarMedico(id, motivo.trim());
      setPendentes(p => p.filter(m => m.id !== id));
      if (stats) setStats({ ...stats, medicosPendentes: Math.max(0, stats.medicosPendentes - 1) });
      window.alert('Médico rejeitado.');
    } catch (error) {
      showErrorAlert(error, 'Erro ao rejeitar médico');
    } finally { setActionId(null); }
  }

  async function handleDeleteUsuario(id: string, nome: string) {
    if (!window.confirm(`Deletar "${nome}" e todos os dados vinculados?\n\nEsta ação é irreversível.`)) return;
    setActionId(id);
    try {
      await deleteAdminUsuario(id);
      setUsuarios(u => u.filter(x => x.id !== id));
      window.alert('Usuário deletado com sucesso.');
    } catch (error) {
      showErrorAlert(error, 'Erro ao deletar usuário');
    } finally { setActionId(null); }
  }

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  if (loadingInit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}>
        <div className="spinner--primary spinner" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: stats?.medicosPendentes ?? pendentes.length },
    { key: 'medicos', label: 'Médicos' },
    { key: 'consultas', label: 'Consultas' },
    { key: 'usuarios', label: 'Usuários' },
  ];

  const statCards = stats ? [
    { label: 'Usuários', value: stats.totalUsuarios, icon: '👥', bg: Colors.accent },
    { label: 'Médicos', value: stats.totalMedicos, icon: '🩺', bg: Colors.doctorLight },
    { label: 'Aprovados', value: stats.medicosAprovados, icon: '✅', bg: Colors.successLight },
    { label: 'Pendentes', value: stats.medicosPendentes, icon: '⏳', bg: Colors.warningLight },
    { label: 'Consultas', value: stats.totalConsultas, icon: '📋', bg: Colors.infoLight },
    { label: 'Receita', value: `R$${Math.floor((stats.receitaTotal ?? 0) / 100)}`, icon: '💰', bg: Colors.successLight },
  ] : [];

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

      <div style={{ padding: '20px 16px' }}>
        {statCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: Space.xl }}>
            {statCards.map(s => (
              <Card key={s.label} style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary }}>{s.value}</div>
                <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600 }}>{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: 4, marginBottom: Space.lg, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: '0 0 auto', padding: `${Space.sm}px ${Space.md}px`, borderRadius: Radius.sm,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: Font.xs + 1, fontWeight: 700,
              backgroundColor: tab === t.key ? Colors.admin : 'transparent',
              color: tab === t.key ? '#fff' : Colors.textSecondary,
              boxShadow: tab === t.key ? `0 2px 6px ${Colors.admin}66` : 'none',
            }}>
              {t.label}{t.count !== undefined && t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {loadingTab ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            {tab === 'pendentes' && (
              pendentes.length === 0
                ? <EmptyState title="Nenhum pendente" subtitle="Nenhum médico aguardando aprovação" />
                : pendentes.map(m => (
                  <Card key={m.id} style={{ marginBottom: Space.md }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: Space.md }}>
                      <Avatar name={m.usuario.nome} size={48} color={Colors.admin} />
                      <div style={{ flex: 1, marginLeft: Space.md }}>
                        <div style={{ fontSize: Font.md, fontWeight: 700, color: Colors.textPrimary }}>{m.usuario.nome}</div>
                        <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{m.usuario.email}</div>
                        {m.cpf && <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>CPF: {m.cpf}</div>}
                        {m.crm && <div style={{ fontSize: Font.xs + 1, color: Colors.admin, marginTop: 2, fontWeight: 700 }}>CRM: {m.crm}</div>}
                        {m.especialidades && m.especialidades.length > 0 && (
                          <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>{m.especialidades.join(', ')}</div>
                        )}
                      </div>
                      <StatusBadge status={m.status ?? 'PENDENTE'} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {actionId === m.id ? (
                        <div style={{ flex: 1, textAlign: 'center', padding: 12 }}><div className="spinner--primary spinner" style={{ margin: '0 auto' }} /></div>
                      ) : (
                        <>
                          <button onClick={() => handleAprovar(m.id)} style={{ flex: 1, backgroundColor: Colors.success, borderRadius: Radius.md, padding: 12, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✓ Aprovar</button>
                          <button onClick={() => handleRejeitar(m.id)} style={{ flex: 1, backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.error, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Rejeitar</button>
                        </>
                      )}
                    </div>
                  </Card>
                ))
            )}

            {tab === 'medicos' && (
              medicos.length === 0
                ? <EmptyState title="Nenhum médico" subtitle="Nenhum médico cadastrado ainda" />
                : medicos.map(m => (
                  <Card key={m.id} style={{ marginBottom: Space.md }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar name={m.usuario.nome} size={44} color={Colors.doctor} />
                      <div style={{ flex: 1, marginLeft: Space.md }}>
                        <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary }}>{m.usuario.nome}</div>
                        <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{m.usuario.email}</div>
                        {m.crm && <div style={{ fontSize: Font.xs, color: Colors.doctor, marginTop: 2, fontWeight: 600 }}>CRM: {m.crm}</div>}
                        {m.cpf && <div style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 }}>CPF: {m.cpf}</div>}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  </Card>
                ))
            )}

            {tab === 'consultas' && (
              consultas.length === 0
                ? <EmptyState title="Nenhuma consulta" subtitle="Nenhuma consulta no sistema" />
                : consultas.map(c => {
                  const anyC = c as any;
                  const pacNome = anyC.paciente?.usuario?.nome || anyC.pacienteNome || 'Paciente';
                  const medNome = anyC.medico?.usuario?.nome || anyC.medicoNome || 'Médico';
                  return (
                    <Card key={c.id} style={{ marginBottom: Space.md }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary }}>{pacNome}</div>
                          <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>Dr. {medNome}</div>
                          <div style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 }}>{formatDateTime(c.data)}</div>
                          {c.motivo && <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>{c.motivo}</div>}
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    </Card>
                  );
                })
            )}

            {tab === 'usuarios' && (
              usuarios.length === 0
                ? <EmptyState title="Nenhum usuário" subtitle="Nenhum usuário cadastrado" />
                : usuarios.map(u => (
                  <Card key={u.id} style={{ marginBottom: Space.md }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar name={u.nome} size={40} color={u.tipo === 'MEDICO' ? Colors.doctor : u.tipo === 'ADMIN' ? Colors.admin : Colors.primary} />
                      <div style={{ flex: 1, marginLeft: Space.md }}>
                        <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary }}>{u.nome}</div>
                        <div style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: 2 }}>{u.email}</div>
                        <div style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 }}>
                          {u.tipo}{u.criadoEm ? ` · ${formatDate(u.criadoEm)}` : ''}
                        </div>
                      </div>
                      {u.tipo !== 'ADMIN' && (
                        <button
                          disabled={actionId === u.id}
                          onClick={() => handleDeleteUsuario(u.id, u.nome)}
                          style={{ backgroundColor: Colors.errorLight, border: 'none', borderRadius: Radius.sm, padding: '6px 12px', color: Colors.error, fontSize: 12, fontWeight: 700, cursor: actionId === u.id ? 'not-allowed' : 'pointer', opacity: actionId === u.id ? 0.5 : 1 }}>
                          {actionId === u.id ? '...' : 'Deletar'}
                        </button>
                      )}
                    </div>
                  </Card>
                ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
