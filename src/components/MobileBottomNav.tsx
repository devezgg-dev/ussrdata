import React from 'react';
import { UserProfile } from '../types';
import { Compass, Layers, Plus, Filter, User, Award, ShieldAlert } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'feed' | 'post-detail' | 'admin';
  selectedForumId?: string;
  currentUser: UserProfile | null;
  onGoFeed: () => void;
  onToggleForums: () => void;
  onOpenNewPost: () => void;
  onOpenTierGuide: () => void;
  onOpenProfileOrAuth: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  selectedForumId,
  currentUser,
  onGoFeed,
  onToggleForums,
  onOpenNewPost,
  onOpenTierGuide,
  onOpenProfileOrAuth,
}) => {
  const isFeedActive = activeView === 'feed' && !selectedForumId;
  const isForumActive = activeView === 'feed' && !!selectedForumId;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 items-center h-15 px-2">
        {/* 1. 홈 피드 */}
        <button
          onClick={onGoFeed}
          className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 cursor-pointer ${
            isFeedActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass size={20} className={isFeedActive ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-0.5 tracking-tight">피드</span>
        </button>

        {/* 2. 포럼 탐색 */}
        <button
          onClick={onToggleForums}
          className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 cursor-pointer ${
            isForumActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={20} className={isForumActive ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-0.5 tracking-tight">포럼</span>
        </button>

        {/* 3. 중앙 글쓰기 버튼 */}
        <div className="flex items-center justify-center -mt-4">
          <button
            onClick={onOpenNewPost}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center active:scale-90 transition-all cursor-pointer border-2 border-slate-950"
            aria-label="새 게시물 작성"
          >
            <Plus size={24} className="stroke-[2.5]" />
          </button>
        </div>

        {/* 4. 회원 칭호 안내 */}
        <button
          onClick={onOpenTierGuide}
          className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-slate-200 transition-colors active:scale-95 cursor-pointer"
        >
          <Award size={20} />
          <span className="text-[10px] mt-0.5 tracking-tight">칭호</span>
        </button>

        {/* 5. 내 프로필 / 로그인 */}
        <button
          onClick={onOpenProfileOrAuth}
          className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 cursor-pointer ${
            currentUser ? 'text-slate-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentUser ? (
            <>
              <img
                src={
                  currentUser.avatarUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt={currentUser.nickname}
                className="w-5 h-5 rounded-full object-cover border border-slate-600"
              />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[48px]">
                {currentUser.nickname}
              </span>
            </>
          ) : (
            <>
              <User size={20} />
              <span className="text-[10px] mt-0.5 tracking-tight">로그인</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};
