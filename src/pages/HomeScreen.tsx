import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuthSession, User } from '../storage/localStorage';
import Colors from '../theme/colors';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { getUser().then(setUser); }, []);

  async function handleLogout() {
    await clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 20px 20px', borderRadius: '0 0 24px 24px', textAlign: 'center' }}>
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Seja Atendido</span>
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
          Bem-vindo{user?.nome ? `, ${user.nome}` : ''}!
        </h1>
        <p style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 36 }}>
          Selecione uma opção para continuar
        </p>

        <div onClick={() => navigate('/dashboard')} style={{
          backgroundColor: Colors.card, borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center',
          marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <span style={{ fontSize: 28, marginRight: 16 }}>📋</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: Colors.textPrimary }}>Minhas Consultas</span>
        </div>

        <div onClick={() => navigate('/profile')} style={{
          backgroundColor: Colors.card, borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center',
          marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <span style={{ fontSize: 28, marginRight: 16 }}>👤</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: Colors.textPrimary }}>Meu Perfil</span>
        </div>

        <button onClick={handleLogout} style={{
          marginTop: 24, backgroundColor: Colors.card, borderRadius: 14, padding: 16,
          textAlign: 'center', border: `2px solid ${Colors.error}`, cursor: 'pointer', width: '100%',
        }}>
          <span style={{ color: Colors.error, fontSize: 16, fontWeight: 700 }}>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}
