import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Colors, { Font, Radius, Space } from '../theme/colors';

export interface LegalConsentErrors {
  termos?: string;
  privacidade?: string;
}

interface LegalConsentProps {
  aceitouTermos: boolean;
  aceitouPrivacidade: boolean;
  loading?: boolean;
  termosVersao: string;
  privacidadeVersao: string;
  errors?: LegalConsentErrors;
  onChangeTermos: (value: boolean) => void;
  onChangePrivacidade: (value: boolean) => void;
}

export default function LegalConsent({
  aceitouTermos,
  aceitouPrivacidade,
  loading = false,
  termosVersao,
  privacidadeVersao,
  errors,
  onChangeTermos,
  onChangePrivacidade,
}: LegalConsentProps) {
  const termosErrorRef = useRef<HTMLDivElement | null>(null);
  const privacidadeErrorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (errors?.termos && termosErrorRef.current) {
      termosErrorRef.current.focus();
      return;
    }
    if (errors?.privacidade && privacidadeErrorRef.current) {
      privacidadeErrorRef.current.focus();
    }
  }, [errors?.termos, errors?.privacidade]);

  return (
    <div>
      <div style={{ backgroundColor: Colors.inputBg, border: `1px solid ${Colors.borderLight}`, borderRadius: Radius.lg, padding: Space.lg, marginBottom: Space.md }}>
        <p style={{ margin: 0, color: Colors.textSecondary, fontSize: Font.sm, lineHeight: '22px' }}>
          Voce precisa aceitar os documentos legais para concluir seu cadastro.
        </p>
        <p style={{ margin: `${Space.xs}px 0 0`, color: Colors.textMuted, fontSize: Font.xs + 1 }}>
          Termos {termosVersao} e Politica {privacidadeVersao}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: Space.md }}>
        <input
          id="aceitou-termos"
          type="checkbox"
          checked={aceitouTermos}
          onChange={e => onChangeTermos(e.target.checked)}
          disabled={loading}
          aria-invalid={Boolean(errors?.termos)}
          aria-describedby={errors?.termos ? 'erro-termos' : undefined}
          style={{ marginTop: 3, width: 18, height: 18 }}
        />
        <label htmlFor="aceitou-termos" style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: '21px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          Li e aceito os{' '}
          <Link to="/termos-de-uso" target="_blank" rel="noreferrer" style={{ color: Colors.primary, fontWeight: 700 }}>
            Termos e Condicoes de Uso
          </Link>
          .
        </label>
      </div>
      {errors?.termos && (
        <div
          id="erro-termos"
          ref={termosErrorRef}
          tabIndex={-1}
          style={{ color: Colors.error, fontSize: Font.xs + 1, marginTop: -6, marginBottom: Space.md, outline: 'none' }}
        >
          {errors.termos}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: Space.md }}>
        <input
          id="aceitou-privacidade"
          type="checkbox"
          checked={aceitouPrivacidade}
          onChange={e => onChangePrivacidade(e.target.checked)}
          disabled={loading}
          aria-invalid={Boolean(errors?.privacidade)}
          aria-describedby={errors?.privacidade ? 'erro-privacidade' : undefined}
          style={{ marginTop: 3, width: 18, height: 18 }}
        />
        <label htmlFor="aceitou-privacidade" style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: '21px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          Li e aceito a{' '}
          <Link to="/politica-de-privacidade" target="_blank" rel="noreferrer" style={{ color: Colors.primary, fontWeight: 700 }}>
            Politica de Privacidade
          </Link>
          .
        </label>
      </div>
      {errors?.privacidade && (
        <div
          id="erro-privacidade"
          ref={privacidadeErrorRef}
          tabIndex={-1}
          style={{ color: Colors.error, fontSize: Font.xs + 1, marginTop: -6, marginBottom: Space.md, outline: 'none' }}
        >
          {errors.privacidade}
        </div>
      )}

      <Link
        to="/lgpd"
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', marginTop: Space.xs, color: Colors.textSecondary, fontWeight: 700, fontSize: Font.xs + 1, textDecoration: 'underline' }}
      >
        Ver base legal LGPD e direitos do titular
      </Link>
    </div>
  );
}
