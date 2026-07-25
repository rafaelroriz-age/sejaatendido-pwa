import Colors, { Font, Radius } from '../theme/colors';
import { isRiscoAlto, isRiscoMedio, RISCO_FAIXA_LABEL, RiscoFaixa } from '../constants/riscoStatus';

interface Props {
  faixa?: RiscoFaixa | string;
  score?: number;
}

/** Selo visual da faixa de risco (BAIXO/MEDIO/ALTO) de uma avaliação de pagamento. */
export default function RiskBadge({ faixa, score }: Props) {
  const alto = isRiscoAlto(faixa);
  const medio = isRiscoMedio(faixa);
  const bg = alto ? Colors.errorLight : medio ? Colors.warningLight : Colors.successLight;
  const color = alto ? Colors.error : medio ? Colors.warning : Colors.success;
  const label = (faixa && RISCO_FAIXA_LABEL[faixa as RiscoFaixa]) || 'Risco desconhecido';

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: bg,
        color,
        fontSize: Font.xs,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: Radius.full,
      }}
    >
      {label}
      {typeof score === 'number' && <span aria-hidden="true">· {score}</span>}
    </span>
  );
}
