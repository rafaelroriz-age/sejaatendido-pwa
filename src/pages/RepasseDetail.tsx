import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchRepasseById, Repasse } from '../services/api';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function maskPixKey(key?: string): string {
  if (!key) return '---';
  if (key.length <= 6) return key;
  return key.slice(0, 3) + '***' + key.slice(-3);
}

function StatusBadgeLarge({ status }: { status: string }) {
  const cfg =
    status === 'concluido'
      ? { bg: Colors.successLight, color: Colors.success, label: 'Concluído' }
      : status === 'erro'
      ? { bg: Colors.errorLight, color: Colors.error, label: 'Erro no repasse' }
      : { bg: Colors.warningLight, color: Colors.warning, label: 'Pendente' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: cfg.bg, paddingLeft: Space.lg, paddingRight: Space.lg, paddingTop: Space.sm, paddingBottom: Space.sm, borderRadius: Radius.full, gap: Space.sm }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />
      <span style={{ fontSize: Font.sm, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

export default function RepasseDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [repasse, setRepasse] = useState<Repasse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRepasse(); }, []);

  async function loadRepasse() {
    try {
      const data = await fetchRepasseById(id!);
      setRepasse(data);
    } catch {
      setRepasse({
        id: id!, periodo: '10 mar - 16 mar', valor: 750, status: 'concluido',
        data_repasse: '2026-03-16', chave_pix_destino: '***.***.***-00', comprovante_url: '',
        consultas: [
          { id: '1', paciente: 'Maria Santos', horario: '09:00', valor: 150, status: 'confirmado' },
          { id: '2', paciente: 'Joao Oliveira', horario: '10:30', valor: 200, status: 'confirmado' },
          { id: '3', paciente: 'Ana Costa', horario: '14:00', valor: 150, status: 'confirmado' },
          { id: '4', paciente: 'Carlos Pereira', horario: '08:30', valor: 250, status: 'confirmado' },
        ],
      });
    } finally { setLoading(false); }
  }

  const headerStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${Colors.doctor}, #26A69A)`,
    padding: '28px 16px 16px', borderRadius: '0 0 20px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
          <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Detalhe do Repasse</span>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: 20, paddingTop: Space.lg }}>
          <Skeleton height={120} radius={Radius.lg} style={{ marginBottom: Space.md }} />
          <Skeleton height={80} radius={Radius.lg} style={{ marginBottom: Space.md }} />
          <Skeleton height={60} radius={Radius.md} style={{ marginBottom: Space.md }} />
          <Skeleton height={60} radius={Radius.md} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Detalhe do Repasse</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: 20, paddingTop: Space.lg }}>
        {/* Amount card */}
        <Card style={{ textAlign: 'center' as const, paddingTop: Space.xl, paddingBottom: Space.xl, marginBottom: Space.lg }}>
          <span style={{ fontSize: Font.xs, fontWeight: 600, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Valor repassado</span>
          <span style={{ fontSize: Font.xxl, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.xs, marginBottom: Space.md, display: 'block' }}>{formatCurrency(repasse?.valor ?? 0)}</span>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StatusBadgeLarge status={repasse?.status ?? 'pendente'} />
          </div>
        </Card>

        {/* Info rows */}
        <Card style={{ marginBottom: Space.lg }}>
          {[
            { label: 'Período', value: repasse?.periodo ?? '---' },
            { label: 'Data do repasse', value: repasse?.data_repasse ? new Date(repasse.data_repasse).toLocaleDateString('pt-BR') : '---' },
            { label: 'Chave Pix destino', value: maskPixKey(repasse?.chave_pix_destino) },
          ].map((row, i, arr) => (
            <React.Fragment key={row.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${Space.md}px 0` }}>
                <span style={{ fontSize: Font.sm, color: Colors.textSecondary, fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary }}>{row.value}</span>
              </div>
              {i < arr.length - 1 && <div style={{ height: 1, backgroundColor: Colors.borderLight }} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Comprovante */}
        {repasse?.status === 'concluido' && (
          <button onClick={() => {
            if (repasse?.comprovante_url) window.open(repasse.comprovante_url, '_blank');
            else window.alert('Comprovante ainda não disponível.');
          }} style={{
            width: '100%', backgroundColor: Colors.doctor, borderRadius: 14, padding: 16, border: 'none',
            cursor: 'pointer', marginBottom: Space.lg, boxShadow: `0 6px 12px ${Colors.doctor}59`,
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Ver comprovante</span>
          </button>
        )}

        {/* Consultas list */}
        {(repasse?.consultas?.length ?? 0) > 0 && (
          <>
            <span style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: Space.md, display: 'block', letterSpacing: -0.3 }}>Consultas do período</span>
            {repasse!.consultas!.map(c => (
              <Card key={c.id} style={{ marginBottom: Space.md }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar name={c.paciente} size={38} color={Colors.doctor} />
                  <div style={{ flex: 1, marginLeft: Space.md }}>
                    <span style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary, display: 'block' }}>{c.paciente}</span>
                    <span style={{ fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2, display: 'block' }}>{c.horario}</span>
                  </div>
                  <span style={{ fontSize: Font.sm, fontWeight: 800, color: Colors.textPrimary }}>{formatCurrency(c.valor)}</span>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
