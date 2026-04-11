import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchSaldoMedico,
  fetchRepasses,
  SaldoMedico,
  Repasse,
  ConsultaRepasse,
} from '../services/api';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Skeleton, { SkeletonCard } from '../components/Skeleton';

const DAYS_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
type Tab = 'semana' | 'historico';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function RepasseStatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'concluido'
      ? { bg: Colors.successLight, color: Colors.success, label: 'Concluído' }
      : status === 'erro'
      ? { bg: Colors.errorLight, color: Colors.error, label: 'Erro' }
      : { bg: Colors.warningLight, color: Colors.warning, label: 'Pendente' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: cfg.bg, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, borderRadius: Radius.full, gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.color }} />
      <span style={{ fontSize: Font.xs, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function WeekChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const today = (new Date().getDay() + 6) % 7;
  return (
    <Card style={{ marginBottom: Space.lg }}>
      <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, marginBottom: Space.md, display: 'block' }}>Ganhos por dia</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 }}>
        {DAYS_LABELS.map((label, i) => {
          const pct = (data[i] ?? 0) / max;
          const barH = Math.max(6, pct * 80);
          const isToday = i === today;
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: Colors.textMuted, marginBottom: 4 }}>{data[i] > 0 ? Math.round(data[i]) : ''}</span>
              <div style={{ width: 16, borderRadius: 8, marginBottom: Space.xs, height: barH, backgroundColor: isToday ? Colors.primary : Colors.border }} />
              <span style={{ fontSize: 10, color: isToday ? Colors.primary : Colors.textMuted, fontWeight: isToday ? 700 : 600 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const DEMO_CONSULTAS: ConsultaRepasse[] = [
  { id: '1', paciente: 'Maria Santos', horario: '09:00', valor: 150, status: 'confirmado' },
  { id: '2', paciente: 'Joao Oliveira', horario: '10:30', valor: 200, status: 'pendente' },
  { id: '3', paciente: 'Ana Costa', horario: '14:00', valor: 150, status: 'confirmado' },
];

export default function Earnings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('semana');
  const [saldo, setSaldo] = useState<SaldoMedico | null>(null);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [saldoData, repassesData] = await Promise.all([
        fetchSaldoMedico().catch(() => ({ saldo_a_liberar: 0, saldo_pendente: 0, ganhos_hoje: 0, proximo_repasse: '', ganhos_semana: [0, 0, 0, 0, 0, 0, 0] })),
        fetchRepasses().catch(() => []),
      ]);
      setSaldo(saldoData);
      setRepasses(repassesData);
    } finally { setLoading(false); }
  }

  function renderSkeleton() {
    return (
      <div style={{ padding: 20 }}>
        <Skeleton height={40} radius={Radius.md} style={{ marginBottom: Space.lg }} />
        <SkeletonCard />
        <Skeleton height={60} radius={Radius.md} style={{ marginBottom: Space.md }} />
        <Skeleton height={60} radius={Radius.md} />
      </div>
    );
  }

  function renderSemana() {
    const consultas = DEMO_CONSULTAS;
    return (
      <>
        <WeekChart data={saldo?.ganhos_semana ?? [0, 0, 0, 0, 0, 0, 0]} />
        <span style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md, display: 'block', letterSpacing: -0.3 }}>Consultas da semana</span>
        {consultas.length === 0 ? (
          <EmptyState title="Nenhuma consulta" subtitle="Você ainda não teve consultas esta semana" />
        ) : consultas.map(c => (
          <Card key={c.id} style={{ marginBottom: Space.md }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar name={c.paciente} size={40} color={Colors.doctor} />
              <div style={{ flex: 1, marginLeft: Space.md }}>
                <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary, display: 'block' }}>{c.paciente}</span>
                <span style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2, display: 'block' }}>{c.horario}</span>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <span style={{ fontSize: Font.sm, fontWeight: 800, color: Colors.textPrimary, display: 'block' }}>{formatCurrency(c.valor)}</span>
                <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, borderRadius: Radius.full, marginTop: 4, backgroundColor: c.status === 'confirmado' ? Colors.successLight : Colors.warningLight, display: 'inline-block' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.status === 'confirmado' ? Colors.success : Colors.warning }}>{c.status === 'confirmado' ? 'Confirmado' : 'Pendente'}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </>
    );
  }

  function renderHistorico() {
    if (repasses.length === 0) {
      return <EmptyState title="Sem histórico" subtitle="Nenhum repasse realizado ainda. Os valores serão repassados toda segunda-feira." />;
    }
    return repasses.map(r => (
      <div key={r.id} onClick={() => navigate('/repasse/' + r.id)} style={{ cursor: 'pointer' }}>
        <Card style={{ marginBottom: Space.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary, display: 'block', marginBottom: 4 }}>{r.periodo}</span>
              <span style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary }}>{formatCurrency(r.valor)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: Space.md }}>
              <RepasseStatusBadge status={r.status} />
              <span style={{ fontSize: Font.lg, color: Colors.textMuted }}>{'>'}</span>
            </div>
          </div>
        </Card>
      </div>
    ));
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${Colors.doctor}, #26A69A)`, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Meus Ganhos</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ display: 'flex', margin: '16px 20px', backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: 4 }}>
        {(['semana', 'historico'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: `${Space.md}px 0`, borderRadius: Radius.sm, border: 'none', cursor: 'pointer',
            backgroundColor: tab === t ? Colors.card : 'transparent',
            color: tab === t ? Colors.textPrimary : Colors.textMuted,
            fontSize: Font.sm, fontWeight: tab === t ? 700 : 600,
            boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t === 'semana' ? 'Esta semana' : 'Histórico'}</button>
        ))}
      </div>

      <div style={{ padding: 20, paddingTop: Space.lg }}>
        {loading ? renderSkeleton() : tab === 'semana' ? renderSemana() : renderHistorico()}
      </div>
    </div>
  );
}
