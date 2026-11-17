import { CustomTier, MemberTier } from '../types';

export interface TierInfo {
  tier: MemberTier;
  level: number;
  label: string;
  description: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  glowColor: string;
  iconName: string;
}

/**
 * 인민정보국 기본 서열 체계 (관리자 대시보드 '등급 관리'에서 자유롭게
 * 추가 / 수정 / 삭제할 수 있습니다. 아래는 최초 설치 시 시드 데이터입니다.)
 *
 * 신입생 -> 공작원 -> 동지 -> 최고위원(관리자 전용 / 직접 임명)
 */
export const DEFAULT_TIERS: CustomTier[] = [
  {
    id: 'tier-recruit',
    label: '신입생',
    level: 1,
    description: '인민정보국에 처음 등록된 요원에게 자동 지급되는 초기 서열',
    badgeBg: 'bg-slate-800/80',
    badgeBorder: 'border-slate-600',
    textColor: 'text-slate-300',
    glowColor: 'rgba(148, 163, 184, 0.2)',
    iconName: 'Sparkles',
    isDefault: true,
  },
  {
    id: 'tier-operative',
    label: '공작원',
    level: 2,
    description: '게시물 10개 또는 댓글 20개 이상 작성하여 임무 수행 능력을 증명한 요원',
    badgeBg: 'bg-red-950/70',
    badgeBorder: 'border-red-700/70',
    textColor: 'text-red-400',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    iconName: 'Compass',
    autoRequirement: { posts: 10 },
  },
  {
    id: 'tier-comrade',
    label: '동지',
    level: 3,
    description: '게시물 30개 이상 및 댓글 50개 이상, 조직에 대한 확고한 충성을 증명한 요원',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-500',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    iconName: 'Star',
    autoRequirement: { posts: 30, comments: 50 },
  },
  {
    id: 'tier-supreme',
    label: '최고위원',
    level: 99,
    description:
      '정치국이 직접 임명한 최고 서열. 관리자 계정에 자동 부여되며, 일반 요원에게는 관리자가 직접 지급해야만 합니다.',
    badgeBg: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700',
    badgeBorder: 'border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]',
    textColor: 'text-black font-extrabold',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    iconName: 'ShieldAlert',
    isAdminOnly: true,
  },
];

const ICON_FALLBACK = 'Sparkles';

function buildConfig(tiers: CustomTier[]): Record<string, TierInfo> {
  const config: Record<string, TierInfo> = {};
  tiers.forEach((t) => {
    config[t.label] = {
      tier: t.label,
      level: t.level,
      label: t.label,
      description: t.description,
      badgeBg: t.badgeBg,
      badgeBorder: t.badgeBorder,
      textColor: t.textColor,
      glowColor: t.glowColor,
      iconName: t.iconName || ICON_FALLBACK,
    };
  });
  return config;
}

// 다른 모듈(TierBadge 등)이 `import { TIER_CONFIG }`로 가져가 쓰므로,
// 관리자가 등급을 추가/수정/삭제할 때 db.ts가 applyTierConfig()를 호출해
// 이 객체를 교체하면 ES 모듈의 live binding으로 즉시 반영됩니다.
export let TIER_CONFIG: Record<string, TierInfo> = buildConfig(DEFAULT_TIERS);

export function applyTierConfig(tiers: CustomTier[]) {
  TIER_CONFIG = buildConfig(tiers.length > 0 ? tiers : DEFAULT_TIERS);
}

function sortedNonAdminTiers(tiers: CustomTier[]): CustomTier[] {
  return [...tiers].filter((t) => !t.isAdminOnly).sort((a, b) => b.level - a.level);
}

/**
 * 회원의 활동량 및 관리자 여부를 기준으로 등급을 산정합니다.
 * 관리자가 '직접 지급'한 등급은 이 함수를 거치지 않고 db.ts에서 그대로 유지됩니다.
 */
export function calculateUserTier(
  isAdmin: boolean,
  postsCount: number,
  commentsCount: number,
  visitsCount: number,
  tiers: CustomTier[] = DEFAULT_TIERS
): MemberTier {
  if (isAdmin) {
    const adminTier = tiers.find((t) => t.isAdminOnly);
    if (adminTier) return adminTier.label;
  }

  const candidates = sortedNonAdminTiers(tiers);
  for (const t of candidates) {
    const req = t.autoRequirement;
    if (!req) continue;
    const okPosts = req.posts === undefined || postsCount >= req.posts;
    const okComments = req.comments === undefined || commentsCount >= req.comments;
    const okVisits = req.visits === undefined || visitsCount >= req.visits;
    if (okPosts && okComments && okVisits) return t.label;
  }

  const fallback = tiers.find((t) => t.isDefault) || candidates[candidates.length - 1];
  return fallback?.label || '신입생';
}

/**
 * 다음 등급까지 남은 조건을 계산합니다 (자동 승급 조건이 있는 등급만 대상).
 */
export function getNextTierProgress(
  isAdmin: boolean,
  postsCount: number,
  commentsCount: number,
  visitsCount: number,
  tiers: CustomTier[] = DEFAULT_TIERS
): {
  currentTier: MemberTier;
  nextTier: MemberTier | null;
  requirementsText: string;
  progressPercent: number;
} {
  const currentTier = calculateUserTier(isAdmin, postsCount, commentsCount, visitsCount, tiers);

  if (isAdmin) {
    return {
      currentTier,
      nextTier: null,
      requirementsText: '최고위 관리자 권한 (최고위원)',
      progressPercent: 100,
    };
  }

  const candidates = sortedNonAdminTiers(tiers).slice().reverse(); // 낮은 서열 -> 높은 서열
  const currentIndex = candidates.findIndex((t) => t.label === currentTier);
  const next = currentIndex >= 0 ? candidates[currentIndex + 1] : undefined;

  if (!next) {
    return {
      currentTier,
      nextTier: null,
      requirementsText: '최고 등급에 도달했습니다! (상위 서열은 관리자 직접 임명으로만 가능합니다)',
      progressPercent: 100,
    };
  }

  const req = next.autoRequirement || {};
  const parts: string[] = [];
  const percents: number[] = [];
  if (req.posts !== undefined) {
    parts.push(`게시물 ${postsCount}/${req.posts}개`);
    percents.push(Math.min(100, (postsCount / req.posts) * 100));
  }
  if (req.comments !== undefined) {
    parts.push(`댓글 ${commentsCount}/${req.comments}개`);
    percents.push(Math.min(100, (commentsCount / req.comments) * 100));
  }
  if (req.visits !== undefined) {
    parts.push(`방문 ${visitsCount}/${req.visits}회`);
    percents.push(Math.min(100, (visitsCount / req.visits) * 100));
  }

  return {
    currentTier,
    nextTier: next.label,
    requirementsText: parts.length > 0 ? parts.join(' 및 ') : '관리자 직접 지급 전용 등급입니다.',
    progressPercent: percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
  };
}
