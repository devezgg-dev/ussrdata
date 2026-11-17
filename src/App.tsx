
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmblemLogo } from './components/EmblemLogo';
import { TurnstileWidget, verifyTurnstile } from './components/TurnstileWidget';
import React, { useState, useEffect, useMemo } from 'react';
import { Forum, MemberTier, Post, PostSortOption, PostTag, TrustLevel, UserProfile } from './types';
import { db } from './services/db';
import { supabase } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PostCard } from './components/PostCard';
import { PostDetail } from './components/PostDetail';
import { PostEditor } from './components/PostEditor';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { CreateForumModal } from './components/CreateForumModal';
import { TierGuideModal } from './components/TierGuideModal';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';
import { AdminDashboard } from './components/AdminDashboard';
import { TrustChangeModal } from './components/TrustChangeModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastViewport } from './components/ToastViewport';
import {
  Sparkles,
  Filter,
  ArrowUpDown,
  Search,
  Star,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Layers,
  AlertCircle,
  HelpCircle,
  Megaphone,
  Coffee,
  Terminal,
  Scale,
  MessageSquare,
  Compass,
} from 'lucide-react';

export default function App() {
  // DB 구독 및 세션 상태
  const [currentUserData, setCurrentUserData] = useState(() => db.getCurrentUser());
  const [firstVisitVerified, setFirstVisitVerified] = useState(() => sessionStorage.getItem('inmin_turnstile_ok') === '1');
  const [firstVisitToken, setFirstVisitToken] = useState('');
  const [firstVisitError, setFirstVisitError] = useState('');
  const currentUser = currentUserData?.profile || null;

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setAuthModalMode('login'); setAuthModalOpen(true); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 피드 필터 및 정렬 상태
  const [selectedForumId, setSelectedForumId] = useState<string | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<PostTag | undefined>(undefined);
  const [selectedTrust, setSelectedTrust] = useState<TrustLevel | undefined>(undefined);
  const [sortOption, setSortOption] = useState<PostSortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  // 뷰 네비게이션 ('feed' | 'post-detail' | 'admin')
  const [activeView, setActiveView] = useState<'feed' | 'post-detail' | 'admin'>('feed');
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // 모달 상태
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [postEditorOpen, setPostEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [createForumModalOpen, setCreateForumModalOpen] = useState(false);
  const [tierGuideModalOpen, setTierGuideModalOpen] = useState(false);
  const [privacyNoticeModalOpen, setPrivacyNoticeModalOpen] = useState(false);
  const [trustModalPost, setTrustModalPost] = useState<Post | null>(null);

  // 모바일 사이드바 드로어
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // DB 구독 동기화
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setCurrentUserData(db.getCurrentUser());
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // 고유 링크(딥링크) 감지 (?post=POST_ID) - 서버 동기화 완료 후에도 재시도
  useEffect(() => {
    if (activePostId) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const permalinkPostId = params.get('post');
      if (permalinkPostId) {
        const found = db.getPost(permalinkPostId);
        if (found) {
          setActivePostId(permalinkPostId);
          setActiveView('post-detail');
        }
      }
    } catch {
      // ignore
    }
  }, [tick, activePostId]);

  // 보안 조치 상태
  const securityConfig = useMemo(() => db.getSecurityConfig(), [tick]);
  const isGuestBlocked = securityConfig.level >= 3 && !currentUser;

  // 포럼 및 게시물 목록 로드
  const forums = useMemo(() => db.getForums(), [tick]);
  const activeForum = useMemo(
    () => (selectedForumId ? forums.find((f) => f.id === selectedForumId) : null),
    [forums, selectedForumId]
  );

  const posts = useMemo(() => {
    return db.getPosts({
      forumId: selectedForumId,
      tag: selectedTag,
      trustLevel: selectedTrust,
      search: searchQuery,
      sort: sortOption,
    });
  }, [selectedForumId, selectedTag, selectedTrust, searchQuery, sortOption, tick]);

  const subscribedForums = useMemo(() => {
    return currentUser ? db.getUserSubscriptions(currentUser.id) : [];
  }, [currentUser, tick]);

  const isSubscribedToActiveForum = useMemo(() => {
    if (!currentUser || !selectedForumId) return false;
    return db.isSubscribed(selectedForumId, currentUser.id);
  }, [currentUser, selectedForumId, tick]);

  const handleToggleForumSubscription = () => {
    if (!currentUser || !selectedForumId) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    db.toggleForumSubscription(selectedForumId, currentUser.id);
  };

  const handleOpenPostDetail = (postId: string) => {
    setActivePostId(postId);
    setActiveView('post-detail');
    try {
      window.history.pushState(null, '', `?post=${postId}`);
    } catch (e) {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToFeed = () => {
    setActiveView('feed');
    setActivePostId(null);
    try {
      window.history.pushState(null, '', window.location.pathname);
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAuthorProfile = (authorId: string) => {
    setProfileModalUserId(authorId);
  };

  const handleResetFilters = () => {
    setSelectedForumId(undefined);
    setSelectedTag(undefined);
    setSelectedTrust(undefined);
    setSearchQuery('');
    setSortOption('latest');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-cyan-200">
      {!firstVisitVerified && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#100b09]/95 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-[#a52a24] bg-[#1b1411] p-6 shadow-[0_0_50px_rgba(160,20,20,.18)]">
            <div className="mb-4 border-b border-[#70402d] pb-4 text-center">
              <div className="text-xs font-black tracking-[.35em] text-[#e1b68b]">PEOPLE'S INFORMATION BUREAU</div>
              <h1 className="mt-3 text-2xl font-black tracking-widest text-[#f5e8d0]">출입 보안 검문</h1>
              <p className="mt-2 text-xs text-[#c7a68b]">기록 열람 전 자동화 접속 여부를 확인합니다.</p>
            </div>
            <TurnstileWidget onToken={setFirstVisitToken} />
            {firstVisitError && <p className="my-2 text-xs text-red-300">{firstVisitError}</p>}
            <button onClick={async () => { const ok = firstVisitToken && await verifyTurnstile(firstVisitToken); if (ok) { sessionStorage.setItem('inmin_turnstile_ok','1'); setFirstVisitVerified(true); } else setFirstVisitError('검문 인증에 실패했습니다. 다시 인증해 주세요.'); }} className="mt-4 w-full border border-red-500 bg-[#9d211c] px-4 py-3 text-sm font-black tracking-widest text-[#fff1db] hover:bg-[#b52b24]">검문 통과 / CONTINUE</button>
          </div>
        </div>
      )}
      <ToastViewport />
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenNewPost={() => {
          if (!currentUser) {
            setAuthModalMode('login');
            setAuthModalOpen(true);
            return;
          }
          setEditingPost(undefined);
          setPostEditorOpen(true);
        }}
        onOpenProfile={(uid) => setProfileModalUserId(uid)}
        onOpenAdmin={() => setActiveView('admin')}
        onOpenTierGuide={() => setTierGuideModalOpen(true)}
        onOpenPrivacyNotice={() => setPrivacyNoticeModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Left Sidebar */}
        <Sidebar
          forums={forums}
          selectedForumId={selectedForumId}
          selectedTag={selectedTag}
          selectedTrust={selectedTrust}
          onSelectForum={(fid) => {
            setSelectedForumId(fid);
            setActiveView('feed');
          }}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
            setActiveView('feed');
          }}
          onSelectTrust={(trust) => {
            setSelectedTrust(trust);
            setActiveView('feed');
          }}
          onOpenCreateForum={() => {
            if (!currentUser) {
              setAuthModalMode('login');
              setAuthModalOpen(true);
              return;
            }
            setCreateForumModalOpen(true);
          }}
          onOpenTierGuide={() => setTierGuideModalOpen(true)}
          onOpenPrivacyNotice={() => setPrivacyNoticeModalOpen(true)}
          onOpenAdmin={() => setActiveView('admin')}
          currentUser={currentUser}
          subscribedForums={subscribedForums}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />

        {/* Center Main View Area (Mobile responsive padding) */}
        <main className="flex-1 min-w-0 pb-20 md:pb-8">
          {/* VIEW: 관리자 대시보드 */}
          {activeView === 'admin' ? (
            currentUser?.isAdmin ? (
              <AdminDashboard
                currentAdmin={currentUser}
                onPostClick={handleOpenPostDetail}
                onAuthorClick={handleOpenAuthorProfile}
              />
            ) : (
              <div className="p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <AlertCircle className="mx-auto text-rose-400 mb-2" size={32} />
                <h3 className="text-base font-bold text-white">관리자 권한이 필요합니다</h3>
                <p className="text-xs text-slate-400 mt-1">
                  관리자 권한이 승인된 계정으로 로그인해야 대시보드에 접근할 수 있습니다.
                </p>
                <button
                  onClick={() => setActiveView('feed')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  포럼 메인으로 돌아가기
                </button>
              </div>
            )
          ) : activeView === 'post-detail' && activePostId ? (
            /* VIEW: 게시물 상세 및 댓글 트리 */
            <PostDetail
              postId={activePostId}
              currentUser={currentUser}
              onBack={handleBackToFeed}
              onAuthorClick={handleOpenAuthorProfile}
              onOpenAuth={(mode) => {
                setAuthModalMode(mode);
                setAuthModalOpen(true);
              }}
              onEditPost={(p) => {
                setEditingPost(p);
                setPostEditorOpen(true);
              }}
              onDeleteSuccess={() => {
                setTick((t) => t + 1);
                handleBackToFeed();
              }}
            />
          ) : (
            /* VIEW: 포럼 메인 피드 & 정렬/검색 */
            <div className="space-y-6">
              {/* 포럼 헤더 배너 (개별 포럼 선택 시 표시) */}
              {activeForum ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
                  <div className="h-32 sm:h-40 w-full overflow-hidden relative">
                    <img
                      src={activeForum.bannerUrl}
                      alt={activeForum.name}
                      className="w-full h-full object-cover brightness-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                  </div>

                  <div className="p-5 sm:p-6 -mt-12 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700">
                          {activeForum.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          구독자 {activeForum.subscriberCount || 0}명 • 게시물 {activeForum.postCount || 0}개
                        </span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white">{activeForum.name}</h1>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {activeForum.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {currentUser?.isAdmin && (
                        <button
                          onClick={() => setActiveView('admin')}
                          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="관리자 대시보드 포럼 관리로 이동"
                        >
                          <ShieldAlert size={14} />
                          <span>관리자: 포럼 관리</span>
                        </button>
                      )}

                      <button
                        onClick={handleToggleForumSubscription}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                          isSubscribedToActiveForum
                            ? 'bg-amber-950 text-amber-300 border border-amber-600'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        <Star
                          size={14}
                          className={isSubscribedToActiveForum ? 'fill-current text-amber-400' : ''}
                        />
                        <span>{isSubscribedToActiveForum ? '구독 중' : '포럼 구독하기'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!currentUser) {
                            setAuthModalMode('login');
                            setAuthModalOpen(true);
                            return;
                          }
                          setEditingPost(undefined);
                          setPostEditorOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        글쓰기
                      </button>
                    </div>
                  </div>

                  {activeForum.rules && (
                    <div className="px-5 sm:px-6 pb-4 pt-1 text-[11px] text-slate-400 border-t border-slate-850 bg-slate-950/40">
                      📜 <strong>포럼 수칙:</strong> {activeForum.rules}
                    </div>
                  )}
                </div>
              ) : (
                /* 전체 피드 메인 배너 */
                <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-900/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <EmblemLogo size={64} className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-red-700/70 shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0" />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                          인민정보국 • 익명 보안 네트워크
                        </span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white">
                        <span className="text-white">인민정보국</span> <span className="text-emerald-400">database</span>
                      </h1>
                      <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                        실명과 이메일 없이 별도의 가명으로 안전하게 소통하는 익명 커뮤니티 데이터베이스. 11단계 활동 등급과 유출 검증 태그가 적용됩니다.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPrivacyNoticeModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition-all shrink-0"
                  >
                    <ShieldCheck size={16} />
                    <span>개인정보 원칙 확인</span>
                  </button>
                </div>
              )}

              {/* Feed Controls: Sort, Active Filter Badges, Post Count */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                {/* Left: Active Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Filter size={13} />
                    <span>필터:</span>
                  </span>

                  {selectedForumId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                      포럼: {activeForum?.name}
                      <button onClick={() => setSelectedForumId(undefined)} className="hover:text-rose-400">
                        ✕
                      </button>
                    </span>
                  )}

                  {selectedTag && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-bold ${
                        selectedTag === '유출 가능'
                          ? 'bg-rose-950 text-rose-300 border-rose-600'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      태그: {selectedTag}
                      <button onClick={() => setSelectedTag(undefined)} className="hover:opacity-75">
                        ✕
                      </button>
                    </span>
                  )}

                  {selectedTrust && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950 text-amber-300 border border-amber-600 font-bold">
                      신뢰도: {selectedTrust}
                      <button onClick={() => setSelectedTrust(undefined)} className="hover:opacity-75">
                        ✕
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700 font-medium">
                      검색어: "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:opacity-75">
                        ✕
                      </button>
                    </span>
                  )}

                  {!selectedForumId && !selectedTag && !selectedTrust && !searchQuery && (
                    <span className="text-slate-500">전체 게시물 (필터 없음)</span>
                  )}

                  {(selectedForumId || selectedTag || selectedTrust || searchQuery) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-cyan-400 hover:underline font-semibold ml-1"
                    >
                      전체 초기화
                    </button>
                  )}
                </div>

                {/* Right: Sort Dropdown & Post Counter */}
                <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                  <span className="text-slate-500">
                    총 <strong className="text-slate-200">{posts.length}</strong>개 글
                  </span>

                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    <ArrowUpDown size={13} className="text-slate-400" />
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as PostSortOption)}
                      className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                    >
                      <option value="latest">최신 순</option>
                      <option value="trust_high">신뢰도 높은 순</option>
                      <option value="trust_mid">신뢰도 중간 순</option>
                      <option value="trust_low">신뢰도 낮은 순</option>
                      <option value="comments">댓글 많은 순</option>
                      <option value="views">조회 수 많은 순</option>
                      <option value="likes">좋아요 많은 순</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 게시물 목록 피드 */}
              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostClick={handleOpenPostDetail}
                      onAuthorClick={handleOpenAuthorProfile}
                      onOpenAuth={(mode) => {
                        setAuthModalMode(mode);
                        setAuthModalOpen(true);
                      }}
                      onEditTrustClick={(p) => setTrustModalPost(p)}
                      onDeleteSuccess={() => setTick((t) => t + 1)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <Search size={22} />
                  </div>
                  <h3 className="text-base font-bold text-slate-200">조건에 일치하는 게시물이 없습니다</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    적용된 필터 조건이나 검색어를 변경하거나, 첫 번째 새 게시물을 작성해 보세요.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      필터 초기화
                    </button>
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setAuthModalMode('login');
                          setAuthModalOpen(true);
                          return;
                        }
                        setEditingPost(undefined);
                        setPostEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      새 글 작성하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 3. Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 mb-14 md:mb-0 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <EmblemLogo size={24} className="w-6 h-6 rounded-md border border-red-700/60" />
            <span className="font-bold text-slate-200">인민정보국</span>
            <span>• 익명 기반 신뢰도 검증 커뮤니티</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setPrivacyNoticeModalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              개인정보 격리보호 원칙
            </button>
            <button
              onClick={() => setTierGuideModalOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              회원 칭호(활동 등급) 안내
            </button>
          </div>
        </div>
      </footer>

      {/* Modals Container */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setCurrentUserData(db.getCurrentUser());
          setTick((t) => t + 1);
        }}
      />

      {currentUser && (
        <PostEditor
          isOpen={postEditorOpen}
          initialPost={editingPost}
          defaultForumId={selectedForumId}
          forums={forums}
          authorId={currentUser.id}
          onClose={() => {
            setPostEditorOpen(false);
            setEditingPost(undefined);
          }}
          onSuccess={(newId) => {
            setTick((t) => t + 1);
            handleOpenPostDetail(newId);
          }}
        />
      )}

      {profileModalUserId && (
        <ProfileModal
          userId={profileModalUserId}
          currentUserId={currentUser?.id}
          isOpen={!!profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
          onPostClick={(postId) => handleOpenPostDetail(postId)}
        />
      )}

      {currentUser && (
        <CreateForumModal
          isOpen={createForumModalOpen}
          ownerId={currentUser.id}
          onClose={() => setCreateForumModalOpen(false)}
          onSuccess={(forumId) => {
            setSelectedForumId(forumId);
            setTick((t) => t + 1);
          }}
        />
      )}

      <TierGuideModal
        isOpen={tierGuideModalOpen}
        onClose={() => setTierGuideModalOpen(false)}
      />

      <PrivacyNoticeModal
        isOpen={privacyNoticeModalOpen}
        onClose={() => setPrivacyNoticeModalOpen(false)}
      />

      {trustModalPost && currentUser?.isAdmin && (
        <TrustChangeModal
          post={trustModalPost}
          adminId={currentUser.id}
          isOpen={!!trustModalPost}
          onClose={() => setTrustModalPost(null)}
          onSuccess={() => setTick((t) => t + 1)}
        />
      )}

      {/* 3단계 긴급 보안조치: 비회원 사이트 접근 전면 차단 화면 */}
      {isGuestBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d16]/95 backdrop-blur-md text-white">
          <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-900 border-2 border-orange-500/80 rounded-3xl shadow-[0_0_60px_rgba(249,115,22,0.25)] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/40 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert size={36} />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/20 text-orange-300 border border-orange-500/40 tracking-wider">
                경계경보 3단계 발령
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white pt-2">
                미승인 접근 차단
              </h2>
              <p className="text-sm sm:text-base font-bold text-orange-300 leading-relaxed">
                동무, 귀하는 신원이 확인되지 않아 열람이 차단되었습니다.
              </p>
            </div>

            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              현재 인민정보국에 경계경보가 발령 중이며, 신원 조회를 마치고 승인된 요원만 접속할 수 있습니다. 가입 신청 또는 로그인을 완료하십시오.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setAuthModalOpen(true);
                }}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-sm text-white shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                회원가입
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 맞춤 하단 탭 네비게이션 바 */}
      <MobileBottomNav
        activeView={activeView}
        selectedForumId={selectedForumId}
        currentUser={currentUser}
        onGoFeed={() => {
          setActiveView('feed');
          setSelectedForumId(undefined);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleForums={() => setMobileSidebarOpen(true)}
        onOpenNewPost={() => {
          if (!currentUser) {
            setAuthModalMode('login');
            setAuthModalOpen(true);
            return;
          }
          setEditingPost(undefined);
          setPostEditorOpen(true);
        }}
        onOpenTierGuide={() => setTierGuideModalOpen(true)}
        onOpenProfileOrAuth={() => {
          if (currentUser) {
            setProfileModalUserId(currentUser.id);
          } else {
            setAuthModalMode('login');
            setAuthModalOpen(true);
          }
        }}
      />
    </div>
  );
}
