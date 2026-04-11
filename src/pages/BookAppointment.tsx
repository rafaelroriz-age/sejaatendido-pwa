import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMedicos, createConsulta, Medico } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import Avatar from '../components/Avatar';

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

export default function BookAppointment() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; });

  useEffect(() => {
    fetchMedicos().then(setMedicos).catch(e => showErrorAlert(e, 'Erro ao carregar médicos')).finally(() => setLoading(false));
  }, []);

  async function handleConfirm() {
    if (!selectedMedico || !selectedDate || !selectedTime) { window.alert('Selecione médico, data e horário'); return; }
    const dateObj = new Date(selectedDate);
    const [h, m] = selectedTime.split(':');
    dateObj.setHours(parseInt(h), parseInt(m), 0, 0);
    setSubmitting(true);
    try {
      await createConsulta({ medicoId: selectedMedico.id, data: dateObj.toISOString(), motivo: motivo || 'Consulta geral' });
      window.alert('Consulta agendada com sucesso!');
      navigate(-1);
    } catch (error) { showErrorAlert(error, 'Erro ao agendar consulta'); }
    finally { setSubmitting(false); }
  }

  function formatDateShort(d: Date) {
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    return { dia: dias[d.getDay()], num: d.getDate().toString().padStart(2, '0'), mes: (d.getMonth() + 1).toString().padStart(2, '0') };
  }

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: Colors.bg }}><div className="spinner--primary spinner" /><p style={{ marginTop: 12, color: Colors.textSecondary }}>Carregando médicos...</p></div>;

  const currentStep = selectedMedico ? (selectedDate && selectedTime ? 3 : 2) : 1;

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
            return (
              <div key={m.id} onClick={() => setSelectedMedico(m)}
                style={{ minWidth: 130, backgroundColor: sel ? Colors.accent : Colors.card, borderRadius: Radius.lg, padding: Space.lg, textAlign: 'center', border: `2px solid ${sel ? Colors.primary : Colors.border}`, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', flexShrink: 0 }}
              >
                <Avatar name={m.usuario.nome} size={52} color={sel ? Colors.primary : Colors.textMuted} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: Font.xs + 1, fontWeight: 700, color: sel ? Colors.primary : Colors.textPrimary, marginTop: Space.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Dr(a). {m.usuario.nome}</div>
                <div style={{ fontSize: 11, color: sel ? Colors.primaryDark : Colors.textSecondary, marginTop: 2 }}>{m.especialidades?.[0] || 'Clínico Geral'}</div>
              </div>
            );
          })}
        </div>

        <h4 style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary, marginTop: Space.lg, marginBottom: Space.md, letterSpacing: -0.3 }}>Data</h4>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          {dates.map(d => {
            const f = formatDateShort(d);
            const iso = d.toISOString().split('T')[0];
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {TIME_SLOTS.map(slot => {
            const sel = selectedTime === slot;
            return (
              <div key={slot} onClick={() => setSelectedTime(slot)}
                style={{ minWidth: 72, backgroundColor: sel ? Colors.primary : Colors.card, borderRadius: Radius.md, padding: '12px 16px', textAlign: 'center', border: `2px solid ${sel ? Colors.primary : Colors.border}`, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: sel ? '#fff' : Colors.textPrimary }}>{slot}</span>
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
