import React from 'react';
import { useNavigate } from 'react-router-dom';
import Colors, { Font, Space, Radius } from '../theme/colors';
import { LEGAL_EFFECTIVE_DATE, LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '../config/legal';

const sectionStyle: React.CSSProperties = {
  backgroundColor: Colors.card,
  borderRadius: Radius.xl,
  padding: Space.xl,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  marginBottom: Space.md,
};

export default function TermsConditions() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Termos e Condicoes de Uso',
      description: `Versao ${LEGAL_TERMS_VERSION} - Regras de uso da plataforma e responsabilidades.`,
      path: '/termos-de-uso',
    },
    {
      title: 'Politica de Privacidade',
      description: `Versao ${LEGAL_PRIVACY_VERSION} - Tratamento de dados pessoais e direitos do titular.`,
      path: '/politica-de-privacidade',
    },
    {
      title: 'LGPD (Base Legal e RoPA)',
      description: 'Mapa de operacoes de dados, bases legais e governanca de privacidade.',
      path: '/lgpd',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Termos e Privacidade</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
        <div style={sectionStyle}>
          <h1 style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8 }}>Termos, Privacidade e LGPD</h1>
          <p style={{ color: Colors.textSecondary, fontSize: Font.sm, lineHeight: '24px' }}>
            Consulte os documentos legais oficiais utilizados no cadastro da plataforma.
          </p>
          <p style={{ color: Colors.textMuted, fontSize: Font.xs + 1, marginTop: 8 }}>
            Data de vigencia atual: {LEGAL_EFFECTIVE_DATE}
          </p>
        </div>

        {cards.map(card => (
          <div key={card.path} style={{ ...sectionStyle, cursor: 'pointer' }} onClick={() => navigate(card.path)}>
            <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>{card.title}</h2>
            <p style={{ color: Colors.textSecondary, lineHeight: '24px', marginBottom: 12 }}>{card.description}</p>
            <span style={{ color: Colors.primary, fontSize: Font.sm, fontWeight: 700 }}>Abrir documento</span>
          </div>
        ))}
      </div>
    </div>
  );
}