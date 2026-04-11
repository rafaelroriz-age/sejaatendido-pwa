import React, { useEffect, useState } from 'react';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Skeleton from './Skeleton';
import { fetchSaldoMedico, SaldoMedico } from '../services/api';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function getNextMondayLabel(isoDate?: string): string {
  if (isoDate) {
    const d = new Date(isoDate);
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    return `Proximo: seg, ${day} ${month}`;
  }
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMon);
  const day = next.getDate();
  const month = next.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  return `Proximo: seg, ${day} ${month}`;
}

interface Props { onClick?: () => void; onLoaded?: (saldo: SaldoMedico) => void; }

export default function BalanceCard({ onClick, onLoaded }: Props) {
  const [saldo, setSaldo] = useState<SaldoMedico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSaldo(); }, []);

  async function loadSaldo() {
    try {
      const data = await fetchSaldoMedico();
      setSaldo(data);
      onLoaded?.(data);
    } catch {
      const fallback: SaldoMedico = { saldo_a_liberar: 0, saldo_pendente: 0, ganhos_hoje: 0, proximo_repasse: '', ganhos_semana: [0, 0, 0, 0, 0, 0, 0] };
      setSaldo(fallback);
      onLoaded?.(fallback);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ marginBottom: Space.lg }}>
        <Skeleton height={140} radius={Radius.xl} />
        <div style={{ height: Space.md }} />
        <Skeleton height={100} radius={Radius.lg} />
      </div>
    );
  }

  const today = (new Date().getDay() + 6) % 7;
  const maxGanho = Math.max(...(saldo?.ganhos_semana ?? [0]), 1);

  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        background: `linear-gradient(135deg, ${Colors.gradientStart}, ${Colors.gradientEnd})`,
        borderRadius: Radius.xl, padding: Space.xl, marginBottom: Space.md,
        boxShadow: `0 6px 12px ${Colors.primary}59`, color: '#fff',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: Font.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Disponivel para repasse
        </div>
        <div style={{ fontSize: Font.xxl, fontWeight: 800, marginTop: Space.xs, letterSpacing: -0.5 }}>
          {formatCurrency(saldo?.saldo_a_liberar ?? 0)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: Font.xs, marginTop: Space.xs }}>
          Repasse toda segunda-feira
        </div>
        <div style={{ marginTop: Space.md }}>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
            padding: `${Space.xs + 2}px ${Space.md}px`, fontSize: Font.xs, fontWeight: 600,
          }}>
            {getNextMondayLabel(saldo?.proximo_repasse)}
          </span>
        </div>
      </div>

      <div style={{
        backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.lg,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600 }}>Esta semana</div>
            <div style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary }}>
              {formatCurrency(saldo?.saldo_pendente ?? 0)}
            </div>
          </div>
          <div style={{ width: 1, height: 32, backgroundColor: Colors.border }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 600 }}>Hoje</div>
            <div style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.success }}>
              {formatCurrency(saldo?.ganhos_hoje ?? 0)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Space.lg }}>
          {DAYS.map((day, i) => {
            const barHeight = maxGanho > 0 ? Math.max(4, ((saldo?.ganhos_semana?.[i] ?? 0) / maxGanho) * 32) : 4;
            const isToday = i === today;
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 16, height: barHeight, borderRadius: 8,
                  backgroundColor: isToday ? Colors.primary : Colors.border, marginBottom: Space.xs,
                }} />
                <span style={{
                  fontSize: 10, color: isToday ? Colors.primary : Colors.textMuted,
                  fontWeight: isToday ? 700 : 600,
                }}>{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
