import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDadosBancarios, fetchDadosBancarios } from '../services/api';
import Colors, { Radius } from '../theme/colors';

type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

const TIPOS_CHAVE: { value: TipoChavePix; label: string }[] = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave Aleatória' },
];

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'Caixa Econômica', 'Itaú Unibanco',
  'Santander', 'Nubank', 'Inter', 'C6 Bank', 'BTG Pactual',
  'Sicoob', 'Sicredi', 'PagBank', 'Original', 'Safra', 'Outro',
];

function getPlaceholder(tipo: TipoChavePix): string {
  switch (tipo) {
    case 'CPF': return '000.000.000-00';
    case 'CNPJ': return '00.000.000/0000-00';
    case 'EMAIL': return 'email@exemplo.com';
    case 'TELEFONE': return '(00) 90000-0000';
    case 'ALEATORIA': return 'Cole sua chave aleatória';
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
    case 'CPF': return digits.length === 11 ? null : 'CPF deve ter 11 dígitos';
    case 'CNPJ': return digits.length === 14 ? null : 'CNPJ deve ter 14 dígitos';
    case 'EMAIL': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email inválido';
    case 'TELEFONE': return digits.length >= 10 && digits.length <= 11 ? null : 'Telefone inválido';
    case 'ALEATORIA': return value.trim().length >= 10 ? null : 'Chave inválida';
  }
}

export default function BankDetails() {
  const navigate = useNavigate();
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

  useEffect(() => { loadDados(); }, []);

  async function loadDados() {
    try {
      const data = await fetchDadosBancarios();
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
    } catch {} finally { setLoadingData(false); }
  }

  function handleChaveChange(text: string) {
    setChavePix(applyMask(tipoChave, text));
    if (chaveError) setChaveError(null);
  }

  function handleTipoChange(tipo: TipoChavePix) {
    setTipoChave(tipo); setChavePix(''); setChaveError(null);
  }

  async function handleSave() {
    const error = validateChave(tipoChave, chavePix);
    if (error) { setChaveError(error); return; }
    setLoading(true);
    try {
      await saveDadosBancarios({
        tipoChavePix: tipoChave, chavePix: chavePix.trim(),
        banco: showBanco ? bancoSelecionado : undefined,
        agencia: showBanco ? agencia : undefined,
        conta: showBanco ? conta : undefined,
      });
      window.alert('Dados bancários salvos com sucesso!');
    } catch { window.alert('Não foi possível salvar os dados bancários.'); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: Colors.inputBg, borderRadius: 14, padding: 16, fontSize: 16, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none', boxSizing: 'border-box' };

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
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Dados para Recebimento</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, overflowY: 'auto' }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.doctorLight, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.doctor }} />
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: Colors.doctor, display: 'block' }}>Recebimento via Pix</span>
            <span style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2, display: 'block' }}>Configure sua chave para receber pagamentos</span>
          </div>
        </div>

        {/* Tipo de Chave */}
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

        {/* Dados Bancários Completos */}
        <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <div onClick={() => setShowBanco(!showBanco)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Dados Bancários Completos</span>
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

              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, marginTop: 12 }}>Agência</label>
              <input value={agencia} onChange={e => setAgencia(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="0000" disabled={loading} style={inputStyle} />

              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, marginTop: 12 }}>Número da Conta</label>
              <input value={conta} onChange={e => setConta(e.target.value)} placeholder="00000-0" disabled={loading} style={inputStyle} />
            </div>
          )}
        </div>

        {/* Mercado Pago */}
        <div onClick={() => window.alert('A integração com Mercado Pago estará disponível em breve.')} style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 20, gap: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#009EE3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>MP</span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary, display: 'block' }}>Conectar com Mercado Pago</span>
            <span style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Em breve</span>
          </div>
          <span style={{ fontSize: 22, color: Colors.textMuted }}>›</span>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={loading} style={{
          width: '100%', backgroundColor: Colors.doctor, borderRadius: 14, padding: 16, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 6px 12px ${Colors.doctor}59`,
        }}>
          {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Salvar Dados Bancários</span>}
        </button>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
