import React, { useState, useEffect } from 'react';
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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!token) navigate('/esqueci-senha', { replace: true });
  }, [token, navigate]);

  async function handleReset() {
    setErrorMsg('');
    if (!senha || !confirmarSenha) { setErrorMsg('Preencha ambos os campos.'); return; }
    if (senha !== confirmarSenha) { setErrorMsg('As senhas não coincidem.'); return; }
    if (senha.length < 8) { setErrorMsg('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (!/[A-Z]/.test(senha)) { setErrorMsg('A senha deve conter pelo menos uma letra maiúscula.'); return; }
    if (!/[a-z]/.test(senha)) { setErrorMsg('A senha deve conter pelo menos uma letra minúscula.'); return; }
    if (!/[0-9]/.test(senha)) { setErrorMsg('A senha deve conter pelo menos um número.'); return; }
    if (!/[^A-Za-z0-9]/.test(senha)) { setErrorMsg('A senha deve conter pelo menos um caractere especial.'); return; }
    if (!token) { setErrorMsg('Token de recuperação não encontrado. Use o link enviado por email.'); return; }

    setLoading(true);
    try {
      await resetPasswordRequest(token, senha);
      setSuccessMsg('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
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
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mín. 8 chars, maiúsc., minúsc., número e especial" style={inputStyle} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Confirmar Senha</label>
          <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" style={inputStyle} />
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#FFEBEE', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '1px solid #EF9A9A' }}>
            <span style={{ fontSize: 14, color: '#C62828', fontWeight: 600 }} role="alert">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '1px solid #A5D6A7' }}>
            <span style={{ fontSize: 14, color: '#2E7D32', fontWeight: 600 }}>{successMsg}</span>
          </div>
        )}

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
