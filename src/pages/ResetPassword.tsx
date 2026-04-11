import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors from '../theme/colors';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!senha || !confirmarSenha) { window.alert('Preencha ambos os campos'); return; }
    if (senha !== confirmarSenha) { window.alert('As senhas não coincidem'); return; }
    if (senha.length < 6) { window.alert('A senha deve ter pelo menos 6 caracteres'); return; }

    setLoading(true);
    try {
      await resetPasswordRequest(token, senha);
      window.alert('Senha redefinida com sucesso!');
      navigate('/login', { replace: true });
    } catch (error) { showErrorAlert(error, 'Erro ao redefinir senha'); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: Colors.inputBg, borderRadius: 14, padding: 16, fontSize: 16, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 32, width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accent, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 32 }}>🔒</div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>Nova Senha</h2>
        <p style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 28 }}>Crie uma nova senha para sua conta</p>

        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Nova Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Confirmar Senha</label>
          <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" style={inputStyle} />
        </div>

        <button onClick={handleReset} disabled={loading} style={{
          width: '100%', backgroundColor: Colors.primary, borderRadius: 14, padding: 16, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 6px 12px ${Colors.primary}59`,
        }}>
          {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Redefinir Senha</span>}
        </button>

        <button onClick={() => navigate('/login', { replace: true })} style={{ background: 'none', border: 'none', marginTop: 16, padding: 8, cursor: 'pointer' }}>
          <span style={{ color: Colors.primary, fontSize: 15, fontWeight: 600 }}>Voltar para Login</span>
        </button>
      </div>
    </div>
  );
}
