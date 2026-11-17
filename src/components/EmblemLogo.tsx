import React from 'react';

interface EmblemLogoProps {
  size?: number;
  className?: string;
}

/**
 * 인민정보국 공식 국장 (낫과 망치 + 별) — 순수 SVG로 직접 그린 그래픽입니다.
 */
export const EmblemLogo: React.FC<EmblemLogoProps> = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="인민정보국 국장"
  >
    <circle cx="50" cy="50" r="48" fill="#7a0c1c" stroke="#d4af37" strokeWidth="3" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.6" />

    {/* 테두리 별 장식 */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const r = 44;
      const x = 50 + r * Math.sin(angle);
      const y = 50 - r * Math.cos(angle);
      return <circle key={i} cx={x} cy={y} r="0.9" fill="#d4af37" />;
    })}

    {/* 낫 (sickle) */}
    <g transform="translate(50 50) rotate(-35)">
      <path
        d="M -4 -22 A 16 16 0 1 1 -18 -4 L -10 -8 A 9 9 0 1 0 -2 -20 Z"
        fill="#d4af37"
        stroke="#8a6d1a"
        strokeWidth="0.6"
      />
      <rect x="-5.5" y="-6" width="3" height="26" rx="1" fill="#d4af37" stroke="#8a6d1a" strokeWidth="0.5" />
    </g>

    {/* 망치 (hammer) */}
    <g transform="translate(50 50) rotate(35)">
      <rect x="-15" y="-21" width="22" height="11" rx="1.5" fill="#d4af37" stroke="#8a6d1a" strokeWidth="0.6" />
      <rect x="-3" y="-13" width="4" height="30" rx="1.2" fill="#d4af37" stroke="#8a6d1a" strokeWidth="0.5" />
    </g>

    {/* 상단 별 */}
    <g transform="translate(50 19)">
      <path
        d="M0 -9 L2.1 -2.8 L8.6 -2.8 L3.3 1.1 L5.3 7.3 L0 3.4 L-5.3 7.3 L-3.3 1.1 L-8.6 -2.8 L-2.1 -2.8 Z"
        fill="#d4af37"
        stroke="#8a6d1a"
        strokeWidth="0.5"
      />
    </g>
  </svg>
);
