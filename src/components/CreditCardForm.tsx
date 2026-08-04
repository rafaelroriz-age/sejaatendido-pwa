import React, { useState } from 'react';
import Colors, { Radius } from '../theme/colors';
import { tokenizeCreditCard } from '../services/asaas';

// Formulário de cartão novo: tokeniza diretamente com o Asaas (número/CVV nunca
// chegam ao nosso backend) e devolve apenas o token + metadados de exibição.
export interface CreditCardTokenResult {
  token: string;
  ultimosDigitos: string;
  bandeira: string;
  titular: string;
}

interface CreditCardFormProps {
  onTokenized: (result: CreditCardTokenResult) => Promise<void> | void;
  submitLabel?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const MESES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 15 }, (_, i) => String(ANO_ATUAL + i));

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

function maskCardNumber(v: string): string {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function getTokenizeErrorMessage(error: unknown): string {
  const anyErr = error as any;
  const asaasMessage = anyErr?.response?.data?.errors?.[0]?.description;
  return asaasMessage || anyErr?.message || 'Não foi possível processar o cartão. Verifique os dados e tente novamente.';
}

export default function CreditCardForm({ onTokenized, submitLabel = 'Salvar cartão', disabled, children }: CreditCardFormProps) {
  const [numero, setNumero] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [cvv, setCvv] = useState('');
  const [nomeImpresso, setNomeImpresso] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [numeroEndereco, setNumeroEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  function validate(): string | null {
    if (onlyDigits(numero).length < 13) return 'Informe um número de cartão válido.';
    if (!mes || !ano) return 'Informe a validade do cartão.';
    if (onlyDigits(cvv).length < 3) return 'Informe o CVV do cartão.';
    if (!nomeImpresso.trim()) return 'Informe o nome impresso no cartão.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um email válido do titular.';
    if (onlyDigits(cpf).length !== 11) return 'Informe um CPF válido do titular.';
    if (onlyDigits(cep).length !== 8) return 'Informe um CEP válido.';
    if (!numeroEndereco.trim()) return 'Informe o número do endereço do titular.';
    if (onlyDigits(telefone).length < 10) return 'Informe um telefone válido do titular.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setErrorText('');
    setSubmitting(true);
    try {
      const tokenized = await tokenizeCreditCard({
        creditCard: {
          holderName: nomeImpresso.trim(),
          number: onlyDigits(numero),
          expiryMonth: mes,
          expiryYear: ano,
          ccv: onlyDigits(cvv),
        },
        creditCardHolderInfo: {
          name: nomeImpresso.trim(),
          email: email.trim(),
          cpfCnpj: onlyDigits(cpf),
          postalCode: onlyDigits(cep),
          addressNumber: numeroEndereco.trim(),
          phone: onlyDigits(telefone),
        },
      });

      await onTokenized({
        token: tokenized.creditCardToken,
        ultimosDigitos: tokenized.creditCardNumber,
        bandeira: tokenized.creditCardBrand,
        titular: nomeImpresso.trim(),
      });
    } catch (error) {
      setErrorText(getTokenizeErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = submitting || Boolean(disabled);
  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: Colors.inputBg, borderRadius: 12, padding: '12px 14px',
    fontSize: 14, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: Colors.textSecondary, marginBottom: 6, display: 'block' };
  const fieldWrap: React.CSSProperties = { marginBottom: 12 };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Formulário de novo cartão de crédito">
      <div style={fieldWrap}>
        <label htmlFor="cc-numero" style={labelStyle}>Número do cartão</label>
        <input id="cc-numero" inputMode="numeric" autoComplete="cc-number" value={numero}
          onChange={e => setNumero(maskCardNumber(e.target.value))} placeholder="0000 0000 0000 0000"
          disabled={isBusy} style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-mes" style={labelStyle}>Mês de validade</label>
          <select id="cc-mes" value={mes} onChange={e => setMes(e.target.value)} disabled={isBusy} style={inputStyle}>
            <option value="">MM</option>
            {MESES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-ano" style={labelStyle}>Ano de validade</label>
          <select id="cc-ano" value={ano} onChange={e => setAno(e.target.value)} disabled={isBusy} style={inputStyle}>
            <option value="">AAAA</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-cvv" style={labelStyle}>CVV</label>
          <input id="cc-cvv" inputMode="numeric" autoComplete="cc-csc" value={cvv}
            onChange={e => setCvv(onlyDigits(e.target.value).slice(0, 4))} placeholder="000"
            disabled={isBusy} style={inputStyle} />
        </div>
      </div>

      <div style={fieldWrap}>
        <label htmlFor="cc-nome" style={labelStyle}>Nome impresso no cartão</label>
        <input id="cc-nome" autoComplete="cc-name" value={nomeImpresso}
          onChange={e => setNomeImpresso(e.target.value.toUpperCase())} placeholder="FULANO DE TAL"
          disabled={isBusy} style={inputStyle} />
      </div>

      <div style={fieldWrap}>
        <label htmlFor="cc-email" style={labelStyle}>Email do titular</label>
        <input id="cc-email" type="email" autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
          disabled={isBusy} style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-cpf" style={labelStyle}>CPF do titular</label>
          <input id="cc-cpf" inputMode="numeric" value={cpf}
            onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00"
            disabled={isBusy} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-telefone" style={labelStyle}>Telefone do titular</label>
          <input id="cc-telefone" inputMode="tel" autoComplete="tel" value={telefone}
            onChange={e => setTelefone(maskPhone(e.target.value))} placeholder="(00) 90000-0000"
            disabled={isBusy} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-cep" style={labelStyle}>CEP do titular</label>
          <input id="cc-cep" inputMode="numeric" autoComplete="postal-code" value={cep}
            onChange={e => setCep(maskCep(e.target.value))} placeholder="00000-000"
            disabled={isBusy} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="cc-numero-endereco" style={labelStyle}>Número do endereço</label>
          <input id="cc-numero-endereco" value={numeroEndereco}
            onChange={e => setNumeroEndereco(e.target.value)} placeholder="123"
            disabled={isBusy} style={inputStyle} />
        </div>
      </div>

      {children}

      {errorText && (
        <p role="alert" style={{ fontSize: 13, color: Colors.error, fontWeight: 600, marginBottom: 12 }}>{errorText}</p>
      )}

      <button type="submit" disabled={isBusy} style={{
        width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 16, border: 'none',
        cursor: isBusy ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 15, fontWeight: 700,
        opacity: isBusy ? 0.6 : 1, boxShadow: `0 6px 12px ${Colors.primary}59`,
      }}>
        {submitting ? 'Processando…' : submitLabel}
      </button>
    </form>
  );
}
