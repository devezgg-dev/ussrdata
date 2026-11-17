import React, { useState } from 'react';
import { TrustLevel } from '../types';
import { ShieldCheck, ShieldAlert, ShieldX, Info, Edit3 } from 'lucide-react';

interface TrustBadgeProps {
  level: TrustLevel;
  size?: 'sm' | 'md' | 'lg';
  canEdit?: boolean;
  onEditClick?: () => void;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  size = 'md',
  canEdit = false,
  onEditClick,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = {
    높음: {
      label: '신뢰도 높음',
      shortLabel: '높음',
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-500/60',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      icon: ShieldCheck,
      description: '운영진 검증 및 공신력 있는 출처가 확인된 상태입니다.',
    },
    중간: {
      label: '신뢰도 중간',
      shortLabel: '중간',
      bg: 'bg-amber-950/80',
      border: 'border-amber-500/60',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
      icon: ShieldAlert,
      description: '일부 정황이 확인되었으나 추가 교차 검증이 진행 중인 상태입니다.',
    },
    낮음: {
      label: '신뢰도 낮음',
      shortLabel: '낮음',
      bg: 'bg-rose-950/80',
      border: 'border-rose-500/60',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_10px_rgba(244,63,94,0.25)]',
      icon: ShieldX,
      description: '출처가 불명확하거나 미확인 루머 수준의 게시물입니다.',
    },
  }[level] || {
    label: '신뢰도 미정',
    shortLabel: '미정',
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    text: 'text-slate-400',
    glow: '',
    icon: ShieldAlert,
    description: '신뢰도 평가 대기 중입니다.',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <div className="relative inline-flex items-center">
      <span
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center font-semibold rounded-md border ${config.bg} ${config.border} ${config.text} ${config.glow} ${sizeClasses} cursor-help transition-all hover:brightness-110 select-none ${className}`}
      >
        <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} className="shrink-0" />
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
        <Info size={size === 'sm' ? 10 : 12} className="opacity-60 shrink-0" />
      </span>

      {canEdit && onEditClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick();
          }}
          className="ml-1.5 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title="관리자: 신뢰도 평가 변경"
        >
          <Edit3 size={12} />
        </button>
      )}

      {/* Tooltip notice */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-[11px] text-slate-300 z-50 backdrop-blur-md">
          <div className="flex items-start gap-1.5 mb-1 font-semibold text-slate-100">
            <Icon size={13} className={config.text} />
            <span>{config.label}</span>
          </div>
          <p className="text-slate-300 mb-1.5 leading-relaxed">{config.description}</p>
          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
            ⚠️ 신뢰도는 관리자가 지정한 평가 상태이며, 게시물의 실제 진실성을 자동으로 보증하지 않습니다.
          </div>
        </div>
      )}
    </div>
  );
};
