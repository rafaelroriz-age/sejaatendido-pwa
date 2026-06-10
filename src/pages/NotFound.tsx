import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FRONTEND_URL } from '../config/api';
import { sendFrontend404Telemetry } from '../services/api';
import Colors, { Font, Radius, Space } from '../theme/colors';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  const route = location.pathname + location.search + location.hash;
  const host = typeof window !== 'undefined' ? window.location.host : '';
  let expectedHost: string | undefined;
  if (FRONTEND_URL) {
    try {
      expectedHost = new URL(FRONTEND_URL).host;
    } catch {
      expectedHost = undefined;
    }
  }

  useEffect(() => {
    const payload = {
      route,
      host,
      expectedHost,
      userAgent: navigator.userAgent,
      occurredAt: new Date().toISOString(),
    };

    console.error('[404] Rota não encontrada', payload);
    try {
      window.localStorage.setItem('@last404Telemetry', JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }

    sendFrontend404Telemetry(payload).catch(() => {
      // do not block fallback page
    });
  }, [route, host, expectedHost]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 560, backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: 0, fontSize: Font.xl, color: Colors.textPrimary }}>404 - Página não encontrada</h1>
        <p style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 12, marginBottom: 0 }}>
          A rota solicitada não existe neste ambiente.
        </p>

        <div style={{ marginTop: Space.lg, backgroundColor: Colors.inputBg, borderRadius: Radius.md, border: `1px solid ${Colors.border}`, padding: Space.md }}>
          <div style={{ fontSize: Font.sm, color: Colors.textSecondary }}>Rota solicitada:</div>
          <div style={{ marginTop: 4, fontWeight: 700, color: Colors.textPrimary, wordBreak: 'break-all' }}>{route}</div>
          <div style={{ marginTop: 10, fontSize: Font.sm, color: Colors.textSecondary }}>Host atual:</div>
          <div style={{ marginTop: 4, fontWeight: 700, color: Colors.textPrimary, wordBreak: 'break-all' }}>{host || 'indisponível'}</div>
          {expectedHost && (
            <>
              <div style={{ marginTop: 10, fontSize: Font.sm, color: Colors.textSecondary }}>Host esperado:</div>
              <div style={{ marginTop: 4, fontWeight: 700, color: Colors.textPrimary, wordBreak: 'break-all' }}>{expectedHost}</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: Space.lg }}>
          <button
            onClick={() => navigate('/')}
            style={{ flex: 1, border: 'none', borderRadius: Radius.md, padding: Space.md, backgroundColor: Colors.primary, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Ir para início
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{ flex: 1, border: `1px solid ${Colors.border}`, borderRadius: Radius.md, padding: Space.md, backgroundColor: Colors.inputBg, color: Colors.textPrimary, fontWeight: 700, cursor: 'pointer' }}
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
}
