import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDadosBancarios, fetchDadosBancarios, DadosBancariosPerfil } from '../services/api';
import { getUser } from '../storage/localStorage';
import Colors from '../theme/colors';

type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

type SavedCard = {
  brand: string;
  last4: string;
  holder: string;
  exp: string;
};

type PaymentPrefs = {
  useSavedCard: boolean;
  savedCard?: SavedCard;
};

const PAYMENT_PREFS_KEY = '@payment:preferences';

const TIPOS_CHAVE: { value: TipoChavePix; label: string }[] = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave Aleatoria' },
];

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'Caixa Economica', 'Itau Unibanco',
  'Santander', 'Nubank', 'Inter', 'C6 Bank', 'BTG Pactual',
  'Sicoob', 'Sicredi', 'PagBank', 'Original', 'Safra', 'Outro',
];

function getPlaceholder(tipo: TipoChavePix): string {
  switch (tipo) {
    case 'CPF': return '000.000.000-00';
    case 'CNPJ': return '00.000.000/0000-00';
    case 'EMAIL': return 'email@exemplo.com';
    case 'TELEFONE': return '(00) 90000-0000';
    case 'ALEATORIA': return 'Cole sua chave aleatoria';
  }
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function maskCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (digits.startsWith('6')) return 'Elo';
  return 'Cartao';
}

function applyMask(tipo: TipoChavePix, value: string): string {
  switch (tipo) {
    case 'CPF': return maskCPF(value);
    case 'CNPJ': return maskCNPJ(value);
    case 'TELEFONE': return maskPhone(value);
    default: return value;
  }
}

function validateChave(tipo: TipoChavePix, value: string): string | null {
  const digits = value.replace(/\D/g, '');
  switch (tipo) {
    case 'CPF': return digits.length === 11 ? null : 'CPF deve ter 11 digitos';
    case 'CNPJ': return digits.length === 14 ? null : 'CNPJ deve ter 14 digitos';
    case 'EMAIL': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email invalido';
    case 'TELEFONE': return digits.length >= 10 && digits.length <= 11 ? null : 'Telefone invalido';
    case 'ALEATORIA': return value.trim().length >= 10 ? null : 'Chave invalida';
  }
}

function loadPaymentPrefs(): PaymentPrefs {
  if (typeof window === 'undefined') {
    return { useSavedCard: true };
  }

  try {
    const raw = window.localStorage.getItem(PAYMENT_PREFS_KEY);
    if (!raw) return { useSavedCard: true };
    const parsed = JSON.parse(raw) as PaymentPrefs;
    return {
      useSavedCard: parsed.useSavedCard !== false,
      savedCard: parsed.savedCard,
    };
  } catch {
    return { useSavedCard: true };
  }
}

function savePaymentPrefs(prefs: PaymentPrefs): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PAYMENT_PREFS_KEY, JSON.stringify(prefs));
}

export default function BankDetails() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<DadosBancariosPerfil>('MEDICO');

  // Medico flow (recebimento)
  const [tipoChave, setTipoChave] = useState<TipoChavePix>('CPF');
  const [chavePix, setChavePix] = useState('');
  const [chaveError, setChaveError] = useState<string | null>(null);
  const [showBanco, setShowBanco] = useState(false);
  const [bancoSelecionado, setBancoSelecionado] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [showBancoList, setShowBancoList] = useState(false);

  // Paciente flow (pagamento)
  const [useSavedCard, setUseSavedCard] = useState(true);
  const [savedCard, setSavedCard] = useState<SavedCard | undefined>(undefined);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const user = await getUser();
        if (!active) return;

        const nextPerfil: DadosBancariosPerfil = user?.tipo === 'PACIENTE' ? 'PACIENTE' : 'MEDICO';
        setPerfil(nextPerfil);

        if (nextPerfil === 'PACIENTE') {
          const prefs = loadPaymentPrefs();
          if (!active) return;
          setUseSavedCard(prefs.useSavedCard);
          setSavedCard(prefs.savedCard);
          setLoadingData(false);
          return;
        }

        await loadDados(nextPerfil);
      } catch {
        if (active) setLoadingData(false);
      }
    }

    void bootstrap();
    return () => { active = false; };
  }, []);

  async function loadDados(nextPerfil: DadosBancariosPerfil) {
    try {
      const data = await fetchDadosBancarios(nextPerfil);
      if (data) {
        if (data.tipoChavePix) setTipoChave(data.tipoChavePix as TipoChavePix);
        if (data.chavePix) setChavePix(data.chavePix);
        if (data.banco || data.agencia || data.conta) {
          setShowBanco(true);
          setBancoSelecionado(data.banco || '');
          setAgencia(data.agencia || '');
          setConta(data.conta || '');
        }
      }
    } catch {
      // noop
    } finally {
      setLoadingData(false);
    }
  }

  function handleChaveChange(text: string) {
    setChavePix(applyMask(tipoChave, text));
    if (chaveError) setChaveError(null);
  }

  function handleTipoChange(tipo: TipoChavePix) {
    setTipoChave(tipo);
    setChavePix('');
    setChaveError(null);
  }

  function resetCardForm() {
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvv('');
  }

  function savePatientPreferences(): boolean {
    const numberDigits = cardNumber.replace(/\D/g, '');
    const cvvDigits = cardCvv.replace(/\D/g, '');

    if (!savedCard && numberDigits.length === 0) {
      setSaveError('Adicione um cartao para usar como opcao rapida.');
      return false;
    }

    let nextCard = savedCard;

    if (numberDigits.length > 0 || cardHolder.trim() || cardExpiry || cvvDigits.length > 0) {
      if (numberDigits.length < 13 || numberDigits.length > 16) {
        setSaveError('Numero do cartao invalido.');
        return false;
      }
      if (!cardHolder.trim()) {
        setSaveError('Informe o nome impresso no cartao.');
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setSaveError('Validade invalida. Use MM/AA.');
        return false;
      }
      if (cvvDigits.length < 3 || cvvDigits.length > 4) {
        setSaveError('CVV invalido.');
        return false;
      }

      nextCard = {
        brand: detectCardBrand(cardNumber),
        last4: numberDigits.slice(-4),
        holder: cardHolder.trim(),
        exp: cardExpiry,
      };
      setSavedCard(nextCard);
      resetCardForm();
    }

    const prefs: PaymentPrefs = {
      useSavedCard,
      savedCard: nextCard,
    };

    savePaymentPrefs(prefs);
    setSaveMsg('Preferencias de pagamento salvas com sucesso!');
    setSaveError('');
    setTimeout(() => setSaveMsg(''), 3000);
    return true;
  }

  async function handleSave() {
    setSaveError('');
    setSaveMsg('');

    if (perfil === 'PACIENTE') {
      setLoading(true);
      try {
        savePatientPreferences();
      } finally {
        setLoading(false);
      }
      return;
    }

    const error = validateChave(tipoChave, chavePix);
    if (error) {
      setChaveError(error);
      return;
    }

    setLoading(true);
    try {
      await saveDadosBancarios({
        tipoChavePix: tipoChave,
        chavePix: chavePix.trim(),
        banco: showBanco ? bancoSelecionado : undefined,
        agencia: showBanco ? agencia : undefined,
        conta: showBanco ? conta : undefined,
      }, perfil);

      setSaveMsg('Dados bancarios salvos com sucesso!');
      setSaveError('');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveError('Nao foi possivel salvar os dados bancarios.');
    } finally {
      setLoading(false);
    }
  }

  function removeSavedCard() {
    const prefs = loadPaymentPrefs();
    const nextPrefs: PaymentPrefs = {
      useSavedCard,
      savedCard: undefined,
    };
    setSavedCard(undefined);
    savePaymentPrefs({ ...prefs, ...nextPrefs });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    border: `1px solid ${Colors.border}`,
    color: Colors.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const isPaciente = perfil === 'PACIENTE';

  if (loadingData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.doctor, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3, display: 'block', textAlign: 'center' }}>
          {isPaciente ? 'Metodos de Pagamento' : 'Dados para Recebimento'}
        </span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, overflowY: 'auto' }}>
        {isPaciente ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.accentSoft, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: Colors.primary, display: 'block' }}>Pagamento da consulta</span>
                <span style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2, display: 'block' }}>
                  Escolha entre Pix e cartao salvo para finalizar mais rapido.
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block', marginBottom: 14 }}>
                Opcoes
              </span>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={useSavedCard} onChange={e => setUseSavedCard(e.target.checked)} />
                <span style={{ fontSize: 14, color: Colors.textPrimary, fontWeight: 600 }}>Usar cartao salvo como opcao rapida</span>
              </label>
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Cartao salvo</span>

              {savedCard ? (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, border: `1px solid ${Colors.border}`, backgroundColor: Colors.inputBg }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary, display: 'block' }}>
                    {savedCard.brand} •••• {savedCard.last4}
                  </span>
                  <span style={{ fontSize: 12, color: Colors.textSecondary, display: 'block', marginTop: 4 }}>
                    {savedCard.holder} • Validade {savedCard.exp}
                  </span>
                  <button
                    type="button"
                    onClick={removeSavedCard}
                    style={{ marginTop: 10, backgroundColor: Colors.errorLight, border: `1px solid ${Colors.error}`, color: Colors.error, borderRadius: 10, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Remover cartao salvo
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: Colors.textMuted, display: 'block', marginTop: 10 }}>
                  Nenhum cartao salvo. Adicione abaixo.
                </span>
              )}

              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <input
                  value={cardNumber}
                  onChange={e => setCardNumber(maskCardNumber(e.target.value))}
                  placeholder="Numero do cartao"
                  disabled={loading}
                  style={inputStyle}
                />
                <input
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  placeholder="Nome impresso no cartao"
                  disabled={loading}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={cardExpiry}
                    onChange={e => setCardExpiry(maskCardExpiry(e.target.value))}
                    placeholder="MM/AA"
                    disabled={loading}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="CVV"
                    disabled={loading}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.doctorLight, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.doctor }} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: Colors.doctor, display: 'block' }}>Recebimento via Pix</span>
                <span style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2, display: 'block' }}>
                  Configure sua chave para receber os repasses.
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Tipo de Chave Pix</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 20 }}>
                {TIPOS_CHAVE.map(t => (
                  <button key={t.value} onClick={() => handleTipoChange(t.value)} disabled={loading} style={{
                    padding: '10px 16px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: tipoChave === t.value ? Colors.doctorLight : Colors.inputBg,
                    border: `1.5px solid ${tipoChave === t.value ? Colors.doctor : Colors.border}`,
                    color: tipoChave === t.value ? Colors.doctor : Colors.textSecondary,
                    fontSize: 13, fontWeight: 600,
                  }}>{t.label}</button>
                ))}
              </div>

              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Chave Pix</label>
              <input value={chavePix} onChange={e => handleChaveChange(e.target.value)} placeholder={getPlaceholder(tipoChave)} disabled={loading} style={{ ...inputStyle, borderColor: chaveError ? Colors.error : Colors.border }} />
              {chaveError && <span style={{ fontSize: 12, color: Colors.error, marginTop: 6, fontWeight: 600, display: 'block' }}>{chaveError}</span>}
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <div onClick={() => setShowBanco(!showBanco)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Dados Bancarios Completos</span>
                  <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Opcional</span>
                </div>
                <span style={{ fontSize: 24, color: Colors.textMuted, fontWeight: 600 }}>{showBanco ? '−' : '+'}</span>
              </div>

              {showBanco && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${Colors.borderLight}`, paddingTop: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, marginTop: 12 }}>Banco</label>
                  <div onClick={() => setShowBancoList(!showBancoList)} style={{ ...inputStyle, cursor: 'pointer', color: bancoSelecionado ? Colors.textPrimary : Colors.textMuted }}>
                    {bancoSelecionado || 'Selecione o banco'}
                  </div>

                  {showBancoList && (
                    <div style={{ backgroundColor: Colors.card, borderRadius: 14, border: `1px solid ${Colors.border}`, marginTop: 8, marginBottom: 8, maxHeight: 200, overflowY: 'auto' }}>
                      {BANCOS.map(banco => (
                        <div key={banco} onClick={() => { setBancoSelecionado(banco); setShowBancoList(false); }} style={{
                          padding: '14px 16px', borderBottom: `1px solid ${Colors.borderLight}`, cursor: 'pointer',
                          backgroundColor: bancoSelecionado === banco ? Colors.doctorLight : 'transparent',
                          color: bancoSelecionado === banco ? Colors.doctor : Colors.textPrimary,
                          fontWeight: bancoSelecionado === banco ? 700 : 400, fontSize: 15,
                        }}>{banco}</div>
                      ))}
                    </div>
                  )}

                  <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, marginTop: 12 }}>Agencia</label>
                  <input value={agencia} onChange={e => setAgencia(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="0000" disabled={loading} style={inputStyle} />

                  <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, marginTop: 12 }}>Numero da Conta</label>
                  <input value={conta} onChange={e => setConta(e.target.value)} placeholder="00000-0" disabled={loading} style={inputStyle} />
                </div>
              )}
            </div>
          </>
        )}

        <button onClick={handleSave} disabled={loading} style={{
          width: '100%', backgroundColor: Colors.doctor, borderRadius: 14, padding: 16, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 6px 12px ${Colors.doctor}59`,
        }}>
          {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{isPaciente ? 'Salvar Preferencias de Pagamento' : 'Salvar Dados Bancarios'}</span>}
        </button>

        {saveMsg && <p style={{ fontSize: 14, color: Colors.success, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>{saveMsg}</p>}
        {saveError && <p style={{ fontSize: 14, color: Colors.error, textAlign: 'center', marginTop: 12 }} role="alert">{saveError}</p>}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
