import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../storage/localStorage';
import { fetchPreferenciasNotificacao, savePreferenciasNotificacao } from '../services/api';
import Colors from '../theme/colors';

interface Prefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  confirmacaoAgendamento: boolean;
  lembrete24h: boolean;
  lembrete1h: boolean;
  cancelamentos: boolean;
  prescricoes: boolean;
}

const DEFAULT_PREFS: Prefs = {
  pushEnabled: true, emailEnabled: false, whatsappEnabled: false, whatsappNumber: '',
  confirmacaoAgendamento: true, lembrete24h: true, lembrete1h: true,
  cancelamentos: true, prescricoes: true,
};

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  const c = color || Colors.primary;
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 48, height: 28, borderRadius: 14, cursor: 'pointer', position: 'relative',
      backgroundColor: value ? c : Colors.border, transition: 'background 0.2s',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', position: 'absolute', top: 3,
        left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [isPaciente, setIsPaciente] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const user = await getUser();
      if (user) setIsPaciente(user.tipo === 'PACIENTE');
      const data = await fetchPreferenciasNotificacao();
      if (data) setPrefs({ ...DEFAULT_PREFS, ...data });
    } catch {} finally { setLoading(false); }
  }

  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function handleSave() {
    if (prefs.whatsappEnabled && prefs.whatsappNumber.replace(/\D/g, '').length < 10) {
      window.alert('Informe um número de WhatsApp válido.'); return;
    }
    setSaving(true);
    try {
      await savePreferenciasNotificacao(prefs);
      setHasChanges(false);
      window.alert('Preferências de notificação salvas!');
    } catch { window.alert('Não foi possível salvar as preferências.'); }
    finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: Colors.inputBg, borderRadius: 14, padding: 16, fontSize: 16, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none', boxSizing: 'border-box' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const toggleRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${Colors.borderLight}` };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Notificações</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ padding: 20, overflowY: 'auto' }}>
        {/* Como receber */}
        <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Como receber</span>
          <span style={{ fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 16, display: 'block' }}>Escolha por quais canais deseja receber notificações</span>

          <div style={toggleRow}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'block' }}>Notificações Push</span>
              <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Alertas no celular em tempo real</span>
            </div>
            <Toggle value={prefs.pushEnabled} onChange={v => updatePref('pushEnabled', v)} />
          </div>

          <div style={toggleRow}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'block' }}>Email</span>
              <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Receba confirmações por email</span>
            </div>
            <Toggle value={prefs.emailEnabled} onChange={v => updatePref('emailEnabled', v)} />
          </div>

          <div style={{ ...toggleRow, borderBottom: 'none' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'block' }}>WhatsApp</span>
              <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Mensagens diretas no WhatsApp</span>
            </div>
            <Toggle value={prefs.whatsappEnabled} onChange={v => updatePref('whatsappEnabled', v)} color="#25D366" />
          </div>

          {prefs.whatsappEnabled && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${Colors.borderLight}` }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Número do WhatsApp</label>
              <input value={prefs.whatsappNumber} onChange={e => updatePref('whatsappNumber', maskPhone(e.target.value))} placeholder="(00) 90000-0000" style={inputStyle} />
            </div>
          )}
        </div>

        {/* Quando receber */}
        <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: Colors.textPrimary, letterSpacing: -0.3, display: 'block' }}>Quando receber</span>
          <span style={{ fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 16, display: 'block' }}>Selecione os eventos sobre os quais deseja ser notificado</span>

          {[
            { key: 'confirmacaoAgendamento' as const, label: 'Confirmação de agendamento', hint: 'Quando uma consulta for confirmada' },
            { key: 'lembrete24h' as const, label: 'Lembrete 24h antes', hint: 'Um dia antes da consulta' },
            { key: 'lembrete1h' as const, label: 'Lembrete 1h antes', hint: 'Uma hora antes da consulta' },
            { key: 'cancelamentos' as const, label: 'Cancelamentos', hint: 'Quando uma consulta for cancelada' },
          ].map((item, idx, arr) => (
            <div key={item.key} style={{ ...toggleRow, borderBottom: (!isPaciente && idx === arr.length - 1) ? 'none' : toggleRow.borderBottom }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'block' }}>{item.label}</span>
                <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>{item.hint}</span>
              </div>
              <Toggle value={prefs[item.key]} onChange={v => updatePref(item.key, v)} />
            </div>
          ))}

          {isPaciente && (
            <div style={{ ...toggleRow, borderBottom: 'none' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'block' }}>Prescrições</span>
                <span style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2, display: 'block' }}>Quando o médico enviar uma prescrição</span>
              </div>
              <Toggle value={prefs.prescricoes} onChange={v => updatePref('prescricoes', v)} />
            </div>
          )}
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !hasChanges} style={{
          width: '100%', backgroundColor: Colors.primary, borderRadius: 14, padding: 16, border: 'none',
          cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
          opacity: (saving || !hasChanges) ? 0.5 : 1,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 6px 12px ${Colors.primary}59`,
        }}>
          {saving ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{hasChanges ? 'Salvar Preferências' : 'Sem alterações'}</span>}
        </button>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
