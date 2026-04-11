import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Colors from '../theme/colors';

const ANDROID_APK_URL = 'https://expo.dev/accounts/rafaelroriz_dev/projects/sejaatendido-rn/builds/d5be9460-48c7-4829-be64-b386d0bf62c1';

/* ─── Inline SVG logo matching the provided brand image ─── */
function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Monitor */}
      <rect x="35" y="45" width="130" height="95" rx="8" stroke={Colors.primary} strokeWidth="7" fill="none" />
      {/* Monitor stand */}
      <rect x="82" y="140" width="36" height="14" rx="3" stroke={Colors.primary} strokeWidth="6" fill="none" />
      <rect x="70" y="152" width="60" height="6" rx="3" fill={Colors.primary} />
      {/* Doctor figure - head */}
      <circle cx="100" cy="78" r="16" stroke={Colors.primary} strokeWidth="6" fill="none" />
      {/* Hair */}
      <path d="M84 72 C84 60 116 60 116 72" stroke={Colors.primary} strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Shield/badge on head */}
      <path d="M94 65 L100 60 L106 65 L106 72 C106 76 100 80 100 80 C100 80 94 76 94 72Z" stroke={Colors.primary} strokeWidth="3" fill="none" />
      {/* Body / scrubs V-neck */}
      <path d="M76 100 L92 100 L100 115 L108 100 L124 100" stroke={Colors.primary} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stethoscope */}
      <path d="M86 105 C86 125 95 128 100 128" stroke={Colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M114 105 C114 125 105 128 100 128" stroke={Colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="105" r="4" fill={Colors.primary} />
      <circle cx="114" cy="105" r="4" fill={Colors.primary} />
      <circle cx="100" cy="130" r="5" stroke={Colors.primary} strokeWidth="3" fill="none" />
    </svg>
  );
}

function SmallLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill={Colors.primary} />
      <text x="50" y="58" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="800" fontFamily="system-ui,sans-serif">SA</text>
    </svg>
  );
}

/* ─── Feature icon components ─── */
function IconCalendar() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function IconChat() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconPayment() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IconShield() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconUsers() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconBell() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function IconDollar() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
function IconClipboard() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
}
function IconAdmin() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C4DFF" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" stroke="#7C4DFF" strokeWidth="2"/></svg>;
}

/* ─── Styles as objects matching brand identity ─── */
const s = {
  page: { minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', system-ui, sans-serif", color: Colors.textPrimary, background: Colors.bg, overflowX: 'hidden' as const },
  // NAV
  nav: { position: 'sticky' as const, top: 0, zIndex: 100, background: 'rgba(247,248,252,0.88)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${Colors.border}` },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: Colors.textPrimary },
  navBrandText: { fontWeight: 800, fontSize: 20, color: Colors.primary, letterSpacing: -0.5 },
  navLinks: { display: 'flex', gap: 28, listStyle: 'none' as const },
  navLink: { textDecoration: 'none', fontSize: 14, fontWeight: 600, color: Colors.textSecondary },
  // BTN
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 999, fontWeight: 700, fontSize: 14, background: Colors.primary, color: '#fff', border: 'none', cursor: 'pointer', textDecoration: 'none', transition: 'all .18s ease' },
  btnWhite: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 999, fontWeight: 700, fontSize: 16, background: '#fff', color: Colors.primary, border: 'none', cursor: 'pointer', textDecoration: 'none', transition: 'all .18s ease' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 999, fontWeight: 700, fontSize: 16, background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.5)', cursor: 'pointer', textDecoration: 'none', transition: 'all .18s ease' },
  // HERO
  hero: { position: 'relative' as const, overflow: 'hidden' as const, padding: '100px 0 80px' },
  heroBlob1: { position: 'absolute' as const, width: 600, height: 600, borderRadius: '50%', background: Colors.primary, filter: 'blur(120px)', opacity: 0.1, top: -200, right: -200 },
  heroBlob2: { position: 'absolute' as const, width: 400, height: 400, borderRadius: '50%', background: Colors.primaryLight, filter: 'blur(100px)', opacity: 0.12, bottom: -100, left: -150 },
  heroInner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative' as const, zIndex: 1 },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: Colors.accentSoft, color: Colors.primary, borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 20 },
  heroTitle: { fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.08, marginBottom: 20, letterSpacing: -1.5 },
  heroDesc: { fontSize: 18, color: Colors.textSecondary, lineHeight: 1.7, marginBottom: 32, maxWidth: 480 },
  heroCTA: { display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 32 },
  // PHONE MOCKUP
  phoneMockup: { width: 280, background: '#fff', borderRadius: 40, boxShadow: `0 20px 60px rgba(0,0,0,.12), 0 0 0 2px ${Colors.border}`, overflow: 'hidden', aspectRatio: '9/19' },
  phoneScreen: { width: '100%', height: '100%', background: `linear-gradient(160deg, ${Colors.accentSoft}, ${Colors.accent})`, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  phoneAppName: { fontWeight: 800, fontSize: 22, color: Colors.primary, letterSpacing: -0.5, textAlign: 'center' as const },
  phoneTag: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' as const },
  // STATS
  stats: { borderTop: `1px solid ${Colors.border}`, borderBottom: `1px solid ${Colors.border}`, background: '#fff' },
  statsGrid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' },
  statItem: { padding: '32px 24px', textAlign: 'center' as const, borderRight: `1px solid ${Colors.border}` },
  statNum: { fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800, color: Colors.primary, display: 'block', lineHeight: 1 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: 8 },
  // SECTIONS
  section: { padding: 'clamp(48px, 7vw, 96px) 0' },
  sectionAlt: { padding: 'clamp(48px, 7vw, 96px) 0', background: Colors.card },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 20px' },
  header: { textAlign: 'center' as const, maxWidth: 560, margin: '0 auto 64px' },
  label: { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: Colors.primary, marginBottom: 12, display: 'block' },
  title: { fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, marginBottom: 16, letterSpacing: -0.8, lineHeight: 1.15 },
  desc: { fontSize: 16, color: Colors.textSecondary, lineHeight: 1.7 },
  // FEATURES GRID
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  featCard: { background: '#fff', border: `1px solid ${Colors.border}`, borderRadius: 20, padding: 32, transition: 'box-shadow .18s ease, transform .18s ease', cursor: 'default' },
  featIcon: { width: 48, height: 48, borderRadius: 12, background: Colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  featTitle: { fontSize: 18, fontWeight: 700, marginBottom: 10 },
  featDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 1.7 },
  // STEPS
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 48 },
  step: { textAlign: 'center' as const },
  stepNum: { width: 52, height: 52, borderRadius: '50%', background: Colors.primary, color: '#fff', fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  stepTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  stepDesc: { fontSize: 14, color: Colors.textSecondary },
  // AUDIENCE
  audGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48 },
  audCard: { borderRadius: 24, padding: 40, position: 'relative' as const, overflow: 'hidden' as const },
  audTitle: { fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 800, marginBottom: 16 },
  audDesc: { fontSize: 14, marginBottom: 24, lineHeight: 1.7 },
  audList: { listStyle: 'none' as const, display: 'flex', flexDirection: 'column' as const, gap: 10, padding: 0 },
  audLi: { fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 8 },
  // CTA
  cta: { background: `linear-gradient(135deg, ${Colors.primary}, ${Colors.primaryLight})`, padding: 'clamp(48px, 7vw, 96px) 0', textAlign: 'center' as const },
  ctaTitle: { fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800, color: '#fff', marginBottom: 16 },
  ctaDesc: { fontSize: 16, color: 'rgba(255,255,255,.85)', margin: '0 auto 32px', maxWidth: 460 },
  // FOOTER
  footer: { background: '#fff', borderTop: `1px solid ${Colors.border}`, padding: '40px 0' },
  footerInner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16 },
  footerBrand: { fontWeight: 800, fontSize: 20, color: Colors.primary },
  footerLinks: { display: 'flex', gap: 24, listStyle: 'none' as const },
  footerLink: { fontSize: 14, color: Colors.textSecondary, textDecoration: 'none' },
  footerCopy: { fontSize: 12, color: Colors.textMuted },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div style={s.page}>
      {/* ─── NAV ─── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <a href="#" style={s.navBrand}>
            <SmallLogo />
            <span style={s.navBrandText}>Seja Atendido</span>
          </a>
          {!isMobile && (
            <ul style={s.navLinks}>
              <li><a href="#funcionalidades" style={s.navLink}>Funcionalidades</a></li>
              <li><a href="#como-funciona" style={s.navLink}>Como funciona</a></li>
              <li><a href="#para-quem" style={s.navLink}>Para quem</a></li>
            </ul>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isMobile && (
              <a href={ANDROID_APK_URL} target="_blank" rel="noreferrer" style={{ ...s.btnPrimary, background: Colors.accentSoft, color: Colors.primary }}>
                Baixar APK
              </a>
            )}
            <button style={s.btnPrimary} onClick={() => navigate('/login')}>Acessar App</button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={s.hero}>
        <div style={s.heroBlob1} />
        <div style={s.heroBlob2} />
        <div style={{ ...s.heroInner, ...(isMobile ? { gridTemplateColumns: '1fr', textAlign: 'center' as const } : {}) }}>
          <div>
            <div style={s.heroBadge}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: Colors.primary, display: 'inline-block' }} />
              Plataforma de Telemedicina
            </div>
            <h1 style={s.heroTitle}>
              Sua saúde, <span style={{ color: Colors.primary }}>sem complicação</span>
            </h1>
            <p style={s.heroDesc}>
              Seja Atendido conecta pacientes a médicos verificados para agendamento rápido, pagamento seguro via PIX e acompanhamento por chat — tudo pelo celular.
            </p>
            <div style={{ ...s.heroCTA, ...(isMobile ? { justifyContent: 'center' } : {}) }}>
              <a href={ANDROID_APK_URL} target="_blank" rel="noreferrer" style={{ ...s.btnPrimary, padding: '14px 32px', fontSize: 16 }}>
                Baixar APK Android
              </a>
              <button style={{ ...s.btnPrimary, padding: '14px 32px', fontSize: 16 }} onClick={() => navigate('/signup')}>
                Criar conta grátis
              </button>
              <button style={{ ...s.btnPrimary, padding: '14px 32px', fontSize: 16, background: 'transparent', color: Colors.primary, border: `2px solid ${Colors.primary}` }} onClick={() => navigate('/login')}>
                Já tenho conta
              </button>
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={s.phoneMockup}>
                <div style={s.phoneScreen}>
                  <Logo size={80} />
                  <div style={s.phoneAppName}>Seja Atendido</div>
                  <div style={s.phoneTag}>Sua saúde em boas mãos</div>
                  <div style={{ marginTop: 16, padding: '8px 20px', background: Colors.primary, color: '#fff', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>
                    Agendar consulta
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <div style={s.stats}>
        <div style={{ ...s.statsGrid, ...(isMobile ? { gridTemplateColumns: '1fr 1fr' } : {}) }}>
          {[
            { num: '100%', label: 'Gratuito para pacientes' },
            { num: 'PIX', label: 'Pagamento instantâneo' },
            { num: '24h', label: 'Agendamento disponível' },
            { num: 'LGPD', label: 'Dados protegidos' },
          ].map((st, i) => (
            <div key={i} style={{ ...s.statItem, ...(i === 3 ? { borderRight: 'none' } : {}) }}>
              <span style={s.statNum}>{st.num}</span>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="funcionalidades" style={s.section}>
        <div style={s.container}>
          <div style={s.header}>
            <span style={s.label}>Funcionalidades</span>
            <h2 style={s.title}>Tudo que você precisa para cuidar da saúde</h2>
            <p style={s.desc}>Uma plataforma completa que conecta pacientes, médicos e administradores.</p>
          </div>
          <div style={s.featGrid}>
            {[
              { icon: <IconCalendar />, title: 'Agendamento inteligente', desc: 'Escolha o médico, selecione data e horário entre 18 slots diários (08h às 17h30) e confirme em poucos toques.' },
              { icon: <IconChat />, title: 'Chat em tempo real', desc: 'Converse diretamente com seu médico antes e depois da consulta. Tire dúvidas sem sair do app.' },
              { icon: <IconPayment />, title: 'Pagamento via PIX e Cartão', desc: 'Pague sua consulta com PIX (QR Code ou copia e cola) ou cartão de crédito, com confirmação instantânea.' },
              { icon: <IconUsers />, title: 'Perfis verificados', desc: 'Todos os médicos passam por verificação de registro no conselho de classe antes de atender.' },
              { icon: <IconBell />, title: 'Notificações personalizadas', desc: 'Receba lembretes por Push, Email ou WhatsApp — 24h e 1h antes da consulta. Você escolhe o canal.' },
              { icon: <IconShield />, title: 'Privacidade e segurança', desc: 'Seus dados são criptografados e protegidos em conformidade com a LGPD. Autenticação com token seguro.' },
              { icon: <IconDollar />, title: 'Gestão financeira (Médicos)', desc: 'Dashboard de ganhos semanais com gráfico, histórico de repasses, saldo detalhado e dados bancários via PIX.' },
              { icon: <IconClipboard />, title: 'Histórico completo', desc: 'Acesse todo seu histórico de consultas, pagamentos e prescrições a qualquer momento, em um só lugar.' },
              { icon: <IconAdmin />, title: 'Painel administrativo', desc: 'Gestão completa: aprovação de médicos, métricas de pacientes, consultas e profissionais cadastrados.' },
            ].map((f, i) => (
              <div key={i} style={s.featCard}>
                <div style={s.featIcon}>{f.icon}</div>
                <h3 style={s.featTitle}>{f.title}</h3>
                <p style={s.featDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="como-funciona" style={s.sectionAlt}>
        <div style={s.container}>
          <div style={s.header}>
            <span style={s.label}>Como funciona</span>
            <h2 style={s.title}>Simples em 3 passos</h2>
            <p style={s.desc}>Do cadastro à consulta em minutos.</p>
          </div>
          <div style={{ ...s.stepsGrid, ...(isMobile ? { gridTemplateColumns: '1fr', gap: 24 } : {}) }}>
            {[
              { n: '1', title: 'Crie sua conta', desc: 'Cadastro rápido como paciente ou médico. Verificação de e-mail automática para sua segurança.' },
              { n: '2', title: 'Agende sua consulta', desc: 'Encontre médicos por especialidade, escolha data e horário disponível e confirme o agendamento.' },
              { n: '3', title: 'Pague e seja atendido', desc: 'Pague via PIX ou cartão, receba confirmação instantânea e acesse o chat com seu médico.' },
            ].map((step, i) => (
              <div key={i} style={s.step}>
                <div style={s.stepNum}>{step.n}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR WHO ─── */}
      <section id="para-quem" style={s.section}>
        <div style={s.container}>
          <div style={s.header}>
            <span style={s.label}>Para quem é</span>
            <h2 style={s.title}>Pacientes, médicos e gestores</h2>
          </div>
          <div style={{ ...s.audGrid, ...(isMobile ? { gridTemplateColumns: '1fr' } : {}) }}>
            <div style={{ ...s.audCard, background: Colors.accentSoft }}>
              <h3 style={{ ...s.audTitle, color: Colors.primary }}>Para pacientes</h3>
              <p style={{ ...s.audDesc, color: Colors.textSecondary }}>Agende consultas sem burocracia e cuide da sua saúde com facilidade.</p>
              <ul style={s.audList}>
                {['Busque médicos por especialidade', 'Agendamento em menos de 2 min', 'Pagamento via PIX ou cartão', 'Chat direto com o profissional', 'Notificações por Push, Email e WhatsApp', 'Histórico completo de consultas', '100% gratuito para criar conta'].map((t, i) => (
                  <li key={i} style={s.audLi}>
                    <span style={{ color: Colors.primary, fontWeight: 700, flexShrink: 0 }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ ...s.audCard, background: Colors.primary }}>
              <h3 style={{ ...s.audTitle, color: '#fff' }}>Para médicos</h3>
              <p style={{ ...s.audDesc, color: 'rgba(255,255,255,.8)' }}>Gerencie sua agenda e acompanhe seus ganhos em uma plataforma moderna.</p>
              <ul style={s.audList}>
                {['Agenda digital com confirmação automática', 'Dashboard de ganhos semanais', 'Controle de repasses e saldo', 'Dados bancários com chave PIX', 'Perfil verificado pelo conselho', 'Comunicação direta com pacientes', 'Sem mensalidade para começar'].map((t, i) => (
                  <li key={i} style={{ ...s.audLi, color: 'rgba(255,255,255,.85)' }}>
                    <span style={{ color: '#fff', fontWeight: 700, flexShrink: 0 }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={s.cta}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px' }}>
          <h2 style={s.ctaTitle}>Pronto para cuidar da sua saúde?</h2>
          <p style={s.ctaDesc}>Baixe o APK Android agora ou crie sua conta gratuitamente para começar a agendar consultas.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a href={ANDROID_APK_URL} target="_blank" rel="noreferrer" style={s.btnWhite}>Baixar APK Android</a>
            <button style={s.btnWhite} onClick={() => navigate('/signup')}>Criar conta grátis</button>
            <button style={s.btnOutline} onClick={() => navigate('/login')}>Já tenho conta</button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={s.footer}>
        <div style={{ ...s.footerInner, ...(isMobile ? { flexDirection: 'column' as const, textAlign: 'center' as const } : {}) }}>
          <div style={s.footerBrand}>Seja Atendido</div>
          <ul style={s.footerLinks}>
            <li><a href="mailto:contato@sejaatendido.com.br" style={s.footerLink}>Contato</a></li>
            <li><a href="#" style={s.footerLink}>Privacidade</a></li>
            <li><a href="#" style={s.footerLink}>Termos de uso</a></li>
          </ul>
          <p style={s.footerCopy}>© 2026 Seja Atendido. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
