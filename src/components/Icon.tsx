import React from 'react';

export type IconName =
  | 'users'
  | 'user'
  | 'stethoscope'
  | 'check-circle'
  | 'x-circle'
  | 'clock'
  | 'clipboard-list'
  | 'clipboard'
  | 'dollar-sign'
  | 'message-circle'
  | 'send'
  | 'calendar'
  | 'alert-triangle'
  | 'landmark'
  | 'mail'
  | 'key'
  | 'lock'
  | 'file-text'
  | 'paperclip'
  | 'camera';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

const paths: Record<IconName, React.ReactNode> = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6" />
      <path d="M16 8.5a3 3 0 1 0 0-6" />
      <path d="M21 20c0-3-2-5.5-5-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 4v5a4 4 0 0 0 8 0V4" />
      <path d="M6 4H4" />
      <path d="M14 4h2" />
      <circle cx="18" cy="16" r="3" />
      <path d="M10 13v1a5 5 0 0 0 5 5" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  'clipboard-list': (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    </>
  ),
  'dollar-sign': (
    <>
      <path d="M12 2v20" />
      <path d="M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.4-5 3.2c0 1.9 1.8 2.6 5 3.3 3.2.7 5 1.5 5 3.4 0 1.9-2.2 3.2-5 3.2s-5-1.6-5-3.5" />
    </>
  ),
  'message-circle': (
    <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 1 1 21 11.5z" />
  ),
  send: (
    <path d="M21 3L3 10l7 3.5M21 3l-7 18-3.5-7.5M21 3L10.5 13.5" />
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M10.3 3.9L2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V10M9 21V10M15 21V10M19 21V10" />
      <path d="M2 10l10-6 10 6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 6l9 7 9-7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.5 12.5L20 3M17 6l3 3M14 9l2 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6z" />
      <path d="M14 2v6h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  paperclip: (
    <path d="M21 12.5l-8.5 8.5a4.5 4.5 0 0 1-6.4-6.4L14.6 6a3 3 0 0 1 4.2 4.2L10.4 18.6a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4" />
  ),
  camera: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-2h7l1 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
};

/** Ícone de linha (estilo profissional, SVG) usado em toda a aplicação. */
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export default Icon;
