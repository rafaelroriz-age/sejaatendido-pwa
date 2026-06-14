import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Colors, { Font, Radius, Space } from '../theme/colors';
import { LEGAL_CONTROLLER, LEGAL_EFFECTIVE_DATE, LEGAL_TERMS_VERSION } from '../config/legal';
import { sendFrontendTelemetryEvent } from '../services/api';

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

export default function TermsOfUse() {
  const navigate = useNavigate();

  useEffect(() => {
    void sendFrontendTelemetryEvent('legal_terms_view', { version: LEGAL_TERMS_VERSION });
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Termos e Condicoes</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, maxWidth: 940, margin: '0 auto' }}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: 8, color: Colors.textPrimary, fontSize: Font.xl, fontWeight: 800 }}>Termos e Condicoes de Uso - SejaAtendido</h1>
          <p style={{ ...paragraphStyle, marginBottom: 4 }}><strong>Versao:</strong> {LEGAL_TERMS_VERSION}</p>
          <p style={{ ...paragraphStyle, marginBottom: Space.md }}><strong>Data de vigencia:</strong> {LEGAL_EFFECTIVE_DATE}</p>
          <p style={paragraphStyle}>
            Ao criar conta e utilizar a plataforma SejaAtendido, voce declara que leu e concorda com estes Termos e Condicoes de Uso e com a Politica de Privacidade.
          </p>

          <div style={{ marginTop: Space.xl }}>
            <Section title="1. Partes">
              <p style={paragraphStyle}>Este termo regula a relacao entre {LEGAL_CONTROLLER.razaoSocial}, inscrita no CNPJ {LEGAL_CONTROLLER.cnpj}, com sede em {LEGAL_CONTROLLER.endereco}, e os usuarios da plataforma SejaAtendido, incluindo pacientes e profissionais de saude.</p>
            </Section>

            <Section title="2. Objeto">
              <p style={paragraphStyle}>A plataforma intermedeia o agendamento de consultas, a comunicacao entre usuarios, o processamento de pagamentos e os repasses financeiros ao profissional, conforme regras vigentes.</p>
            </Section>

            <Section title="3. Cadastro e seguranca de acesso">
              <p style={paragraphStyle}>O usuario deve fornecer dados verdadeiros, atualizados e completos.</p>
              <p style={paragraphStyle}>O usuario e responsavel pela guarda de senha, sessao e dispositivos.</p>
              <p style={paragraphStyle}>A plataforma podera suspender ou encerrar contas em caso de fraude, uso indevido, violacao legal ou risco a seguranca.</p>
            </Section>

            <Section title="4. Regras especificas para profissionais">
              <p style={paragraphStyle}>O profissional e responsavel pela veracidade dos dados cadastrais, profissionais e bancarios.</p>
              <p style={paragraphStyle}>A liberacao de funcionalidades pode depender de validacoes cadastrais e documentais.</p>
              <p style={paragraphStyle}>O profissional deve observar integralmente as normas eticas e regulatorias aplicaveis a sua atividade.</p>
            </Section>

            <Section title="5. Regras especificas para pacientes">
              <p style={paragraphStyle}>O paciente deve informar dados corretos para agendamento e atendimento.</p>
              <p style={paragraphStyle}>Cancelamentos e reagendamentos seguem as regras operacionais da plataforma e o prazo minimo aplicavel.</p>
            </Section>

            <Section title="6. Pagamentos, taxas e repasses">
              <p style={paragraphStyle}>Os pagamentos podem ser processados por provedores terceiros.</p>
              <p style={paragraphStyle}>Taxas da plataforma e regras de repasse seguem a politica comercial vigente no momento da contratacao.</p>
              <p style={paragraphStyle}>Prazos, fluxo e disponibilidade de repasse dependem de cadastro bancario valido e das regras dos provedores de pagamento.</p>
            </Section>

            <Section title="7. Limitacao de responsabilidade">
              <p style={paragraphStyle}>A plataforma atua como intermediadora tecnologica.</p>
              <p style={paragraphStyle}>A conduta clinica e as decisoes medicas sao de responsabilidade exclusiva do profissional.</p>
              <p style={paragraphStyle}>A plataforma adota boas praticas de disponibilidade e seguranca, sem garantia de operacao ininterrupta.</p>
            </Section>

            <Section title="8. Propriedade intelectual">
              <p style={paragraphStyle}>Marca, software, layout, conteudo e tecnologia da plataforma sao protegidos por lei.</p>
              <p style={paragraphStyle}>E vedado copiar, explorar, reproduzir, modificar ou realizar engenharia reversa sem autorizacao.</p>
            </Section>

            <Section title="9. Privacidade e dados pessoais">
              <p style={paragraphStyle}>O tratamento de dados pessoais segue a Politica de Privacidade e a legislacao aplicavel, incluindo a LGPD.</p>
              <p style={paragraphStyle}>Ao utilizar a plataforma, o usuario declara ciencia sobre as finalidades e bases legais de tratamento.</p>
            </Section>

            <Section title="10. Suspensao, encerramento e alteracoes">
              <p style={paragraphStyle}>A conta pode ser suspensa ou encerrada por violacao destes termos, suspeita de fraude, obrigacao legal ou risco operacional.</p>
              <p style={paragraphStyle}>A plataforma podera atualizar estes termos, informando alteracoes relevantes em canal apropriado.</p>
            </Section>

            <Section title="11. Lei aplicavel e foro">
              <p style={paragraphStyle}>Aplica-se a legislacao brasileira.</p>
              <p style={paragraphStyle}>Fica eleito o foro de {LEGAL_CONTROLLER.foro}, salvo disposicao legal diversa.</p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
