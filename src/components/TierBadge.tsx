import React from 'react';
import { MemberTier } from '../types';
import { TIER_CONFIG } from '../utils/tierCalculator';
import {
  Sparkles,
  Compass,
  Shield,
  Award,
  Crown,
  Zap,
  Flame,
  Cpu,
  Star,
  Radio,
  ShieldAlert,
} from 'lucide-react';

interface TierBadgeProps {
  tier: MemberTier;
  titleName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPrefix?: boolean;
  className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Compass,
  Shield,
  Award,
  Crown,
  Zap,
  Flame,
  Cpu,
  Star,
  Radio,
  ShieldAlert,
};

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  titleName,
  size = 'md',
  showLabel = true,
  showPrefix = false,
  className = '',
}) => {
  const config = TIER_CONFIG[tier] || TIER_CONFIG['신입생'] || Object.values(TIER_CONFIG)[0];
  const IconComponent = ICON_MAP[config.iconName] || Sparkles;
  const displayTitle = titleName || config.label;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.2 gap-0.5',
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  }[size];

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 13,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border border-opacity-70 shadow-xs transition-all ${config.badgeBg} ${config.badgeBorder} ${config.textColor} ${sizeClasses} ${className}`}
      title={`칭호: ${displayTitle} (활동 등급: Lv.${config.level} • ${config.description})`}
    >
      <IconComponent size={iconSizes} className="shrink-0" />
      {showLabel && (
        <span className="truncate max-w-[120px] sm:max-w-none">
          {showPrefix ? `칭호: ${displayTitle}` : displayTitle}
        </span>
      )}
    </span>
  );
};
