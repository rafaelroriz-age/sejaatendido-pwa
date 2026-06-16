import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { fetchCrmStatus, validarCrmQr, CrmStatusResponse } from '../services/api';
import { getUser, saveUser } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import axios from 'axios';

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';

export default function CrmValidation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CrmStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Camera QR scanner
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Paste mode
  const [pasteMode, setPasteMode] = useState(false);
  const [pastePayload, setPastePayload] = useState('');

  // ── Load current CRM status ─────────────────────────────────────────────────
  useEffect(() => {
    fetchCrmStatus()
      .then(setStatus)
      .catch(() => {
        // If endpoint doesn't exist yet, show as unvalidated
        setStatus({ crmCartaoValidado: false });
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  async function openCamera() {
    setFeedback('');
    setScanState('scanning');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch {
      setScanState('error');
      setFeedback('Não foi possível acessar a câmera. Use a opção de colar o código.');
    }
  }

  function closeCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    if (scanState === 'scanning') setScanState('idle');
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      closeCamera();
      submitPayload(code.data);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  // ── Submission ──────────────────────────────────────────────────────────────
  async function submitPayload(payload: string) {
    setScanState('loading');
    setFeedback('');
    try {
      const result = await validarCrmQr(payload);
      setStatus(result);
      // Persist updated CRM info in local user session
      const user = await getUser();
      if (user) {
        await saveUser({
          ...user,
          crmCartaoValidado: result.crmCartaoValidado,
          crmNumero: result.crmNumero,
          crmUf: result.crmUf,
        });
      }
      setScanState('success');
      setFeedback('Carteirinha CRM validada com sucesso!');
      setPastePayload('');
    } catch (error) {
      setScanState('error');
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg = (error.response?.data as Record<string, string>)?.message
          ?? (error.response?.data as Record<string, string>)?.erro;
        if (status === 400) { setFeedback(msg ?? 'QR Code inválido ou não reconhecido. Tente novamente.'); return; }
        if (status === 409) { setFeedback(msg ?? 'Este CRM já foi validado em outra conta.'); return; }
      }
      showErrorAlert(error, 'Erro ao validar CRM');
    }
  }

  function handlePasteSubmit() {
    const trimmed = pastePayload.trim();
    if (!trimmed) { setFeedback('Cole o conteúdo do QR Code antes de enviar.'); return; }
    submitPayload(trimmed);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${Colors.doctor}, #26A69A)`,
        padding: '28px 20px 20px',
        borderRadius: `0 0 ${Radius.xl}px ${Radius.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ color: '#fff', fontSize: Font.sm, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Voltar
        </button>
        <span style={{ color: '#fff', fontSize: Font.lg - 2, fontWeight: 800 }}>Validação do CRM</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: 20 }}>
        {/* Status card */}
        <div style={{
          backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: Space.xl,
        }}>
          {loadingStatus ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <div className="spinner--primary spinner" />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: Space.lg }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: status?.crmCartaoValidado ? Colors.successLight : Colors.warningLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {status?.crmCartaoValidado ? '✅' : '⏳'}
                </div>
                <div>
                  <div style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary }}>
                    {status?.crmCartaoValidado ? 'CRM Validado' : 'CRM Pendente de Validação'}
                  </div>
                  <div style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2 }}>
                    {status?.crmCartaoValidado
                      ? 'Sua carteirinha profissional foi verificada.'
                      : 'Escaneie ou cole o QR Code da sua carteirinha.'}
                  </div>
                </div>
              </div>

              {(status?.crmNumero || status?.crmUf) && (
                <div style={{
                  backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: Space.lg,
                  display: 'flex', gap: Space.xl,
                }}>
                  {status.crmNumero && (
                    <div>
                      <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>CRM</div>
                      <div style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary, marginTop: 2 }}>{status.crmNumero}</div>
                    </div>
                  )}
                  {status.crmUf && (
                    <div>
                      <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>UF</div>
                      <div style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary, marginTop: 2 }}>{status.crmUf}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{
            borderRadius: Radius.md, padding: `${Space.sm + 2}px ${Space.lg}px`,
            marginBottom: Space.lg,
            backgroundColor: scanState === 'success' ? Colors.successLight : Colors.errorLight,
            border: `1px solid ${scanState === 'success' ? Colors.success : Colors.error}40`,
          }}>
            <span style={{
              fontSize: Font.sm, fontWeight: 600,
              color: scanState === 'success' ? Colors.success : Colors.error,
            }}>
              {feedback}
            </span>
          </div>
        )}

        {/* Loading state */}
        {scanState === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: Space.xl }}>
            <div className="spinner--primary spinner" />
          </div>
        )}

        {/* Action buttons */}
        {scanState !== 'loading' && !status?.crmCartaoValidado && (
          <>
            {/* Option A – Camera */}
            <button
              onClick={openCamera}
              style={{
                width: '100%', backgroundColor: Colors.doctor, borderRadius: Radius.md,
                padding: Space.lg, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: Space.md, boxShadow: `0 6px 12px ${Colors.doctor}59`,
              }}
            >
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Escanear QR da Carteirinha</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: Space.md }}>
              <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
              <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>ou</span>
              <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            </div>

            {/* Option B – Paste */}
            <button
              onClick={() => { setPasteMode(m => !m); setFeedback(''); }}
              style={{
                width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md,
                padding: Space.lg, border: `2px solid ${Colors.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: pasteMode ? Space.md : 0,
              }}
            >
              <span style={{ fontSize: 20 }}>📋</span>
              <span style={{ color: Colors.textPrimary, fontSize: Font.md, fontWeight: 700 }}>
                {pasteMode ? 'Fechar campo de texto' : 'Colar conteúdo do QR Code'}
              </span>
            </button>

            {pasteMode && (
              <>
                <textarea
                  value={pastePayload}
                  onChange={e => { setPastePayload(e.target.value); setFeedback(''); }}
                  placeholder="Cole aqui o conteúdo lido do QR Code da sua carteirinha CRM…"
                  rows={5}
                  style={{
                    width: '100%', borderRadius: Radius.md, padding: Space.lg,
                    fontSize: Font.sm, color: Colors.textPrimary, backgroundColor: Colors.inputBg,
                    border: `1px solid ${Colors.border}`, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={handlePasteSubmit}
                  style={{
                    width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md,
                    padding: Space.lg, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: Space.sm, boxShadow: `0 6px 12px ${Colors.primary}59`,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Validar CRM</span>
                </button>
              </>
            )}
          </>
        )}

        {/* Re-validate button if already validated */}
        {scanState !== 'loading' && status?.crmCartaoValidado && (
          <button
            onClick={openCamera}
            style={{
              width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md,
              padding: Space.lg, border: `2px solid ${Colors.border}`,
              cursor: 'pointer', color: Colors.textSecondary, fontSize: Font.sm, fontWeight: 600,
            }}
          >
            Revalidar carteirinha
          </button>
        )}
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div style={{
            width: '100%', maxWidth: 400, backgroundColor: Colors.card,
            borderRadius: Radius.xl, overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: `${Space.lg}px ${Space.xl}px`,
              borderBottom: `1px solid ${Colors.border}`,
            }}>
              <span style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary }}>
                Apontar para o QR Code
              </span>
              <button
                onClick={closeCamera}
                aria-label="Fechar câmera"
                style={{
                  width: 36, height: 36, borderRadius: 18, border: 'none',
                  backgroundColor: Colors.inputBg, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: Colors.textPrimary,
                }}
              >
                ✕
              </button>
            </div>

            {/* Video feed */}
            <div style={{ position: 'relative', backgroundColor: '#000' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
              />
              {/* Scan overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 180, height: 180, border: '3px solid rgba(255,255,255,0.8)',
                  borderRadius: 12, boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)',
                }} />
              </div>
            </div>

            <div style={{ padding: Space.lg, textAlign: 'center' }}>
              <span style={{ fontSize: Font.sm, color: Colors.textSecondary }}>
                Centralize o QR Code da carteirinha CRM no quadro acima.
              </span>
            </div>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  );
}
