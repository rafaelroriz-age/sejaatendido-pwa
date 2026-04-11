import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import BalanceCard from '../components/BalanceCard';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    getUser().then(u => {
      setUser(u);
      if (u) { setNome(u.nome); setEmail(u.email); }
    }).finally(() => setLoading(false));
  }, []);

  function handleSave() { window.alert('Perfil atualizado com sucesso!'); setEditing(false); }

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
          {editing && (
            <button onClick={handleSave} style={{ width: '100%', backgroundColor: Colors.success, borderRadius: Radius.md, padding: Space.lg, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 6px 12px ${Colors.success}59` }}>Salvar Alterações</button>
          )}
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
