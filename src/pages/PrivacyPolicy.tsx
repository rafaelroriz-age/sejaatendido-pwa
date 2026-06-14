import React from 'react';
import { useNavigate } from 'react-router-dom';
import Colors, { Font, Radius, Space } from '../theme/colors';
import { LEGAL_CONTROLLER, LEGAL_EFFECTIVE_DATE, LEGAL_PRIVACY_VERSION } from '../config/legal';

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

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Politica de Privacidade</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, maxWidth: 940, margin: '0 auto' }}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: 8, color: Colors.textPrimary, fontSize: Font.xl, fontWeight: 800 }}>Politica de Privacidade - SejaAtendido</h1>
          <p style={{ ...paragraphStyle, marginBottom: 4 }}><strong>Versao:</strong> {LEGAL_PRIVACY_VERSION}</p>
          <p style={{ ...paragraphStyle, marginBottom: Space.md }}><strong>Data de vigencia:</strong> {LEGAL_EFFECTIVE_DATE}</p>

          <div style={{ marginTop: Space.xl }}>
            <Section title="1. Quem controla seus dados">
              <p style={paragraphStyle}><strong>Controlador:</strong> {LEGAL_CONTROLLER.razaoSocial}</p>
              <p style={paragraphStyle}><strong>CNPJ:</strong> {LEGAL_CONTROLLER.cnpj}</p>
              <p style={paragraphStyle}><strong>Endereco:</strong> {LEGAL_CONTROLLER.endereco}</p>
              <p style={paragraphStyle}><strong>Contato de privacidade:</strong> {LEGAL_CONTROLLER.contatoPrivacidade}</p>
              <p style={paragraphStyle}><strong>Encarregado/DPO:</strong> {LEGAL_CONTROLLER.dpo}</p>
            </Section>

            <Section title="2. Quais dados tratamos">
              <p style={paragraphStyle}>Dados cadastrais: nome, email, telefone e tipo de conta.</p>
              <p style={paragraphStyle}>Dados de autenticacao e seguranca: senha com hash, tokens, sessao e logs.</p>
              <p style={paragraphStyle}>Dados operacionais: agendamentos, status de consulta e notificacoes.</p>
              <p style={paragraphStyle}>Dados financeiros operacionais: identificadores de pagamento e repasse.</p>
              <p style={paragraphStyle}>Dados tecnicos: IP, dispositivo e metadados necessarios para seguranca e funcionamento.</p>
            </Section>

            <Section title="3. Finalidades do tratamento">
              <p style={paragraphStyle}>Criar e manter contas.</p>
              <p style={paragraphStyle}>Autenticar usuarios e proteger acessos.</p>
              <p style={paragraphStyle}>Executar agendamentos e fluxo de atendimento.</p>
              <p style={paragraphStyle}>Processar pagamentos e repasses.</p>
              <p style={paragraphStyle}>Enviar comunicacoes transacionais por email, push e WhatsApp.</p>
              <p style={paragraphStyle}>Prevenir fraude, abuso e incidentes de seguranca.</p>
              <p style={paragraphStyle}>Cumprir obrigacoes legais e regulatorias.</p>
            </Section>

            <Section title="4. Bases legais (LGPD)">
              <p style={paragraphStyle}>Execucao de contrato.</p>
              <p style={paragraphStyle}>Cumprimento de obrigacao legal e regulatoria.</p>
              <p style={paragraphStyle}>Exercicio regular de direitos.</p>
              <p style={paragraphStyle}>Legitimo interesse com salvaguardas proporcionais.</p>
              <p style={paragraphStyle}>Consentimento, quando aplicavel.</p>
            </Section>

            <Section title="5. Compartilhamento de dados">
              <p style={paragraphStyle}>Com provedores de infraestrutura e banco de dados.</p>
              <p style={paragraphStyle}>Com provedores de pagamento.</p>
              <p style={paragraphStyle}>Com provedores de autenticacao e comunicacao.</p>
              <p style={paragraphStyle}>Com autoridades publicas, quando houver obrigacao legal.</p>
            </Section>

            <Section title="6. Retencao e descarte">
              <p style={paragraphStyle}>Os dados sao mantidos pelo periodo necessario para cumprir finalidades legitimas, obrigacoes legais e defesa de direitos.</p>
              <p style={paragraphStyle}>Apos o prazo aplicavel, ocorre descarte seguro ou anonimizacao.</p>
            </Section>

            <Section title="7. Seguranca da informacao">
              <p style={paragraphStyle}>Adotamos medidas tecnicas e organizacionais para proteger dados pessoais.</p>
              <p style={paragraphStyle}>Acesso interno e restrito por necessidade.</p>
              <p style={paragraphStyle}>Eventos criticos possuem rastreabilidade e monitoramento.</p>
            </Section>

            <Section title="8. Direitos do titular">
              <p style={paragraphStyle}>Confirmacao de tratamento.</p>
              <p style={paragraphStyle}>Acesso e correcao de dados.</p>
              <p style={paragraphStyle}>Anonimizacao, bloqueio ou eliminacao quando aplicavel.</p>
              <p style={paragraphStyle}>Portabilidade quando cabivel.</p>
              <p style={paragraphStyle}>Informacao sobre compartilhamento.</p>
              <p style={paragraphStyle}>Revogacao de consentimento nos casos aplicaveis.</p>
              <p style={{ ...paragraphStyle, marginTop: 6 }}><strong>Canal de atendimento ao titular:</strong> {LEGAL_CONTROLLER.canalTitular}</p>
              <p style={paragraphStyle}><strong>Prazo de resposta:</strong> {LEGAL_CONTROLLER.prazoResposta}</p>
            </Section>

            <Section title="9. Transferencia internacional">
              <p style={paragraphStyle}>Quando houver uso de fornecedores fora do Brasil, adotamos salvaguardas contratuais e tecnicas adequadas.</p>
            </Section>

            <Section title="10. Atualizacoes desta politica">
              <p style={paragraphStyle}>Podemos atualizar esta politica para refletir mudancas legais, regulatorias e operacionais.</p>
              <p style={paragraphStyle}>A versao vigente estara sempre disponivel na plataforma.</p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
