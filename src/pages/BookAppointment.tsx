import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { fetchMedicos, createConsulta, fetchDisponibilidadeMedico, fetchMinhasConsultas, Medico } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';

// Fallback slots when doctor has no configured availability (backward compat)
const FALLBACK_TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  slots.push('00:00');
  return slots;
})();

/** Format a slot for display. Slots from API are ISO timestamps; fallbacks are "HH:MM". */
function formatSlotDisplay(slot: string): string {
  if (slot.includes('T')) {
    return new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return slot;
}

function getMedicoNome(m: Medico): string {
  const anyMedico = m as any;
  return m.usuario?.nome || anyMedico.nome || anyMedico.usuarioNome || 'Médico';
}

function getMedicoCandidateIds(m: Medico): string[] {
  const anyMedico = m as any;
  const candidates = [
    m.id,
    m.usuarioId,
    anyMedico.medicoId,
    anyMedico.usuario?.id,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  return [...new Set(candidates)];
}

function toLocalDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSlotDate(selectedDate: string, slot: string): Date {
  if (slot.includes('T')) return new Date(slot);
  const [year, month, day] = selectedDate.split('-').map(Number);
  const [hour, minute] = slot.split(':').map(Number);
  return new Date(year, (month - 1), day, hour, minute, 0, 0);
}

function areDatesClose(a?: string, b?: string, toleranceMinutes = 3): boolean {
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return Math.abs(ta - tb) <= toleranceMinutes * 60 * 1000;
}

function formatCurrencyCentavos(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'A combinar';
  return `R$ ${(Math.max(0, value) / 100).toFixed(2).replace('.', ',')}`;
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    fetchMedicos().then(setMedicos).catch(e => showErrorAlert(e, 'Erro ao carregar médicos')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function loadDisponibilidade() {
      if (!selectedMedico || !selectedDate) {
        setAvailableSlots([]);
        setAvailabilityError(false);
        return;
      }
      setAvailabilityLoading(true);
      setAvailabilityError(false);
      try {
        const slots = await fetchDisponibilidadeMedico(getMedicoCandidateIds(selectedMedico), selectedDate);
        setAvailableSlots(slots);
        if (selectedTime && !slots.includes(selectedTime)) setSelectedTime(null);
      } catch (error) {
        setAvailableSlots([]);
        setAvailabilityError(true);
        showErrorAlert(error, 'Erro ao consultar disponibilidade');
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadDisponibilidade();
  }, [selectedMedico, selectedDate]);

  async function findRecentlyCreatedConsulta(expectedIso: string, medicoIds: string[]) {
    try {
      const consultas = await fetchMinhasConsultas();
      return consultas.find((c) => {
        const consultaMedicoId = String(c.medicoId ?? c.medico?.id ?? c.medico?.usuarioId ?? '');
        return medicoIds.includes(consultaMedicoId)
          && areDatesClose(c.dataHora ?? c.data, expectedIso);
      }) ?? null;
    } catch {
      return null;
    }
  }

  async function handleConfirm() {
    if (!selectedMedico || !selectedDate || !selectedTime) { window.alert('Selecione médico, data e horário'); return; }
    if (availabilityError) {
      window.alert('Não foi possível validar a disponibilidade do médico. Tente novamente em instantes.');
      return;
    }
    if (availableSlots.length > 0 && !availableSlots.includes(selectedTime)) { window.alert('Este horário não está mais disponível. Escolha outro.'); return; }

    const selectedSlotDate = parseSlotDate(selectedDate, selectedTime);
    if (selectedSlotDate.getTime() <= Date.now()) {
      window.alert('Selecione um horário futuro para concluir o agendamento.');
      return;
    }

    // Build ISO dataHora: API slots are already ISO; fallback slots are "HH:MM"
    let dataHora: string;
    if (selectedTime.includes('T')) {
      dataHora = selectedTime;
    } else {
      const [h, m] = selectedTime.split(':');
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, (month - 1), day, parseInt(h), parseInt(m), 0, 0);
      dataHora = dateObj.toISOString();
    }

    setSubmitting(true);
    try {
      const candidateIds = getMedicoCandidateIds(selectedMedico);
      let consulta: Awaited<ReturnType<typeof createConsulta>> | null = null;
      let lastError: unknown = null;

      for (const medicoId of candidateIds) {
        try {
          consulta = await createConsulta({ medicoId, dataHora, sintomas: motivo || 'Consulta geral' });
          break;
        } catch (error) {
          lastError = error;
          if (!axios.isAxiosError(error)) break;
          const status = error.response?.status;
          const msg = String((error.response?.data as Record<string, string> | undefined)?.erro || (error.response?.data as Record<string, string> | undefined)?.message || '').toLowerCase();
          const doctorIdMismatch = status === 404 || (status === 400 && msg.includes('médico') && msg.includes('não encontrado'));
          if (!doctorIdMismatch) break;
        }
      }

      if (!consulta) {
        const maybeCreated = await findRecentlyCreatedConsulta(dataHora, candidateIds);
        if (maybeCreated) {
          consulta = maybeCreated;
        } else {
          throw lastError ?? new Error('Não foi possível criar consulta para o médico selecionado.');
        }
      }

      navigate('/payment', { state: { consultaId: consulta.id, valor: consulta.valor } });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 400) {
          const msg = (error.response?.data as Record<string, string>)?.message
            ?? (error.response?.data as Record<string, string>)?.erro
            ?? 'Não foi possível agendar. Verifique se o médico tem CRM validado.';
          window.alert(msg);
          return;
        }
        if (status === 409) {
          const maybeCreated = await findRecentlyCreatedConsulta(dataHora, getMedicoCandidateIds(selectedMedico));
          if (maybeCreated) {
            navigate('/payment', { state: { consultaId: maybeCreated.id, valor: maybeCreated.valor } });
            return;
          }
          window.alert('Conflito de agenda: o horário acabou de ser ocupado. Escolha outro slot.');
          setSelectedTime(null);
          if (selectedMedico && selectedDate) {
            const slots = await fetchDisponibilidadeMedico(getMedicoCandidateIds(selectedMedico), selectedDate);
            setAvailableSlots(slots);
          }
          return;
        }
      }
      showErrorAlert(error, 'Erro ao agendar consulta');
    }
    finally { setSubmitting(false); }
  }

  function formatDateShort(d: Date) {
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    return { dia: dias[d.getDay()], num: d.getDate().toString().padStart(2, '0'), mes: (d.getMonth() + 1).toString().padStart(2, '0') };
  }

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}><div className="spinner--primary spinner" /><p style={{ marginTop: 12, color: Colors.textSecondary }}>Carregando médicos...</p></div>;

  const currentStep = selectedMedico ? (selectedDate && selectedTime ? 3 : 2) : 1;
  const testMedico = medicos.find(m => m.valorConsulta === 10);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${Colors.gradientStart}, ${Colors.gradientEnd})`,
        padding: '28px 16px 16px', borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800, letterSpacing: -0.3 }}>Agendar Consulta</span>
        <div style={{ width: 60 }} />
      </div>

      {testMedico && (
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fff6da 0%, #ffe7b8 100%)',
            border: '1px solid #e7b35a',
            borderRadius: Radius.lg,
            padding: '14px 16px',
            boxShadow: '0 8px 18px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: '#8b5e00', textTransform: 'uppercase' }}>
              Consulta teste
            </div>
            <div style={{ fontSize: Font.md + 1, fontWeight: 900, color: Colors.textPrimary, marginTop: 4 }}>
              {formatCurrencyCentavos(testMedico.valorConsulta)}
            </div>
            <div style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 4 }}>
              Use o médico de teste {testMedico.usuario.nome} para validar pagamento, WhatsApp e repasse sem confundir com valores reais.
            </div>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: `${Space.lg}px ${Space.xl}px`, backgroundColor: Colors.card,
        margin: '0 20px', marginTop: -12, borderRadius: Radius.lg,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}>
        {['Médico', 'Data / Hora', 'Confirmar'].map((label, i) => {
          const step = i + 1; const active = step <= currentStep;
          return (
            <React.Fragment key={label}>
              {i > 0 && <div style={{ flex: 1, height: 2, backgroundColor: active ? Colors.primary : Colors.border, margin: '0 4px', marginBottom: 18 }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: active ? Colors.primary : Colors.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${active ? Colors.primary : Colors.border}`, margin: '0 auto' }}>
                  <span style={{ fontSize: Font.sm, fontWeight: 700, color: active ? '#fff' : Colors.textMuted }}>{step}</span>
                </div>
                <span style={{ fontSize: 10, color: active ? Colors.primary : Colors.textMuted, fontWeight: 600, marginTop: 4, display: 'block' }}>{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ padding: 20 }}>
        <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.lg, marginBottom: Space.md, letterSpacing: -0.3 }}>Escolha o Médico</h4>
        <div style={{ display: 'flex', gap: Space.md, overflowX: 'auto', paddingBottom: 8 }}>
          {medicos.map(m => {
            const sel = selectedMedico?.id === m.id;
            const nomeMedico = getMedicoNome(m);
            const isTestMedico = m.valorConsulta === 10;
            return (
              <div key={m.id} onClick={() => setSelectedMedico(m)}
                style={{ minWidth: 130, backgroundColor: sel ? Colors.accent : Colors.card, borderRadius: Radius.lg, padding: Space.lg, textAlign: 'center', border: `2px solid ${sel ? Colors.primary : Colors.border}`, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', flexShrink: 0 }}
              >
                <Avatar name={nomeMedico} size={52} color={sel ? Colors.primary : Colors.textMuted} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: Font.xs + 1, fontWeight: 700, color: sel ? Colors.primary : Colors.textPrimary, marginTop: Space.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Dr(a). {nomeMedico}</div>
                <div style={{ fontSize: 11, color: sel ? Colors.primaryDark : Colors.textSecondary, marginTop: 2 }}>{m.especialidades?.[0] || m.especialidade || 'Clínico Geral'}</div>
                <div style={{ fontSize: 11, color: sel ? Colors.primaryDark : Colors.textSecondary, marginTop: 2, fontWeight: 700 }}>
                  Consulta: {formatCurrencyCentavos(m.valorConsulta)}
                </div>
                {isTestMedico && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    padding: '4px 8px',
                    borderRadius: 999,
                    backgroundColor: '#fff6da',
                    color: '#8b5e00',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}>
                    Teste {formatCurrencyCentavos(m.valorConsulta)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.lg, marginBottom: Space.md, letterSpacing: -0.3 }}>Data</h4>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          {dates.map(d => {
            const f = formatDateShort(d);
            const iso = toLocalDateIso(d);
            const sel = selectedDate === iso;
            return (
              <div key={iso} onClick={() => setSelectedDate(iso)}
                style={{ minWidth: 64, backgroundColor: sel ? Colors.primary : Colors.card, borderRadius: Radius.md, padding: '14px 16px', textAlign: 'center', border: `2px solid ${sel ? Colors.primary : Colors.border}`, cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: sel ? '#fff' : Colors.textSecondary }}>{f.dia}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: sel ? '#fff' : Colors.textPrimary, margin: '2px 0' }}>{f.num}</div>
                <div style={{ fontSize: 12, color: sel ? '#fff' : Colors.textSecondary, fontWeight: 600 }}>{f.mes}</div>
              </div>
            );
          })}
        </div>

        <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.lg, marginBottom: Space.md, letterSpacing: -0.3 }}>Horário</h4>
        {!selectedMedico || !selectedDate ? (
          <div style={{ fontSize: 13, color: Colors.textMuted, marginBottom: 12 }}>Selecione médico e data para ver horários disponíveis.</div>
        ) : availabilityLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div className="spinner--primary spinner" style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>Carregando disponibilidade...</span>
          </div>
        ) : availabilityError ? (
          <div style={{ fontSize: 13, color: Colors.error, marginBottom: 12 }}>
            Não foi possível carregar os horários da agenda no momento. Aguarde e tente novamente.
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(availabilityError ? [] : (availableSlots.length > 0 ? availableSlots : FALLBACK_TIME_SLOTS)).map(slot => {
            const slotDate = selectedDate ? parseSlotDate(selectedDate, slot) : null;
            const isFutureSlot = slotDate ? slotDate.getTime() > Date.now() : false;
            const enabled = !selectedMedico || !selectedDate ? false
              : !availabilityError && (availableSlots.length === 0 || availableSlots.includes(slot)) && isFutureSlot;
            const sel = selectedTime === slot;
            return (
              <div key={slot} onClick={() => enabled && setSelectedTime(slot)}
                style={{ minWidth: 72, backgroundColor: sel ? Colors.primary : Colors.card, borderRadius: Radius.md, padding: '12px 16px', textAlign: 'center', border: `2px solid ${sel ? Colors.primary : Colors.border}`, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.45 }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: sel ? '#fff' : Colors.textPrimary }}>{formatSlotDisplay(slot)}</span>
              </div>
            );
          })}
        </div>

        <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.lg, marginBottom: Space.md, letterSpacing: -0.3 }}>Motivo (opcional)</h4>
        <textarea
          value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Descreva brevemente o motivo da consulta..."
          rows={3}
          style={{ width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Space.lg, fontSize: Font.sm + 1, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, resize: 'vertical', outline: 'none' }}
        />

        <button onClick={handleConfirm} disabled={submitting}
          style={{
            width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: Space.xl + 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: submitting ? 0.6 : 1, boxShadow: `0 6px 12px ${Colors.primary}59`,
          }}
        >
          {submitting ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>Confirmar Agendamento</span>}
        </button>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
