import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDenylist,
  criarDenylistEntry,
  removerDenylistEntry,
  DenylistEntry,
} from '../services/api';
import { handleApiError } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SkeletonCard } from '../components/Skeleton';
import { DENYLIST_TIPO, DENYLIST_TIPO_LABEL, DenylistTipo } from '../constants/riscoStatus';

const TIPOS: { value: DenylistTipo; label: string; placeholder: string }[] = [
  { value: DENYLIST_TIPO.CPF, label: DENYLIST_TIPO_LABEL.CPF, placeholder: '000.000.000-00' },
  { value: DENYLIST_TIPO.EMAIL, label: DENYLIST_TIPO_LABEL.EMAIL, placeholder: 'email@exemplo.com' },
  { value: DENYLIST_TIPO.CARTAO_HASH, label: DENYLIST_TIPO_LABEL.CARTAO_HASH, placeholder: 'hash do cartão fornecido pelo backend' },
  { value: DENYLIST_TIPO.DEVICE_ID, label: DENYLIST_TIPO_LABEL.DEVICE_ID, placeholder: 'device id do Mercado Pago' },
];

function validateValor(tipo: DenylistTipo, valor: string): string | null {
  const trimmed = valor.trim();
  if (!trimmed) return 'Informe o valor a bloquear.';
  if (tipo === DENYLIST_TIPO.CPF) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length !== 11) return 'CPF deve ter 11 dígitos.';
  }
  if (tipo === DENYLIST_TIPO.EMAIL) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'E-mail inválido.';
  }
  return null;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminDenylist() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DenylistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const [tipo, setTipo] = useState<DenylistTipo>(DENYLIST_TIPO.CPF);
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      setEntries(await fetchDenylist());
    } catch (error) {
      setErrorText(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const valorError = validateValor(tipo, valor);
    if (valorError) { setFormError(valorError); return; }
    if (!motivo.trim()) { setFormError('Informe o motivo do bloqueio.'); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const novaEntrada = await criarDenylistEntry({ tipo, valor: valor.trim(), motivo: motivo.trim() });
      setEntries((prev) => [novaEntrada, ...prev]);
      setValor('');
      setMotivo('');
    } catch (error) {
      setFormError(handleApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemover(entry: DenylistEntry) {
    if (!window.confirm(`Remover o bloqueio de "${entry.valor}"? O item voltará a ser aceito normalmente.`)) return;
    setRemovingId(entry.id);
    try {
      await removerDenylistEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (error) {
      setErrorText(handleApiError(error));
    } finally {
      setRemovingId(null);
    }
  }

  const tipoAtual = TIPOS.find((t) => t.value === tipo) ?? TIPOS[0];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${Colors.admin}, #9C7CFF)`,
          padding: '28px 16px 16px',
          borderRadius: '0 0 20px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => navigate('/admin')}
          aria-label="Voltar ao painel admin"
          style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Voltar
        </button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Lista de bloqueio</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        <Card style={{ marginBottom: Space.lg }}>
          <form onSubmit={handleSubmit} noValidate>
            <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.md }}>
              Adicionar bloqueio
            </span>

            <div style={{ marginBottom: Space.md }}>
              <label htmlFor="denylist-tipo" style={{ fontSize: Font.xs, fontWeight: 600, color: Colors.textSecondary, display: 'block', marginBottom: 6 }}>
                Tipo
              </label>
              <select
                id="denylist-tipo"
                value={tipo}
                onChange={(e) => { setTipo(e.target.value as DenylistTipo); setFormError(''); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: Radius.md, border: `1px solid ${Colors.border}`, fontSize: Font.sm, backgroundColor: Colors.card, color: Colors.textPrimary }}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: Space.md }}>
              <label htmlFor="denylist-valor" style={{ fontSize: Font.xs, fontWeight: 600, color: Colors.textSecondary, display: 'block', marginBottom: 6 }}>
                Valor a bloquear
              </label>
              <input
                id="denylist-valor"
                type="text"
                value={valor}
                onChange={(e) => { setValor(e.target.value); setFormError(''); }}
                placeholder={tipoAtual.placeholder}
                style={{ width: '100%', padding: '10px 12px', borderRadius: Radius.md, border: `1px solid ${Colors.border}`, fontSize: Font.sm, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: Space.md }}>
              <label htmlFor="denylist-motivo" style={{ fontSize: Font.xs, fontWeight: 600, color: Colors.textSecondary, display: 'block', marginBottom: 6 }}>
                Motivo
              </label>
              <input
                id="denylist-motivo"
                type="text"
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setFormError(''); }}
                placeholder="Ex.: chargeback confirmado, cartão roubado"
                style={{ width: '100%', padding: '10px 12px', borderRadius: Radius.md, border: `1px solid ${Colors.border}`, fontSize: Font.sm, boxSizing: 'border-box' }}
              />
            </div>

            {formError && (
              <div role="alert" style={{ fontSize: Font.xs, color: Colors.error, fontWeight: 600, marginBottom: Space.md }}>{formError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', backgroundColor: Colors.admin, borderRadius: Radius.md, padding: 14, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Adicionando...' : 'Adicionar bloqueio'}
            </button>
          </form>
        </Card>

        {errorText && !loading && (
          <div style={{ backgroundColor: Colors.errorLight, border: `1px solid ${Colors.error}`, borderRadius: Radius.md, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: Space.lg }}>
            <span role="alert" style={{ flex: 1, fontSize: 13, color: Colors.error, fontWeight: 600 }}>{errorText}</span>
            <button type="button" onClick={load} style={{ backgroundColor: Colors.error, color: '#fff', border: 'none', borderRadius: Radius.sm, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : entries.length === 0 && !errorText ? (
          <EmptyState title="Nenhum bloqueio" subtitle="Nenhum CPF, e-mail, cartão ou dispositivo bloqueado no momento." />
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} style={{ marginBottom: Space.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: Font.xs, fontWeight: 700, color: Colors.admin, textTransform: 'uppercase' }}>{DENYLIST_TIPO_LABEL[entry.tipo]}</span>
                  <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary, marginTop: 2 }}>{entry.valor}</div>
                  {entry.motivo && <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>{entry.motivo}</div>}
                  <div style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 4 }}>
                    Criado em {formatDate(entry.criadoEm)}{entry.expiraEm ? ` · Expira em ${formatDate(entry.expiraEm)}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemover(entry)}
                  disabled={removingId === entry.id}
                  aria-label={`Remover bloqueio de ${entry.valor}`}
                  style={{ backgroundColor: Colors.errorLight, border: 'none', borderRadius: Radius.sm, padding: '8px 10px', cursor: removingId === entry.id ? 'not-allowed' : 'pointer', opacity: removingId === entry.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="x-circle" size={14} color={Colors.error} />
                  <span style={{ fontSize: Font.xs, fontWeight: 700, color: Colors.error }}>Remover</span>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
