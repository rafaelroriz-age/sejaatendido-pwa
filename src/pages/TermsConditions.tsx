import React from 'react';
import { useNavigate } from 'react-router-dom';
import Colors, { Font, Space, Radius } from '../theme/colors';

const sectionStyle: React.CSSProperties = {
  backgroundColor: Colors.card,
  borderRadius: Radius.xl,
  padding: Space.xl,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  marginBottom: Space.md,
};

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Termos e Privacidade</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
        <div style={sectionStyle}>
          <h1 style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8 }}>Termos de Uso e Política de Privacidade</h1>
          <p style={{ color: Colors.textSecondary, fontSize: Font.sm, lineHeight: '24px' }}>
            Esta página resume os pontos essenciais para o uso do Seja Atendido. O texto completo final deve ser revisado pelo jurídico antes da publicação definitiva.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>1. Uso da plataforma</h2>
          <p style={{ color: Colors.textSecondary, lineHeight: '24px' }}>
            O app conecta pacientes e profissionais de saúde para agendamento, comunicação e pagamento de consultas. O usuário se compromete a fornecer informações verdadeiras e atualizar seus dados quando necessário.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>2. Dados pessoais</h2>
          <p style={{ color: Colors.textSecondary, lineHeight: '24px' }}>
            Dados de cadastro, agenda, consultas, pagamentos e notificações são usados para operar o serviço. O tratamento segue a LGPD e as políticas internas do projeto.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>3. Notificações</h2>
          <p style={{ color: Colors.textSecondary, lineHeight: '24px' }}>
            O usuário pode configurar Push, Email e WhatsApp, conforme a disponibilidade técnica da plataforma e da operação contratada.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>4. Pagamentos</h2>
          <p style={{ color: Colors.textSecondary, lineHeight: '24px' }}>
            O pagamento das consultas pode ocorrer por PIX ou cartão, de acordo com a configuração habilitada na plataforma e com os contratos de pagamento vigentes.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, marginBottom: 12 }}>5. Contato</h2>
          <p style={{ color: Colors.textSecondary, lineHeight: '24px' }}>
            Para revisar a versão final jurídica antes do go-live, use esta tela como base operacional e substitua pelas minutas oficiais aprovadas.
          </p>
        </div>
      </div>
    </div>
  );
}