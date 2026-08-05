import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  saveDadosBancarios,
  fetchDadosBancarios,
  DadosBancariosPerfil,
  fetchCartoesSalvos,
  salvarCartao,
  removerCartaoSalvo,
  type CartaoSalvo,
} from '../services/api';
import { getUser } from '../storage/localStorage';
import Colors, { Radius } from '../theme/colors';
import CreditCardForm, { type CreditCardTokenResult } from '../components/CreditCardForm';

type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

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

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  // Paciente — cartões salvos (estilo Uber: token reutilizável persistido pelo
  // backend, ver services/api.ts fetchCartoesSalvos/salvarCartao/removerCartaoSalvo).
  const [cartoesSalvos, setCartoesSalvos] = useState<CartaoSalvo[]>([]);
  const [loadingCartoes, setLoadingCartoes] = useState(false);
  const [showNovoCartaoForm, setShowNovoCartaoForm] = useState(false);
  const [removingCartaoId, setRemovingCartaoId] = useState<string | null>(null);
  const [cartaoMsg, setCartaoMsg] = useState('');
  const [cartaoError, setCartaoError] = useState('');

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const user = await getUser();
        if (!active) return;

        const nextPerfil: DadosBancariosPerfil = user?.tipo === 'PACIENTE' ? 'PACIENTE' : 'MEDICO';
        setPerfil(nextPerfil);

        if (nextPerfil === 'PACIENTE') {
          setLoadingData(false);
          await loadCartoesSalvos();
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

  async function loadCartoesSalvos() {
    setLoadingCartoes(true);
    try {
      const list = await fetchCartoesSalvos();
      setCartoesSalvos(list);
      setShowNovoCartaoForm(list.length === 0);
    } catch {
      setCartoesSalvos([]);
      setShowNovoCartaoForm(true);
    } finally {
      setLoadingCartoes(false);
    }
  }

  async function handleSalvarNovoCartao(result: CreditCardTokenResult) {
    setCartaoMsg('');
    setCartaoError('');
    try {
      const cartao = await salvarCartao({
        token: result.token,
        ultimosDigitos: result.ultimosDigitos,
        bandeira: result.bandeira,
        titular: result.titular,
      });
      setCartoesSalvos(prev => [...prev, cartao]);
      setShowNovoCartaoForm(false);
      setCartaoMsg('Cartão salvo com sucesso!');
      setTimeout(() => setCartaoMsg(''), 3000);
    } catch (error) {
      setCartaoError((error as any)?.response?.data?.erro || (error as any)?.response?.data?.mensagem || 'Não foi possível salvar o cartão.');
    }
  }

  async function handleRemoverCartao(cartaoId: string) {
    setCartaoError('');
    setRemovingCartaoId(cartaoId);
    try {
      await removerCartaoSalvo(cartaoId);
      setCartoesSalvos(prev => {
        const next = prev.filter(c => c.id !== cartaoId);
        if (next.length === 0) setShowNovoCartaoForm(true);
        return next;
      });
    } catch {
      setCartaoError('Não foi possível remover o cartão.');
    } finally {
      setRemovingCartaoId(null);
    }
  }

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

  async function handleSave() {
    setSaveError('');
    setSaveMsg('');

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
          {isPaciente ? 'Pagamento' : 'Dados para Recebimento'}
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
                  O pagamento é feito na tela da consulta, via Pix ou cartão de crédito.
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block', marginBottom: 10 }}>
                Como pagar
              </span>
              <span style={{ fontSize: 14, color: Colors.textSecondary, display: 'block' }}>
                <strong>Pix</strong> é o método recomendado: gere o QR Code na tela da consulta, sem precisar cadastrar nada aqui antes. Você também pode pagar com <strong>cartão de crédito</strong>, novo ou salvo, direto na tela da consulta.
              </span>
            </div>

            <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block', marginBottom: 14 }}>
                Cartões salvos
              </span>

              {loadingCartoes && (
                <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: Colors.textMuted, fontWeight: 600 }}>
                  Carregando cartões salvos…
                </div>
              )}

              {!loadingCartoes && cartoesSalvos.length === 0 && !showNovoCartaoForm && (
                <span style={{ fontSize: 13, color: Colors.textMuted, display: 'block', marginBottom: 12 }}>
                  Você ainda não tem nenhum cartão salvo.
                </span>
              )}

              {!loadingCartoes && cartoesSalvos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${Colors.borderLight}`, gap: 8 }}>
                  <span style={{ fontSize: 14, color: Colors.textPrimary, fontWeight: 600 }}>
                    {(c.bandeira || 'Cartão').toUpperCase()} •••• {c.ultimosDigitos}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoverCartao(c.id)}
                    disabled={removingCartaoId === c.id}
                    aria-label={`Remover cartão terminado em ${c.ultimosDigitos}`}
                    style={{
                      backgroundColor: 'transparent', color: Colors.error, border: `1px solid ${Colors.error}`,
                      borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      opacity: removingCartaoId === c.id ? 0.6 : 1,
                    }}
                  >
                    {removingCartaoId === c.id ? 'Removendo…' : 'Remover'}
                  </button>
                </div>
              ))}

              {!loadingCartoes && !showNovoCartaoForm && (
                <button
                  type="button"
                  onClick={() => setShowNovoCartaoForm(true)}
                  style={{ marginTop: 12, width: '100%', backgroundColor: Colors.accentSoft, color: Colors.primary, border: `1px solid ${Colors.primary}`, borderRadius: Radius.md, padding: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  + Adicionar cartão
                </button>
              )}

              {!loadingCartoes && showNovoCartaoForm && (
                <div style={{ marginTop: 8 }}>
                  <CreditCardForm submitLabel="Salvar cartão" onTokenized={handleSalvarNovoCartao}>
                    {cartoesSalvos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNovoCartaoForm(false)}
                        style={{ background: 'none', border: 'none', color: Colors.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: 0, textDecoration: 'underline' }}
                      >
                        Cancelar
                      </button>
                    )}
                  </CreditCardForm>
                </div>
              )}

              {cartaoMsg && <p style={{ fontSize: 14, color: Colors.success, fontWeight: 700, marginTop: 12 }}>{cartaoMsg}</p>}
              {cartaoError && <p role="alert" style={{ fontSize: 14, color: Colors.error, marginTop: 12 }}>{cartaoError}</p>}
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

        {!isPaciente && (
          <button onClick={handleSave} disabled={loading} style={{
            width: '100%', backgroundColor: Colors.doctor, borderRadius: 14, padding: 16, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: `0 6px 12px ${Colors.doctor}59`,
          }}>
            {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Salvar Dados Bancarios</span>}
          </button>
        )}

        {saveMsg && <p style={{ fontSize: 14, color: Colors.success, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>{saveMsg}</p>}
        {saveError && <p style={{ fontSize: 14, color: Colors.error, textAlign: 'center', marginTop: 12 }} role="alert">{saveError}</p>}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
