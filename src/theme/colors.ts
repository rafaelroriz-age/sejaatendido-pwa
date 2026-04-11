const Colors = {
  primary:      '#FF3366',
  primaryDark:  '#D50032',
  primaryLight: '#FF6B8A',
  accent:       '#FFE4EA',
  accentSoft:   '#FFF0F3',

  bg:           '#F7F8FC',
  card:         '#FFFFFF',
  inputBg:      '#F2F3F7',

  textPrimary:   '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  border:       '#E8ECF0',
  borderLight:  '#F0F1F5',

  success:      '#00C853',
  successLight: '#E8F5E9',
  warning:      '#FF9800',
  warningLight: '#FFF3E0',
  error:        '#FF3366',
  errorLight:   '#FFEBEE',
  info:         '#2196F3',
  infoLight:    '#E3F2FD',

  doctor:       '#00897B',
  doctorLight:  '#E0F2F1',
  admin:        '#7C4DFF',
  adminLight:   '#EDE7F6',

  shadow:       '#000',
  overlay:      'rgba(0,0,0,0.05)',
  overlayDark:  'rgba(0,0,0,0.45)',

  gradientStart: '#FF3366',
  gradientEnd:   '#FF6B8A',
} as const;

export const Font = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  20,
  xl:  28,
  xxl: 34,
} as const;

export const Space = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

export default Colors;
