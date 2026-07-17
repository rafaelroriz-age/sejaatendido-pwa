import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { fetchCrmStatus, validarCrmCarteira, validarCrmQr, CrmStatusResponse } from '../services/api';
import { getUser, saveUser } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import axios from 'axios';

type ActionState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';
type ApprovalState = 'nao-enviado' | 'pendente' | 'aprovado' | 'rejeitado';

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function isPdfFile(file: File): boolean {
  const hasPdfMime = file.type === 'application/pdf';
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  return hasPdfMime || hasPdfExtension;
}

function getApprovalState(status: CrmStatusResponse | null): ApprovalState {
  if (!status) return 'nao-enviado';
  if (status.statusAprovacao === 'APROVADO') return 'aprovado';
  if (status.statusAprovacao === 'REJEITADO') return 'rejeitado';
  if (status.statusAprovacao === 'PENDENTE') return 'pendente';
  if (status.crmCartaoValidado) return 'aprovado';
  return 'nao-enviado';
}

function origemLabel(origem?: string | null): string | null {
  if (origem === 'PDF_CARTEIRA') return 'PDF da carteira do CRM';
  if (origem === 'QR_PAYLOAD') return 'QR Code (fluxo legado)';
  return null;
}

export default function CrmValidation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CrmStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Shared action feedback (used by PDF upload, camera scan and paste)
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [feedback, setFeedback] = useState('');

  // Whether the send-a-new-document section is visible (always visible until approved,
  // or after the user explicitly asks to revalidate).
  const [showSendSection, setShowSendSection] = useState(true);

  // PDF upload (primary flow)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfClientError, setPdfClientError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legacy QR flow (secondary)
  const [showLegacyFlow, setShowLegacyFlow] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastePayload, setPastePayload] = useState('');

  const approvalState = getApprovalState(status);
  const origem = origemLabel(status?.crmCartaoOrigem);

  // ── Load current CRM status ─────────────────────────────────────────────────
  useEffect(() => {
    fetchCrmStatus()
      .then((result) => {
        setStatus(result);
        setShowSendSection(getApprovalState(result) !== 'aprovado');
      })
      .catch(() => {
        // If endpoint doesn't exist yet, show as unvalidated
        setStatus({ crmCartaoValidado: false });
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  async function persistUserCrmInfo(result: CrmStatusResponse) {
    const user = await getUser();
    if (user) {
      await saveUser({
        ...user,
        crmCartaoValidado: result.crmCartaoValidado,
        crmNumero: result.crmNumero,
        crmUf: result.crmUf,
      });
    }
  }

  // ── PDF upload (primary flow) ────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setFeedback('');
    setActionState('idle');

    if (!isPdfFile(file)) {
      setPdfFile(null);
      setPdfClientError('Envie um arquivo no formato PDF (não foto ou print de tela).');
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setPdfFile(null);
      setPdfClientError('O arquivo excede o limite de 5MB. Baixe novamente o PDF original do site do CRM/CFM ou comprima-o.');
      return;
    }

    setPdfClientError('');
    setPdfFile(file);
  }

  function removeSelectedFile() {
    setPdfFile(null);
    setPdfClientError('');
  }

  async function handlePdfSubmit() {
    if (!pdfFile) return;
    setActionState('loading');
    setFeedback('');
    try {
      const result = await validarCrmCarteira(pdfFile);
      setStatus(result);
      await persistUserCrmInfo(result);
      setActionState('success');
      setFeedback(result.mensagem ?? 'Carteira CRM validada com sucesso!');
      setPdfFile(null);
      setShowSendSection(getApprovalState(result) !== 'aprovado');
    } catch (error) {
      setActionState('error');
      if (axios.isAxiosError(error)) {
        const httpStatus = error.response?.status;
        const apiMsg = (error.response?.data as Record<string, string>)?.mensagem
          ?? (error.response?.data as Record<string, string>)?.message
          ?? (error.response?.data as Record<string, string>)?.erro;

        if (httpStatus === 400) {
          setFeedback(apiMsg ?? 'Não foi possível ler o arquivo enviado. Envie um PDF válido de até 5MB.');
          return;
        }
        if (httpStatus === 409) {
          setFeedback(apiMsg ?? 'Este CRM já está validado em outra conta. Entre em contato com o suporte para regularizar seu cadastro.');
          return;
        }
        if (httpStatus === 422) {
          setFeedback(apiMsg ?? 'Não conseguimos identificar o número do CRM e a UF no arquivo enviado. Envie o PDF original baixado do site do seu CRM ou do portal do CFM (não uma foto ou print de tela).');
          return;
        }
      }
      showErrorAlert(error, 'Erro ao validar CRM');
      setFeedback('Não foi possível validar o CRM agora. Tente novamente em instantes.');
    }
  }

  // ── Camera helpers (legacy QR flow) ─────────────────────────────────────────
  async function openCamera() {
    setFeedback('');
    setActionState('scanning');
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
      setActionState('error');
      setFeedback('Não foi possível acessar a câmera. Use a opção de colar o código.');
    }
  }

  function closeCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    if (actionState === 'scanning') setActionState('idle');
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
      submitQrPayload(code.data);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  async function submitQrPayload(payload: string) {
    setActionState('loading');
    setFeedback('');
    try {
      const result = await validarCrmQr(payload);
      setStatus(result);
      await persistUserCrmInfo(result);
      setActionState('success');
      setFeedback('Carteirinha CRM validada com sucesso!');
      setPastePayload('');
      setShowSendSection(getApprovalState(result) !== 'aprovado');
    } catch (error) {
      setActionState('error');
      if (axios.isAxiosError(error)) {
        const httpStatus = error.response?.status;
        const msg = (error.response?.data as Record<string, string>)?.message
          ?? (error.response?.data as Record<string, string>)?.erro;
        if (httpStatus === 400) { setFeedback(msg ?? 'QR Code inválido ou não reconhecido. Tente novamente.'); return; }
        if (httpStatus === 409) { setFeedback(msg ?? 'Este CRM já foi validado em outra conta.'); return; }
      }
      showErrorAlert(error, 'Erro ao validar CRM');
    }
  }

  function handlePasteSubmit() {
    const trimmed = pastePayload.trim();
    if (!trimmed) { setFeedback('Cole o conteúdo do QR Code antes de enviar.'); return; }
    submitQrPayload(trimmed);
  }

  function startRevalidation() {
    setShowSendSection(true);
    setFeedback('');
    setActionState('idle');
  }

  const primaryCtaLabel = status?.crmCartaoOrigem === 'PDF_CARTEIRA' && (approvalState === 'pendente' || approvalState === 'rejeitado')
    ? 'Reenviar PDF da carteira'
    : 'Selecionar arquivo PDF';

  const legacyCtaLabel = status?.crmCartaoOrigem === 'QR_PAYLOAD' && (approvalState === 'pendente' || approvalState === 'rejeitado')
    ? 'Reenviar QR Code'
    : 'Prefere colar o QR Code?';

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
                  backgroundColor: approvalState === 'aprovado'
                    ? Colors.successLight
                    : approvalState === 'rejeitado' ? Colors.errorLight : Colors.warningLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {approvalState === 'aprovado' ? '✅' : approvalState === 'rejeitado' ? '❌' : '⏳'}
                </div>
                <div>
                  <div style={{ fontSize: Font.md + 1, fontWeight: 800, color: Colors.textPrimary }}>
                    {approvalState === 'aprovado' && 'CRM Validado'}
                    {approvalState === 'pendente' && 'CRM em Análise'}
                    {approvalState === 'rejeitado' && 'CRM Não Aprovado'}
                    {approvalState === 'nao-enviado' && 'CRM Pendente de Validação'}
                  </div>
                  <div style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2 }}>
                    {approvalState === 'aprovado' && 'Sua carteirinha profissional foi verificada.'}
                    {approvalState === 'pendente' && 'Recebemos seu envio e ele está sendo analisado.'}
                    {approvalState === 'rejeitado' && (status?.motivo ?? 'Não foi possível validar seu CRM. Tente novamente.')}
                    {approvalState === 'nao-enviado' && 'Envie o PDF da sua carteira do CRM para validar seu cadastro.'}
                  </div>
                </div>
              </div>

              {(status?.crmNumero || status?.crmUf || origem) && (
                <div style={{
                  backgroundColor: Colors.inputBg, borderRadius: Radius.md, padding: Space.lg,
                  display: 'flex', gap: Space.xl, flexWrap: 'wrap',
                }}>
                  {status?.crmNumero && (
                    <div>
                      <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>CRM</div>
                      <div style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary, marginTop: 2 }}>{status.crmNumero}</div>
                    </div>
                  )}
                  {status?.crmUf && (
                    <div>
                      <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>UF</div>
                      <div style={{ fontSize: Font.md, fontWeight: 800, color: Colors.textPrimary, marginTop: 2 }}>{status.crmUf}</div>
                    </div>
                  )}
                  {origem && (
                    <div>
                      <div style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Origem</div>
                      <div style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textPrimary, marginTop: 2 }}>{origem}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            role={actionState === 'success' ? 'status' : 'alert'}
            style={{
              borderRadius: Radius.md, padding: `${Space.sm + 2}px ${Space.lg}px`,
              marginBottom: Space.lg,
              backgroundColor: actionState === 'success' ? Colors.successLight : Colors.errorLight,
              border: `1px solid ${actionState === 'success' ? Colors.success : Colors.error}40`,
            }}
          >
            <span style={{
              fontSize: Font.sm, fontWeight: 600,
              color: actionState === 'success' ? Colors.success : Colors.error,
            }}>
              {feedback}
            </span>
          </div>
        )}

        {/* Client-side PDF validation error */}
        {pdfClientError && (
          <div
            role="alert"
            style={{
              borderRadius: Radius.md, padding: `${Space.sm + 2}px ${Space.lg}px`,
              marginBottom: Space.lg, backgroundColor: Colors.errorLight,
              border: `1px solid ${Colors.error}40`,
            }}
          >
            <span style={{ fontSize: Font.sm, fontWeight: 600, color: Colors.error }}>{pdfClientError}</span>
          </div>
        )}

        {/* Loading state */}
        {actionState === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Space.sm, marginBottom: Space.xl }}>
            <div className="spinner--primary spinner" />
            <span style={{ fontSize: Font.sm, color: Colors.textSecondary }}>
              Enviando e processando o arquivo… isso pode levar alguns segundos.
            </span>
          </div>
        )}

        {/* Send section */}
        {actionState !== 'loading' && showSendSection && (
          <>
            {/* Primary — PDF upload */}
            <div style={{
              backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: Space.lg,
            }}>
              <label
                htmlFor="crm-pdf-input"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', boxSizing: 'border-box', backgroundColor: Colors.doctor,
                  borderRadius: Radius.md, padding: Space.lg, cursor: 'pointer',
                  boxShadow: `0 6px 12px ${Colors.doctor}59`,
                }}
              >
                <span style={{ fontSize: 20 }}>📄</span>
                <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>{primaryCtaLabel}</span>
              </label>
              <input
                ref={fileInputRef}
                id="crm-pdf-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{
                  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
                  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
                }}
              />

              <p style={{ fontSize: Font.xs + 1, color: Colors.textSecondary, marginTop: Space.md, lineHeight: 1.5 }}>
                Envie o PDF da sua carteira do CRM — o mesmo arquivo que você baixa no site do seu
                Conselho Regional ou no portal do CFM. Não precisa tirar foto nem digitar nada.
                Tamanho máximo: 5MB.
              </p>

              {pdfFile && (
                <div style={{
                  marginTop: Space.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: Space.sm, backgroundColor: Colors.inputBg, borderRadius: Radius.md,
                  padding: `${Space.sm}px ${Space.md}px`,
                }}>
                  <span style={{ fontSize: Font.sm, color: Colors.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📎 {pdfFile.name}
                  </span>
                  <button
                    onClick={removeSelectedFile}
                    aria-label="Remover arquivo selecionado"
                    style={{ background: 'none', border: 'none', color: Colors.textSecondary, cursor: 'pointer', fontSize: Font.sm }}
                  >
                    Remover
                  </button>
                </div>
              )}

              {pdfFile && (
                <button
                  onClick={handlePdfSubmit}
                  style={{
                    width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md,
                    padding: Space.lg, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: Space.md, boxShadow: `0 6px 12px ${Colors.primary}59`,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Enviar arquivo</span>
                </button>
              )}
            </div>

            {/* Secondary — legacy QR flow */}
            <button
              onClick={() => { setShowLegacyFlow(v => !v); setFeedback(''); }}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                color: Colors.textSecondary, fontSize: Font.sm, fontWeight: 600,
                textDecoration: 'underline', padding: Space.sm,
              }}
            >
              {showLegacyFlow ? 'Ocultar opção de QR Code' : legacyCtaLabel}
            </button>

            {showLegacyFlow && (
              <div style={{ marginTop: Space.md }}>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: Space.md }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                  <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>fluxo legado</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                </div>

                {/* Option A – Camera */}
                <button
                  onClick={openCamera}
                  style={{
                    width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md,
                    padding: Space.lg, border: `2px solid ${Colors.border}`, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: Space.md,
                  }}
                >
                  <span style={{ fontSize: 20 }}>📷</span>
                  <span style={{ color: Colors.textPrimary, fontSize: Font.md, fontWeight: 700 }}>Escanear QR da Carteirinha</span>
                </button>

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
                    <label htmlFor="crm-qr-paste" style={{ display: 'none' }}>Conteúdo do QR Code</label>
                    <textarea
                      id="crm-qr-paste"
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
              </div>
            )}
          </>
        )}

        {/* Re-validate button once approved */}
        {actionState !== 'loading' && !showSendSection && approvalState === 'aprovado' && (
          <button
            onClick={startRevalidation}
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
