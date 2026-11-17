import { notify } from '../utils/notify';
import React, { useState } from 'react';
import { Post, UserProfile } from '../types';
import { db } from '../services/db';
import { TierBadge } from './TierBadge';
import { TrustBadge } from './TrustBadge';
import {
  Pin,
  MessageSquare,
  Eye,
  Heart,
  ShieldAlert,
  Sparkles,
  Trash2,
  MoreVertical,
  Calendar,
  Lock,
} from 'lucide-react';

interface PostCardProps {
  post: Post;
  currentUser?: UserProfile | null;
  onPostClick: (postId: string) => void;
  onAuthorClick: (authorId: string) => void;
  onEditTrustClick?: (post: Post) => void;
  onDeleteSuccess?: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostClick,
  onAuthorClick,
  onEditTrustClick,
  onDeleteSuccess,
  onOpenAuth,
}) => {
  const [liked, setLiked] = useState(() =>
    currentUser ? db.isPostLiked(post.id, currentUser.id) : false
  );
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isSensitive, setIsSensitive] = useState(post.isSensitive);
  const [showMenu, setShowMenu] = useState(false);

  // Sync if post prop changes
  React.useEffect(() => {
    setIsSensitive(post.isSensitive);
  }, [post.isSensitive]);

  const isAdmin = !!currentUser?.isAdmin;
  const isAuthor = currentUser?.id === post.authorId;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      notify('좋아요를 누르려면 로그인이 필요합니다.');
      return;
    }
    const isNowLiked = db.toggleLike(post.id, currentUser.id);
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleToggleSensitive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      notify('로그인이 필요합니다.');
      return;
    }
    if (!isAdmin && !isAuthor) {
      notify('게시물 작성자 또는 관리자만 민감함 태그를 설정할 수 있습니다.');
      return;
    }
    const ok = db.togglePostSensitive(post.id, currentUser.id);
    if (ok) {
      setIsSensitive((prev) => !prev);
      setShowMenu(false);
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !isAdmin) return;
    db.togglePin(post.id, currentUser.id);
    if (onDeleteSuccess) onDeleteSuccess();
  };

  const handleSoftDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (confirm('이 게시물을 휴지통(보관함)으로 이동하시겠습니까?')) {
      const ok = db.softDeletePost(post.id, currentUser.id, '사용자/관리자 요청 삭제');
      if (ok && onDeleteSuccess) {
        onDeleteSuccess();
      }
    }
  };

  // 텍스트 요약본 생성 (스포일러 태그는 가림 상태로 보호)
  const getContentSnippet = (raw: string) => {
    const cleaned = raw
      .replace(/\[스포일러\][\s\S]*?\[\/스포일러\]/g, ' [🔒 스포일러 가림] ')
      .replace(/```[\s\S]*?```/g, ' [💻 코드 블록] ')
      .replace(/!\[.*?\]\(.*?\)/g, ' [🖼️ 첨부 이미지] ')
      .replace(/[#*`_~>]/g, '')
      .trim();
    return cleaned.length > 130 ? cleaned.substring(0, 130) + '...' : cleaned;
  };

  return (
    <article
      onClick={() => onPostClick(post.id)}
      className={`group relative p-4 sm:p-5 rounded-xl border bg-slate-900/90 hover:bg-slate-900 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:border-slate-700/80 ${
        post.isPinned
          ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-900'
          : 'border-slate-800'
      }`}
    >
      {/* Upper Meta Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
              <Pin size={11} className="rotate-45" /> 고정
            </span>
          )}

          {/* 포럼 이름 */}
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {post.forumName || '포럼'}
          </span>

          {/* 필수 보안 태그 (유출 가능 vs 유출 불가능) */}
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              post.tag === '유출 가능'
                ? 'bg-rose-950/80 text-rose-300 border-rose-600/70'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70'
            }`}
          >
            {post.tag === '유출 가능' ? '🚨 유출 가능' : '🛡️ 유출 불가능'}
          </span>

          {/* 관리자 및 작성자 지정 민감함 태그 (1클릭 토글 가능) */}
          {isSensitive ? (
            <button
              type="button"
              onClick={handleToggleSensitive}
              disabled={!isAdmin && !isAuthor}
              className={`text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 transition-colors ${
                isAdmin || isAuthor ? 'hover:bg-rose-500/30 cursor-pointer' : ''
              }`}
              title={isAdmin || isAuthor ? '클릭 시 민감함 태그 해제' : '보안 4단계 발령 시 열람 차단 대상'}
            >
              <ShieldAlert size={11} className="text-rose-400" />
              <span>🚨 민감함</span>
              {(isAdmin || isAuthor) && <span className="text-[9px] text-rose-400/80 underline ml-0.5">해제</span>}
            </button>
          ) : (
            (isAdmin || isAuthor) && (
              <button
                type="button"
                onClick={handleToggleSensitive}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-amber-300 hover:border-amber-500/60 border border-dashed border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                title="이 게시물에 [민감함] 태그 부착 (보안 4단계 시 열람 차단)"
              >
                <ShieldAlert size={11} className="text-amber-400/70" />
                <span>+ 민감함</span>
              </button>
            )
          )}

          {/* 투표 포함 표시 */}
          {post.poll && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 flex items-center gap-1">
              📊 투표
            </span>
          )}

          {/* 신뢰도 배지 */}
          <TrustBadge
            level={post.trustLevel}
            size="sm"
            canEdit={isAdmin}
            onEditClick={() => onEditTrustClick && onEditTrustClick(post)}
          />
        </div>

        {/* 고유 링크 복사 & 메뉴 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const permalink = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
              navigator.clipboard?.writeText(permalink);
              notify('게시물 고유 링크가 복사되었습니다!');
            }}
            className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
            title="고유 링크 복사"
          >
            <Calendar size={13} className="hidden" />
            <span className="text-[10px] text-slate-400 hover:text-cyan-300 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
              🔗 링크
            </span>
          </button>

        {/* Action Menu (Pin, Delete) */}
        {(isAdmin || isAuthor) && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <MoreVertical size={15} />
            </button>
            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-36 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-1 z-30 text-xs"
              >
                {isAdmin && (
                  <button
                    onClick={handleTogglePin}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Pin size={12} /> {post.isPinned ? '고정 해제' : '게시물 고정'}
                  </button>
                )}
                {isAdmin && onEditTrustClick && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditTrustClick(post);
                    }}
                    className="w-full text-left px-3 py-1.5 text-amber-300 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <ShieldAlert size={12} /> 신뢰도 평가
                  </button>
                )}
                {(isAdmin || isAuthor) && (
                  <button
                    onClick={handleToggleSensitive}
                    className="w-full text-left px-3 py-1.5 text-rose-300 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <ShieldAlert size={12} /> {isSensitive ? '민감함 태그 해제' : '민감함 태그 부착'}
                  </button>
                )}
                <button
                  onClick={handleSoftDelete}
                  className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> 휴지통 이동
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Post Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2 leading-snug">
        {post.title}
      </h3>

      {/* Excerpt: Only visible when logged in; guests see locked message */}
      {currentUser ? (
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {getContentSnippet(post.content)}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2.5 mb-4 group/lock hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={13} className="text-amber-400 shrink-0" />
            <span className="text-slate-400 truncate">
              본문 내용은 로그인한 회원만 열람할 수 있습니다.
            </span>
          </div>
          {onOpenAuth && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAuth('login');
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold shrink-0 hover:underline cursor-pointer"
            >
              로그인
            </button>
          )}
        </div>
      )}

      {/* Bottom Row: Author & Activity stats */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex-wrap">
        {/* Author info (Click to open Profile) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onAuthorClick(post.authorId);
          }}
          className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
        >
          <img
            src={post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt={post.authorNickname}
            className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
          />
          <span className="font-semibold text-slate-200 truncate max-w-[100px] sm:max-w-none">
            {post.authorNickname}
          </span>
          <TierBadge
            tier={post.authorTier}
            titleName={post.authorPrimaryTitle?.name}
            size="xs"
            showPrefix={false}
          />
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            • {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Counts & Like Button */}
        <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 ml-auto">
          <div className="flex items-center gap-1" title="조회 수">
            <Eye size={13} className="text-slate-500" />
            <span>{post.viewCount}</span>
          </div>

          <div className="flex items-center gap-1" title="댓글 수">
            <MessageSquare size={13} className="text-slate-500" />
            <span className={post.commentCount > 0 ? 'text-indigo-400 font-semibold' : ''}>
              {post.commentCount}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 active:scale-95 transition-all cursor-pointer ${
              liked ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-rose-400'
            }`}
            title="좋아요"
          >
            <Heart size={14} className={liked ? 'fill-current text-rose-500' : ''} />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
