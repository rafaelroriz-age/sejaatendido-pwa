import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, saveUser, User } from '../storage/localStorage';
import { fetchMedicoPerfil, savePerfil, updateMedicoPerfil } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import BalanceCard from '../components/BalanceCard';

function formatCentavosToBrlInput(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '';
  return (value / 100).toFixed(2).replace('.', ',');
}

function parseBrlInputToCentavos(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [valorConsultaInput, setValorConsultaInput] = useState('');

  function applyCpfMask(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const u = await getUser();
        setUser(u);
        if (u) {
          setNome(u.nome);
          setEmail(u.email);
          setTelefone(u.telefone ?? '');
          if (u.cpf) setCpf(applyCpfMask(u.cpf));

          if (u.tipo === 'MEDICO') {
            try {
              const medico = await fetchMedicoPerfil();
              setValorConsultaInput(formatCentavosToBrlInput(medico.valorConsulta));
            } catch {
              setValorConsultaInput('');
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSave() {
    setSaveMsg('');
    setSaveError('');
    if (!nome.trim()) {
      setSaveError('Informe seu nome.');
      return;
    }

    let valorConsultaCentavos: number | undefined;
    if (user?.tipo === 'MEDICO') {
      const parsed = parseBrlInputToCentavos(valorConsultaInput);
      if (parsed === null) {
        setSaveError('Informe um valor de consulta valido. Exemplo: 150,00');
        return;
      }
      valorConsultaCentavos = parsed;
    }

    setSaving(true);
    try {
      const updated = await savePerfil({ nome: nome.trim(), cpf: user?.tipo === 'PACIENTE' ? cpf.replace(/\D/g, '') || undefined : undefined, telefone: telefone.trim() || undefined });
      if (user?.tipo === 'MEDICO' && valorConsultaCentavos !== undefined) {
        await updateMedicoPerfil({ valorConsulta: valorConsultaCentavos });
      }
      const updatedUser: User = {
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        cpf: updated.cpf ?? user?.cpf,
        telefone: updated.telefone ?? user?.telefone,
        tipo: updated.tipo,
        crmCartaoValidado: user?.crmCartaoValidado,
        crmNumero: user?.crmNumero,
        crmUf: user?.crmUf,
      };
      await saveUser(updatedUser);
      setUser(updatedUser);
      setNome(updated.nome);
      setEmail(updated.email);
      setTelefone(updatedUser.telefone ?? '');
      setCpf(updatedUser.cpf ? applyCpfMask(updatedUser.cpf) : '');
      setEditing(false);
      setSaveMsg(user?.tipo === 'MEDICO' ? 'Perfil e valor da consulta atualizados com sucesso!' : 'Perfil atualizado com sucesso!');
      setTimeout(() => setSaveMsg(''), 3000);;
    } catch (error) {
      showErrorAlert(error, 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!window.confirm('Tem certeza que deseja sair?')) return;
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}><div className="spinner--primary spinner" /></div>;

  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: Space.lg, fontSize: Font.md, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none' };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${Colors.gradientStart}, ${Colors.gradientEnd})`,
        padding: '28px 16px 16px', borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800 }}>Meu Perfil</span>
        <button onClick={() => setEditing(!editing)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>{editing ? 'Cancelar' : 'Editar'}</button>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: Space.xl, marginTop: Space.sm }}>
          <Avatar name={nome || 'U'} size={96} color={Colors.primary} online style={{ margin: '0 auto' }} />
          <div style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.md, marginBottom: Space.sm }}>{nome}</div>
          <span style={{ backgroundColor: Colors.accent, padding: '6px 18px', borderRadius: Radius.full, color: Colors.primary, fontWeight: 700, fontSize: Font.xs + 1, textTransform: 'capitalize' }}>{user?.tipo || 'Usuário'}</span>
        </div>

        {user?.tipo === 'MEDICO' && <BalanceCard onClick={() => navigate('/earnings')} />}

        <Card style={{ marginBottom: Space.lg }}>
          <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.lg }}>Informações Pessoais</h4>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nome completo</label>
            <input value={nome} onChange={e => setNome(e.target.value)} disabled={!editing} style={{ ...inputStyle, color: editing ? Colors.textPrimary : Colors.textSecondary }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input value={email} disabled style={{ ...inputStyle, color: Colors.textSecondary }} />
            <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 6, display: 'block' }}>O email não pode ser alterado</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Telefone</label>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} disabled={!editing} placeholder="(00) 00000-0000" style={{ ...inputStyle, color: editing ? Colors.textPrimary : Colors.textSecondary }} />
          </div>
          {user?.tipo === 'PACIENTE' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>CPF</label>
              <input
                value={cpf}
                onChange={e => setCpf(applyCpfMask(e.target.value))}
                disabled={!editing}
                placeholder="000.000.000-00"
                style={{ ...inputStyle, color: editing ? Colors.textPrimary : Colors.textSecondary }}
              />
              {!editing && !cpf && (
                <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 6, display: 'block' }}>CPF não cadastrado</span>
              )}
            </div>
          )}
          {user?.tipo === 'MEDICO' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Valor da consulta (R$)</label>
              <input
                value={valorConsultaInput}
                onChange={e => setValorConsultaInput(e.target.value)}
                disabled={!editing}
                placeholder="Ex: 150,00"
                inputMode="decimal"
                style={{ ...inputStyle, color: editing ? Colors.textPrimary : Colors.textSecondary }}
              />
              <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 6, display: 'block' }}>
                Esse valor sera usado no agendamento e no pagamento das consultas.
              </span>
            </div>
          )}
          {editing && (
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', backgroundColor: Colors.success, borderRadius: Radius.md, padding: Space.lg, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, boxShadow: `0 6px 12px ${Colors.success}59` }}>{saving ? 'Salvando...' : 'Salvar Alterações'}</button>
          )}
          {saveMsg && <p style={{ fontSize: 14, color: Colors.success, fontWeight: 700, marginTop: 12 }}>{saveMsg}</p>}
          {saveError && <p style={{ fontSize: 14, color: Colors.error, marginTop: 12 }} role="alert">{saveError}</p>}
        </Card>

        <Card style={{ marginBottom: Space.lg }}>
          <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.lg }}>Segurança</h4>
          {['Alterar Senha', 'Autenticação em 2 Fatores'].map(item => (
            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${Colors.borderLight}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 15, color: Colors.textPrimary, fontWeight: 500 }}>{item}</span>
              <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
            </div>
          ))}
        </Card>

        {user?.tipo === 'MEDICO' && (
          <Card style={{ marginBottom: Space.lg }}>
            <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.lg }}>Carteirinha CRM</h4>
            <div
              onClick={() => navigate('/crm-validation')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18, fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: user?.crmCartaoValidado ? Colors.successLight : Colors.warningLight,
                }}>
                  {user?.crmCartaoValidado ? '✅' : '⏳'}
                </div>
                <div>
                  <div style={{ fontSize: 15, color: Colors.textPrimary, fontWeight: 600 }}>
                    {user?.crmCartaoValidado ? 'CRM Validado' : 'Validar Carteirinha CRM'}
                  </div>
                  {(user?.crmNumero || user?.crmUf) && (
                    <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>
                      {[user?.crmNumero, user?.crmUf].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
            </div>
          </Card>
        )}

        {user?.tipo === 'MEDICO' && (
          <Card style={{ marginBottom: Space.lg }}>
            <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.lg }}>Financeiro</h4>
            <div onClick={() => navigate('/earnings')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${Colors.borderLight}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 15, color: Colors.textPrimary, fontWeight: 500 }}>Meus Ganhos</span>
              <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
            </div>
            <div onClick={() => navigate('/bank-details')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer' }}>
              <span style={{ fontSize: 15, color: Colors.textPrimary, fontWeight: 500 }}>Dados para Recebimento</span>
              <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
            </div>
          </Card>
        )}

        <Card style={{ marginBottom: Space.lg }}>
          <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.lg }}>Preferências</h4>
          {[
            { l: 'Notificações', path: '/notifications' },
            { l: 'Tema do App' },
            { l: 'Idioma' },
          ].map((item, i) => (
            <div key={item.l} onClick={() => item.path && navigate(item.path)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 2 ? `1px solid ${Colors.borderLight}` : 'none', cursor: item.path ? 'pointer' : 'default' }}
            >
              <span style={{ fontSize: 15, color: Colors.textPrimary, fontWeight: 500 }}>{item.l}</span>
              <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
            </div>
          ))}
        </Card>

        <button onClick={handleLogout} style={{
          width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Space.lg,
          border: `2px solid ${Colors.error}`, color: Colors.error, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', marginBottom: Space.md, boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}>Sair da Conta</button>
        <p style={{ textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: 32 }}>Seja Atendido v2.0.0</p>
      </div>
    </div>
  );
}
