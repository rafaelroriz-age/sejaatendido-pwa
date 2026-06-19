import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMinhaDisponibilidade,
  saveMinhaDisponibilidade,
  fetchHorariosBloqueados,
  criarHorarioBloqueado,
  deletarHorarioBloqueado,
  DisponibilidadeItem,
  HorarioBloqueado,
} from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DEFAULT_DISPONIBILIDADE: DisponibilidadeItem[] = [
  { diaSemana: 1, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: false },
  { diaSemana: 2, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: false },
  { diaSemana: 3, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: false },
  { diaSemana: 4, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: false },
  { diaSemana: 5, horaInicio: '08:00', horaFim: '18:00', duracaoSlot: 60, ativo: false },
  { diaSemana: 6, horaInicio: '08:00', horaFim: '13:00', duracaoSlot: 60, ativo: false },
];

function mergeDisponibilidade(saved: DisponibilidadeItem[]): DisponibilidadeItem[] {
  return DEFAULT_DISPONIBILIDADE.map(def => {
    const existing = saved.find(s => s.diaSemana === def.diaSemana);
    return existing ? { ...def, ...existing } : def;
  });
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return (h * 60) + m;
}

export default function DoctorSchedule() {
  const navigate = useNavigate();

  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeItem[]>(DEFAULT_DISPONIBILIDADE);
  const [bloqueados, setBloqueados] = useState<HorarioBloqueado[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // New block form
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockTime, setNewBlockTime] = useState('08:00');
  const [newBlockDuracao, setNewBlockDuracao] = useState(60);
  const [newBlockMotivo, setNewBlockMotivo] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [disp, blk] = await Promise.all([
          fetchMinhaDisponibilidade(),
          fetchHorariosBloqueados(),
        ]);
        setDisponibilidade(mergeDisponibilidade(disp));
        setBloqueados(blk);
      } catch (e) {
        showErrorAlert(e, 'Erro ao carregar agenda');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateDay(index: number, field: keyof DisponibilidadeItem, value: unknown) {
    setDisponibilidade(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  async function handleSaveDisponibilidade() {
    for (const d of disponibilidade) {
      if (!d.ativo) continue;
      const inicio = toMinutes(d.horaInicio);
      const fim = toMinutes(d.horaFim);
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
        window.alert(`No dia ${DIAS[d.diaSemana]}, o horário de fim deve ser maior que o horário de início.`);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await saveMinhaDisponibilidade(disponibilidade);
      setDisponibilidade(mergeDisponibilidade(result));
      window.alert('Disponibilidade salva com sucesso!');
    } catch (e) {
      showErrorAlert(e, 'Erro ao salvar disponibilidade');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlock() {
    if (!newBlockDate || !newBlockTime) { window.alert('Informe data e hora do bloqueio'); return; }
    setAddingBlock(true);
    try {
      const [h, m] = newBlockTime.split(':');
      const dt = new Date(newBlockDate);
      dt.setHours(parseInt(h), parseInt(m), 0, 0);
      const novo = await criarHorarioBloqueado({
        dataHora: dt.toISOString(),
        duracao: newBlockDuracao,
        motivo: newBlockMotivo || undefined,
      });
      setBloqueados(prev => [...prev, novo]);
      setNewBlockDate('');
      setNewBlockTime('08:00');
      setNewBlockDuracao(60);
      setNewBlockMotivo('');
    } catch (e) {
      showErrorAlert(e, 'Erro ao bloquear horário');
    } finally {
      setAddingBlock(false);
    }
  }

  async function handleDeleteBlock(id: string) {
    if (!window.confirm('Desbloquear este horário?')) return;
    try {
      await deletarHorarioBloqueado(id);
      setBloqueados(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      showErrorAlert(e, 'Erro ao desbloquear horário');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}>
        <div className="spinner--primary spinner" />
        <p style={{ marginTop: 12, color: Colors.textSecondary }}>Carregando agenda...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${Colors.gradientStart ?? Colors.primary}, ${Colors.gradientEnd ?? Colors.primaryDark ?? Colors.primary})`,
        padding: '28px 16px 16px', borderRadius: `0 0 ${Radius.xl ?? 20}px ${Radius.xl ?? 20}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Minha Agenda</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: 20 }}>
        {/* ── Disponibilidade semanal ── */}
        <div style={{ backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.xl, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: 4 }}>Disponibilidade Semanal</h3>
          <p style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginBottom: Space.lg }}>
            Ative os dias e configure os horários de atendimento. Enviar salva a agenda completa.
          </p>

          {disponibilidade.map((d, i) => (
            <div key={d.diaSemana} style={{
              backgroundColor: d.ativo ? `${Colors.primary}14` : Colors.inputBg,
              borderRadius: Radius.md, padding: Space.lg, marginBottom: 10,
              border: `1px solid ${d.ativo ? Colors.primary : Colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.ativo ? 12 : 0 }}>
                <span style={{ fontSize: Font.sm + 1, fontWeight: 700, color: d.ativo ? Colors.primary : Colors.textPrimary }}>
                  {DIAS[d.diaSemana]}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: Font.xs + 1, color: Colors.textSecondary }}>{d.ativo ? 'Ativo' : 'Inativo'}</span>
                  <input
                    type="checkbox"
                    checked={d.ativo ?? false}
                    onChange={e => updateDay(i, 'ativo', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: Colors.primary }}
                  />
                </label>
              </div>

              {d.ativo && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>INÍCIO</label>
                    <input
                      type="time"
                      value={d.horaInicio}
                      onChange={e => updateDay(i, 'horaInicio', e.target.value)}
                      style={{ width: '100%', backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>FIM</label>
                    <input
                      type="time"
                      value={d.horaFim}
                      onChange={e => updateDay(i, 'horaFim', e.target.value)}
                      style={{ width: '100%', backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>SLOT (min)</label>
                    <select
                      value={d.duracaoSlot ?? 60}
                      onChange={e => updateDay(i, 'duracaoSlot', parseInt(e.target.value))}
                      style={{ width: '100%', backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
                    >
                      {[15, 20, 30, 45, 60, 90].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSaveDisponibilidade}
            disabled={saving}
            style={{
              width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 16,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer', marginTop: Space.md,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: saving ? 0.6 : 1, boxShadow: `0 6px 12px ${Colors.primary}59`,
            }}
          >
            {saving ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Salvar Disponibilidade</span>}
          </button>
        </div>

        {/* ── Horários Bloqueados ── */}
        <div style={{ backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.xl, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginBottom: 4 }}>Bloquear Horário</h3>
          <p style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginBottom: Space.lg }}>
            Bloqueie datas/horários pontuais (feriados, ausências, etc.).
          </p>

          {/* Add block form */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: Space.md }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>DATA</label>
              <input
                type="date"
                value={newBlockDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setNewBlockDate(e.target.value)}
                style={{ width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>HORA</label>
              <input
                type="time"
                value={newBlockTime}
                onChange={e => setNewBlockTime(e.target.value)}
                style={{ width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, display: 'block', marginBottom: 4 }}>DURAÇÃO (min)</label>
              <select
                value={newBlockDuracao}
                onChange={e => setNewBlockDuracao(parseInt(e.target.value))}
                style={{ width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '8px 10px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary }}
              >
                {[15, 30, 60, 120, 240, 480].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
            </div>
          </div>
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={newBlockMotivo}
            onChange={e => setNewBlockMotivo(e.target.value)}
            style={{ width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '10px 12px', border: `1px solid ${Colors.border}`, fontSize: Font.sm, color: Colors.textPrimary, marginBottom: Space.md, boxSizing: 'border-box' }}
          />
          <button
            onClick={handleAddBlock}
            disabled={addingBlock}
            style={{
              width: '100%', backgroundColor: Colors.error, borderRadius: Radius.md, padding: 14,
              border: 'none', cursor: addingBlock ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: addingBlock ? 0.6 : 1,
            }}
          >
            {addingBlock ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Bloquear Horário</span>}
          </button>

          {/* List blocked */}
          {bloqueados.length > 0 && (
            <div style={{ marginTop: Space.lg }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Bloqueios Ativos
              </div>
              {bloqueados.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: '10px 14px', marginBottom: 8,
                  border: `1px solid ${Colors.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary }}>
                      {new Date(b.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {b.duracao ? ` — ${b.duracao} min` : ''}
                    </div>
                    {b.motivo && <div style={{ fontSize: Font.xs, color: Colors.textSecondary }}>{b.motivo}</div>}
                  </div>
                  <button
                    onClick={() => b.id && handleDeleteBlock(b.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.error, fontSize: Font.sm, fontWeight: 700, padding: '4px 8px' }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
