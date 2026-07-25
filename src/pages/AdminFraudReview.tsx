import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCasosRisco,
  decidirCasoRisco,
  CasoRisco,
} from '../services/api';
import { handleApiError } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SkeletonCard } from '../components/Skeleton';
import RiskBadge from '../components/RiskBadge';
import { CASO_REVISAO_STATUS, CasoRevisaoStatus } from '../constants/riscoStatus';

type FiltroTab = CasoRevisaoStatus | 'TODOS';

const TABS: { key: FiltroTab; label: string }[] = [
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'APROVADO', label: 'Aprovados' },
  { key: 'BLOQUEADO', label: 'Bloqueados' },
  { key: 'TODOS', label: 'Todos' },
];

function formatCurrency(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminFraudReview() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FiltroTab>('PENDENTE');
  const [casos, setCasos] = useState<CasoRisco[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (t: FiltroTab) => {
    setLoading(true);
    setErrorText('');
    try {
      const data = await fetchCasosRisco(t);
      setCasos(data);
    } catch (error) {
      setErrorText(handleApiError(error));
      setCasos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function handleAprovar(caso: CasoRisco) {
    setActionId(caso.id);
    setFeedback('');
    try {
      await decidirCasoRisco(caso.id, 'APROVAR');
      setCasos((prev) => prev.filter((c) => c.id !== caso.id));
      setFeedback(`Caso de ${caso.paciente?.nome ?? 'paciente'} aprovado.`);
    } catch (error) {
      setFeedback(handleApiError(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleBloquear(caso: CasoRisco) {
    const motivo = window.prompt('Informe o motivo do bloqueio (obrigatório):');
    if (!motivo || !motivo.trim()) {
      setFeedback('Informe o motivo do bloqueio para continuar.');
      return;
    }
    setActionId(caso.id);
    setFeedback('');
    try {
      await decidirCasoRisco(caso.id, 'BLOQUEAR', motivo.trim());
      setCasos((prev) => prev.filter((c) => c.id !== caso.id));
      setFeedback(`Caso de ${caso.paciente?.nome ?? 'paciente'} bloqueado.`);
    } catch (error) {
      setFeedback(handleApiError(error));
    } finally {
      setActionId(null);
    }
  }

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
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Revisão de risco</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div
          role="tablist"
          aria-label="Filtrar casos por status"
          style={{ display: 'flex', gap: 4, backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: 4, marginBottom: Space.lg, overflowX: 'auto' }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: '0 0 auto',
                padding: `${Space.sm}px ${Space.md}px`,
                borderRadius: Radius.sm,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: Font.xs + 1,
                fontWeight: 700,
                backgroundColor: tab === t.key ? Colors.admin : 'transparent',
                color: tab === t.key ? '#fff' : Colors.textSecondary,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div aria-live="polite" style={{ marginBottom: feedback ? Space.md : 0 }}>
          {feedback && (
            <div style={{ backgroundColor: Colors.infoLight, borderRadius: Radius.md, padding: '10px 14px', fontSize: Font.xs + 1, color: Colors.info, fontWeight: 600 }}>
              {feedback}
            </div>
          )}
        </div>

        {errorText && !loading && (
          <div style={{ backgroundColor: Colors.errorLight, border: `1px solid ${Colors.error}`, borderRadius: Radius.md, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: Space.lg }}>
            <span role="alert" style={{ flex: 1, fontSize: 13, color: Colors.error, fontWeight: 600 }}>{errorText}</span>
            <button type="button" onClick={() => load(tab)} style={{ backgroundColor: Colors.error, color: '#fff', border: 'none', borderRadius: Radius.sm, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : casos.length === 0 && !errorText ? (
          <EmptyState title="Nenhum caso" subtitle="Não há casos de risco nesta categoria no momento." />
        ) : (
          casos.map((caso) => (
            <Card key={caso.id} style={{ marginBottom: Space.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Space.sm }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: Font.md, fontWeight: 700, color: Colors.textPrimary }}>{caso.paciente?.nome ?? 'Paciente'}</div>
                  {caso.paciente?.email && <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 }}>{caso.paciente.email}</div>}
                  <div style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 4 }}>{formatDate(caso.criadoEm)}</div>
                </div>
                <RiskBadge faixa={caso.riscoAvaliacao?.faixa} score={caso.riscoAvaliacao?.score} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: Space.sm }}>
                <span style={{ fontSize: Font.sm, color: Colors.textSecondary }}>
                  {caso.pagamento?.metodo ? `Pagamento (${caso.pagamento.metodo})` : 'Pagamento'}
                </span>
                <span style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary }}>{formatCurrency(caso.pagamento?.valor)}</span>
              </div>

              {caso.motivo && (
                <div style={{ fontSize: Font.xs, color: Colors.textSecondary, marginBottom: Space.sm }}>Motivo: {caso.motivo}</div>
              )}

              {caso.status === CASO_REVISAO_STATUS.PENDENTE && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {actionId === caso.id ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: 12 }}><div className="spinner--primary spinner" style={{ margin: '0 auto' }} /></div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAprovar(caso)}
                        aria-label={`Aprovar caso de ${caso.paciente?.nome ?? 'paciente'}`}
                        style={{ flex: 1, backgroundColor: Colors.success, borderRadius: Radius.md, padding: 12, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Icon name="check-circle" size={16} color="#fff" /> Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBloquear(caso)}
                        aria-label={`Bloquear caso de ${caso.paciente?.nome ?? 'paciente'}`}
                        style={{ flex: 1, backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, border: 'none', color: Colors.error, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Icon name="x-circle" size={16} color={Colors.error} /> Bloquear
                      </button>
                    </>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
