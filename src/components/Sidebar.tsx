import { EmblemLogo } from './EmblemLogo';
import React from 'react';
import { Forum, PostTag, TrustLevel, UserProfile } from '../types';
import {
  Compass,
  Flame,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Layers,
  Plus,
  Star,
  Award,
  Shield,
  HelpCircle,
  Megaphone,
  Coffee,
  Terminal,
  Scale,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  forums: Forum[];
  selectedForumId?: string;
  selectedTag?: PostTag;
  selectedTrust?: TrustLevel;
  onSelectForum: (forumId?: string) => void;
  onSelectTag: (tag?: PostTag) => void;
  onSelectTrust: (trust?: TrustLevel) => void;
  onOpenCreateForum: () => void;
  onOpenTierGuide: () => void;
  onOpenPrivacyNotice: () => void;
  onOpenAdmin: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  currentUser?: UserProfile | null;
  subscribedForums: Forum[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const FORUM_ICONS: Record<string, React.ElementType> = {
  Megaphone,
  ShieldAlert,
  Terminal,
  Coffee,
  Scale,
  HelpCircle,
  MessageSquare,
  Sparkles: Compass,
};

export const Sidebar: React.FC<SidebarProps> = ({
  forums,
  selectedForumId,
  selectedTag,
  selectedTrust,
  onSelectForum,
  onSelectTag,
  onSelectTrust,
  onOpenCreateForum,
  onOpenTierGuide,
  onOpenPrivacyNotice,
  onOpenAdmin,
  onOpenAuth,
  currentUser,
  subscribedForums,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isAllActive = !selectedForumId && !selectedTag && !selectedTrust;

  const content = (
    <aside className="w-64 space-y-6 text-xs text-slate-300">
      {/* 0. 모바일/사이드바 로그인/계정 상태 카드 */}
      {!currentUser ? (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2">
          <div className="text-xs font-bold text-slate-200">익명 가명 계정으로 활동</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onOpenAuth?.('login');
                onCloseMobile?.();
              }}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white text-center cursor-pointer transition-colors shadow-sm"
            >
              로그인
            </button>
            <button
              onClick={() => {
                onOpenAuth?.('signup');
                onCloseMobile?.();
              }}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center cursor-pointer transition-colors shadow-sm"
            >
              회원가입
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={currentUser.nickname}
              className="w-7 h-7 rounded-full border border-slate-700 shrink-0"
            />
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{currentUser.nickname}</div>
              <div className="text-[10px] text-slate-400">칭호: {currentUser.tier}</div>
            </div>
          </div>
        </div>
      )}

      {/* 1. 피드 둘러보기 (전체 및 필터) */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          피드 탐색
        </div>

        <button
          onClick={() => {
            onSelectForum(undefined);
            onSelectTag(undefined);
            onSelectTrust(undefined);
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
            isAllActive
              ? 'bg-indigo-600 text-white font-bold shadow-sm'
              : 'hover:bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Compass size={16} />
          <span>전체 게시물 둘러보기</span>
        </button>
      </div>

      {/* 2. 필수 보안 태그별 필터 (유출 가능 vs 유출 불가능) */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          보안 태그 필터
        </div>

        <button
          onClick={() => {
            onSelectTag(selectedTag === '유출 가능' ? undefined : '유출 가능');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
            selectedTag === '유출 가능'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-600/70 font-bold'
              : 'hover:bg-slate-900 text-slate-400 hover:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>🚨 유출 가능 자료</span>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectTag(selectedTag === '유출 불가능' ? undefined : '유출 불가능');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
            selectedTag === '유출 불가능'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/70 font-bold'
              : 'hover:bg-slate-900 text-slate-400 hover:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>🛡️ 유출 불가능 (검증)</span>
          </div>
        </button>
      </div>

      {/* 3. 신뢰도 평가별 필터 */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          관리자 신뢰도 등급
        </div>

        <button
          onClick={() => {
            onSelectTrust(selectedTrust === '높음' ? undefined : '높음');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            selectedTrust === '높음'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 font-bold'
              : 'hover:bg-slate-900 text-slate-400 hover:text-emerald-400'
          }`}
        >
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>신뢰도 높음</span>
        </button>

        <button
          onClick={() => {
            onSelectTrust(selectedTrust === '중간' ? undefined : '중간');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            selectedTrust === '중간'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60 font-bold'
              : 'hover:bg-slate-900 text-slate-400 hover:text-amber-400'
          }`}
        >
          <ShieldAlert size={14} className="text-amber-400" />
          <span>신뢰도 중간</span>
        </button>

        <button
          onClick={() => {
            onSelectTrust(selectedTrust === '낮음' ? undefined : '낮음');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            selectedTrust === '낮음'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 font-bold'
              : 'hover:bg-slate-900 text-slate-400 hover:text-rose-400'
          }`}
        >
          <ShieldX size={14} className="text-rose-400" />
          <span>신뢰도 낮음 (미검증)</span>
        </button>
      </div>

      {/* 4. 내 구독 포럼 목록 */}
      {currentUser && subscribedForums.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Star size={11} className="text-amber-400 fill-current" />
            <span>내 구독 포럼</span>
          </div>
          {subscribedForums.map((forum) => {
            const Icon = FORUM_ICONS[forum.icon] || MessageSquare;
            const isSelected = selectedForumId === forum.id;
            return (
              <button
                key={forum.id}
                onClick={() => {
                  onSelectForum(forum.id);
                  onSelectTag(undefined);
                  onSelectTrust(undefined);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left truncate transition-colors ${
                  isSelected
                    ? 'bg-indigo-600/90 text-white font-bold'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={14} className="shrink-0 text-amber-400" />
                <span className="truncate">{forum.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. 전체 개설 포럼 목록 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            전체 포럼 ({forums.length})
          </span>
          <button
            onClick={() => {
              onOpenCreateForum();
              onCloseMobile?.();
            }}
            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 rounded"
            title="새 포럼 개설"
          >
            <Plus size={14} />
          </button>
        </div>

        {forums.map((forum) => {
          const Icon = FORUM_ICONS[forum.icon] || MessageSquare;
          const isSelected = selectedForumId === forum.id;
          return (
            <button
              key={forum.id}
              onClick={() => {
                onSelectForum(forum.id);
                onSelectTag(undefined);
                onSelectTrust(undefined);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                  : 'hover:bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon size={14} className="shrink-0 text-indigo-400" />
                <span className="truncate">{forum.name}</span>
              </div>
              {forum.postCount !== undefined && (
                <span className="text-[10px] text-slate-500 font-mono ml-1">
                  {forum.postCount}
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={() => {
            onOpenCreateForum();
            onCloseMobile?.();
          }}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <Plus size={13} />
          <span>새 포럼 개설하기</span>
        </button>
      </div>

      {/* 6. 개인정보 보호 & 시스템 안내 카드 */}
      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <EmblemLogo size={24} className="w-6 h-6 rounded-md border border-red-700/60" />
          <span className="text-xs font-bold text-slate-100">인민정보국 보호 원칙</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          인민정보국는 실명과 이메일을 일체 요구하지 않으며, 생년월일은 철저히 비공개 격리 보관됩니다.
        </p>
        <button
          onClick={() => {
            onOpenPrivacyNotice();
            onCloseMobile?.();
          }}
          className="text-[11px] text-emerald-400 hover:underline font-semibold block"
        >
          보호 정책 자세히 보기 →
        </button>
      </div>

      {/* 7. 회원 등급 가이드 버튼 */}
      <button
        onClick={() => {
          onOpenTierGuide();
          onCloseMobile?.();
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 font-semibold transition-colors cursor-pointer"
      >
        <Award size={15} />
        <span>11단계 회원 칭호(활동 등급) 안내</span>
      </button>

      {/* 8. 관리자 권한 포털 (관리자일 때만 표시) */}
      {currentUser?.isAdmin && (
        <button
          onClick={() => {
            onOpenAdmin();
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-600/60 font-bold transition-colors shadow-sm cursor-pointer"
        >
          <ShieldAlert size={15} />
          <span>관리자 대시보드 바로가기</span>
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden md:block shrink-0">{content}</div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-xs flex">
          <div className="w-80 max-w-[85vw] bg-slate-950 border-r border-slate-800 p-5 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                <span>커뮤니티 포럼 메뉴</span>
              </span>
              <button
                onClick={onCloseMobile}
                className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 cursor-pointer"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            {content}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
