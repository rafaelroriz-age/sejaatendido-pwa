import React from 'react';
import { useNavigate } from 'react-router-dom';
import Colors, { Font, Radius, Space } from '../theme/colors';

const cardStyle: React.CSSProperties = {
  backgroundColor: Colors.card,
  borderRadius: Radius.xl,
  padding: Space.xl,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
};

const paragraphStyle: React.CSSProperties = {
  color: Colors.textSecondary,
  fontSize: Font.sm,
  lineHeight: '24px',
  margin: 0,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: Space.lg }}>
      <h2 style={{ marginTop: 0, marginBottom: Space.sm, color: Colors.textPrimary, fontSize: Font.lg, fontWeight: 800 }}>{title}</h2>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </section>
  );
}

export default function Lgpd() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>LGPD</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, maxWidth: 940, margin: '0 auto' }}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: 8, color: Colors.textPrimary, fontSize: Font.xl, fontWeight: 800 }}>LGPD - Base Legal e Registro de Operacoes (RoPA)</h1>
          <p style={{ ...paragraphStyle, marginBottom: Space.lg }}>
            Esta pagina resume as bases legais e o mapa de operacoes de dados pessoais usados no SejaAtendido.
          </p>

          <Section title="Bases legais aplicadas">
            <p style={paragraphStyle}><strong>Execucao de contrato:</strong> cadastro, autenticacao, agendamento, atendimento, pagamento e repasse.</p>
            <p style={paragraphStyle}><strong>Obrigacao legal/regulatoria:</strong> registros exigidos por lei e cooperacao com autoridades.</p>
            <p style={paragraphStyle}><strong>Exercicio regular de direitos:</strong> prevencao e resposta a disputas, auditorias e defesa judicial/administrativa.</p>
            <p style={paragraphStyle}><strong>Legitimo interesse:</strong> seguranca, prevencao de fraude e melhoria operacional com salvaguardas.</p>
            <p style={paragraphStyle}><strong>Consentimento:</strong> quando requerido para finalidades especificas e destacadas.</p>
          </Section>

          <Section title="RoPA resumido (operacoes de tratamento)">
            <p style={paragraphStyle}><strong>Cadastro:</strong> coleta de identificacao e contato para criacao da conta.</p>
            <p style={paragraphStyle}><strong>Autenticacao e seguranca:</strong> tokens, logs tecnicos e rastros de sessao para protecao da plataforma.</p>
            <p style={paragraphStyle}><strong>Agenda e consultas:</strong> dados necessarios para operacionalizar agendamentos e atendimento.</p>
            <p style={paragraphStyle}><strong>Pagamentos e repasses:</strong> IDs operacionais financeiros e conciliacao de transacoes.</p>
            <p style={paragraphStyle}><strong>Comunicacoes transacionais:</strong> envio de notificacoes de operacao, sem finalidade publicitaria indevida.</p>
          </Section>

          <Section title="Direitos do titular e governanca">
            <p style={paragraphStyle}>Atendimento a solicitacoes de acesso, correcao e demais direitos previstos na LGPD.</p>
            <p style={paragraphStyle}>Controles de acesso interno por necessidade, trilha de auditoria e monitoramento de eventos criticos.</p>
            <p style={paragraphStyle}>Revisao periodica de riscos de privacidade e atualizacao de salvaguardas tecnicas/organizacionais.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
