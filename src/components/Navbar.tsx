import { EmblemLogo } from './EmblemLogo';
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';
import { TierBadge } from './TierBadge';
import {
  ShieldAlert,
  Search,
  PlusCircle,
  LogIn,
  UserPlus,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Award,
  ChevronDown,
  KeyRound,
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenNewPost: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenAdmin: () => void;
  onOpenTierGuide: () => void;
  onOpenPrivacyNotice: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onOpenNewPost,
  onOpenProfile,
  onOpenAdmin,
  onOpenTierGuide,
  onOpenPrivacyNotice,
  searchQuery,
  onSearchChange,
  onToggleMobileSidebar,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleLogout = () => {
    db.logout();
    setShowUserDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 active:scale-95 transition-transform"
            aria-label="포럼 메뉴 열기"
          >
            <Menu size={22} />
          </button>

          <a href="#" className="flex items-center gap-2 group">
            <div className="relative">
              <EmblemLogo
                size={40}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-red-700/60 shadow-[0_0_12px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5 font-black text-sm sm:text-lg tracking-tight text-white">
                <span>인민정보국</span>
                <span className="text-emerald-400 font-extrabold">database</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono hidden lg:inline-block">
                  ANON DB
                </span>
              </div>
            </div>
          </a>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden sm:flex flex-1 max-w-md mx-2 lg:mx-4">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="게시물, 내용, 가명 닉네임, 포럼 검색..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-full text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mobile search toggle button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="sm:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 active:scale-95 transition-transform"
            aria-label="검색창 열기"
          >
            <Search size={18} />
          </button>

          {/* 새 글 작성 버튼 */}
          <button
            onClick={onOpenNewPost}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm hover:shadow-indigo-500/25 transition-all shrink-0 cursor-pointer"
          >
            <PlusCircle size={15} />
            <span className="hidden xs:inline">새 글 작성</span>
          </button>

          {/* User Profile or Login/Signup */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt={currentUser.nickname}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-700"
                />
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{currentUser.nickname}</span>
                    <TierBadge tier={currentUser.tier} size="xs" showLabel={true} />
                  </div>
                  <div className="text-[10px] text-slate-400">칭호: {currentUser.tier}</div>
                </div>
                <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
              </button>

              {showUserDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-2 w-60 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="p-3 border-b border-slate-800/80">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span>{currentUser.nickname}</span>
                      <TierBadge tier={currentUser.tier} size="xs" />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      게시물 {currentUser.postCount}개 • 댓글 {currentUser.commentCount}개
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenProfile(currentUser.id);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <User size={15} />
                      <span>프로필 및 칭호 관리</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenProfile(currentUser.id);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <KeyRound size={15} />
                      <span>비밀번호 변경</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenTierGuide();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Award size={15} />
                      <span>회원 칭호(활동 등급) 안내</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenPrivacyNotice();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Shield size={15} />
                      <span>개인정보 격리 보호 원칙</span>
                    </button>

                    {currentUser.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-slate-900 rounded-xl flex items-center gap-2 font-bold cursor-pointer transition-colors"
                      >
                        <ShieldAlert size={15} />
                        <span>관리자 대시보드</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-slate-900 rounded-xl flex items-center gap-2 font-medium cursor-pointer transition-colors"
                    >
                      <LogOut size={15} />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogIn size={13} />
                <span>로그인</span>
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <UserPlus size={13} />
                <span>가입</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Expandable Bar */}
      {showMobileSearch && (
        <div className="sm:hidden px-3 pb-3 pt-1 border-t border-slate-850 bg-slate-950/95 animate-in slide-in-from-top duration-150">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="게시물, 내용, 가명 닉네임, 포럼 검색..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
