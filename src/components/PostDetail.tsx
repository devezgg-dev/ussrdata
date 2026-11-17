import { notify } from '../utils/notify';
import React, { useState, useEffect } from 'react';
import { Post, UserProfile, PostTrustHistory } from '../types';
import { db } from '../services/db';
import { RichContentRenderer } from './RichContentRenderer';
import { TierBadge } from './TierBadge';
import { TrustBadge } from './TrustBadge';
import { CommentSection } from './CommentSection';
import { TrustChangeModal } from './TrustChangeModal';
import {
  ArrowLeft,
  Pin,
  Heart,
  Eye,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  History,
  Edit3,
  Trash2,
  Calendar,
  Share2,
  AlertTriangle,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface PostDetailProps {
  postId: string;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onAuthorClick: (authorId: string) => void;
  onEditPost: (post: Post) => void;
  onDeleteSuccess: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  postId,
  currentUser,
  onBack,
  onAuthorClick,
  onEditPost,
  onDeleteSuccess,
  onOpenAuth,
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showTrustHistory, setShowTrustHistory] = useState(false);
  const [trustHistories, setTrustHistories] = useState<PostTrustHistory[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // 게시물 로드 및 중복 없는 방문수 기록 (db.getPost 내부에서 세션/사용자 중복 방지)
  useEffect(() => {
    const p = db.getPost(postId, currentUser?.id, 'session-' + (window.name || 'viewer'));
    if (p) {
      setPost({ ...p });
      setLikeCount(p.likeCount);
      if (currentUser) {
        setLiked(db.isPostLiked(p.id, currentUser.id));
      }
      setTrustHistories(db.getPostTrustHistories(postId));
    }
  }, [postId, currentUser?.id]);

  if (!post) {
    return (
      <div className="p-12 text-center text-slate-400">
        게시물을 찾을 수 없거나 삭제되었습니다.
        <button
          onClick={onBack}
          className="block mx-auto mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const isAdmin = !!currentUser?.isAdmin;
  const isAuthor = currentUser?.id === post.authorId;

  const handleLike = () => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth('login');
      } else {
        notify('좋아요를 누르려면 로그인이 필요합니다.');
      }
      return;
    }
    const isNowLiked = db.toggleLike(post.id, currentUser.id);
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleTogglePin = () => {
    if (!currentUser || !isAdmin) return;
    db.togglePin(post.id, currentUser.id);
    setPost({ ...post, isPinned: !post.isPinned });
  };

  const handleSoftDelete = () => {
    if (!currentUser) return;
    if (confirm('이 게시물을 휴지통(보관함)으로 이동하시겠습니까?')) {
      const ok = db.softDeletePost(post.id, currentUser.id, '사용자/관리자 요청 삭제');
      if (ok) {
        onDeleteSuccess();
        onBack();
      }
    }
  };

  const handleTrustUpdateSuccess = () => {
    const updated = db.getPost(postId);
    if (updated) setPost({ ...updated });
    setTrustHistories(db.getPostTrustHistories(postId));
  };

  const handleCopyLink = () => {
    const permalink = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
    navigator.clipboard?.writeText(permalink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleSensitive = () => {
    if (!currentUser || (!isAdmin && !isAuthor)) return;
    db.togglePostSensitive(post.id, currentUser.id);
    const updated = db.getPost(postId);
    if (updated) setPost({ ...updated });
  };

  const isMasked =
    post.title === '보안조치로 인하여 열람 불가' ||
    post.content === '보안조치로 인하여 열람 불가' ||
    post.title.includes('보안조치로 인하여 열람 불가');

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>목록으로</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={handleTogglePin}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                post.isPinned
                  ? 'bg-indigo-950 border-indigo-600 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Pin size={13} className={post.isPinned ? 'rotate-45' : ''} />
              <span>{post.isPinned ? '고정 해제' : '상단 고정'}</span>
            </button>
          )}

          {(isAdmin || isAuthor) && (
            <button
              onClick={handleToggleSensitive}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                post.isSensitive
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-600/60'
              }`}
              title="민감함 태그 부착/해제 (보안 4단계 발령 시 열람 차단 대상)"
            >
              <ShieldAlert size={14} className={post.isSensitive ? 'text-rose-400' : 'text-amber-400'} />
              <span>{post.isSensitive ? '🚨 민감함 해제' : '🛡️ 민감함 부착'}</span>
            </button>
          )}

          {(isAdmin || isAuthor) && (
            <>
              <button
                onClick={() => onEditPost(post)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg hover:border-slate-700 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>수정</span>
              </button>
              <button
                onClick={handleSoftDelete}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-rose-950/40 border border-rose-800 text-rose-300 hover:bg-rose-900/60 rounded-lg cursor-pointer"
              >
                <Trash2 size={13} />
                <span>삭제</span>
              </button>
            </>
          )}

          {/* 고유 링크 복사 버튼 */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              copiedLink
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700'
            }`}
            title="게시물 고유 링크 복사"
          >
            <Share2 size={13} />
            <span>{copiedLink ? '고유 링크 복사됨! ✓' : '고유 링크 복사'}</span>
          </button>
        </div>
      </div>

      {/* Main Post Card */}
      <article className="p-4 sm:p-7 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 sm:space-y-6">
        {/* Meta Header */}
        <div className="flex flex-wrap items-center gap-2 pb-3.5 border-b border-slate-800/80">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-600">
              <Pin size={11} className="rotate-45" /> 추천 고정
            </span>
          )}

          <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {post.forumName}
          </span>

          <span
            className={`text-xs font-bold px-2 py-0.5 rounded border ${
              post.tag === '유출 가능'
                ? 'bg-rose-950 text-rose-300 border-rose-600'
                : 'bg-emerald-950 text-emerald-300 border-emerald-600'
            }`}
          >
            {post.tag === '유출 가능' ? '🚨 유출 가능' : '🛡️ 유출 불가능'}
          </span>

          {/* 민감함 배지 (클릭 시 토글 가능) */}
          {post.isSensitive ? (
            <button
              onClick={(isAdmin || isAuthor) ? handleToggleSensitive : undefined}
              className={`text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 ${
                isAdmin || isAuthor ? 'hover:bg-rose-500/30 cursor-pointer' : ''
              }`}
              title={(isAdmin || isAuthor) ? '클릭 시 민감함 태그 해제' : '보안 4단계 발령 시 열람 차단 대상'}
            >
              <ShieldAlert size={12} className="text-rose-400" />
              <span>🚨 민감함 [SENSITIVE]</span>
              {(isAdmin || isAuthor) && <span className="text-[10px] text-rose-400/80 underline ml-0.5">(해제)</span>}
            </button>
          ) : (
            (isAdmin || isAuthor) && (
              <button
                onClick={handleToggleSensitive}
                className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-dashed border-slate-700 hover:border-amber-500 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="이 게시물에 민감함 태그 부착"
              >
                <ShieldAlert size={12} className="text-amber-400/80" />
                <span>+ 민감함 태그 부착</span>
              </button>
            )
          )}

          {/* 신뢰도 배지 */}
          <TrustBadge
            level={post.trustLevel}
            size="md"
            canEdit={isAdmin}
            onEditClick={() => setShowTrustModal(true)}
          />

          {trustHistories.length > 0 && (
            <button
              onClick={() => setShowTrustHistory(!showTrustHistory)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 ml-auto cursor-pointer"
            >
              <History size={13} />
              <span>신뢰도 감사 이력 ({trustHistories.length})</span>
            </button>
          )}
        </div>

        {/* 신뢰도 변경 이력 아코디언 */}
        {showTrustHistory && trustHistories.length > 0 && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>관리자 신뢰도 감사 기록 (Audit History)</span>
            </div>
            {trustHistories.map((th) => (
              <div key={th.id} className="p-2.5 rounded bg-slate-900 border border-slate-800/80 flex items-start justify-between">
                <div>
                  <div className="text-slate-300 font-medium">
                    평가 변경: <strong className="text-slate-400">{th.previousLevel}</strong> ➔{' '}
                    <strong className="text-indigo-300">{th.newLevel}</strong>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">사유: {th.note}</div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <div>담당: {th.adminNickname}</div>
                  <div>{new Date(th.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
          {post.title}
        </h1>

        {/* Author Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/70 text-xs text-slate-300">
          <div
            onClick={() => onAuthorClick(post.authorId)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img
              src={post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={post.authorNickname}
              className="w-9 h-9 rounded-full object-cover border border-slate-700"
            />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-100 flex-wrap">
                <span>{post.authorNickname}</span>
                <TierBadge
                  tier={post.authorTier}
                  titleName={post.authorPrimaryTitle?.name}
                  size="sm"
                  showPrefix={true}
                />
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <Calendar size={11} />
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 ml-auto">
            <span className="flex items-center gap-1">
              <Eye size={14} className="text-slate-500" />
              <span>조회 {post.viewCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} className="text-slate-500" />
              <span>댓글 {post.commentCount}</span>
            </span>
          </div>
        </div>

        {/* Post Formatted Content: Visible only when logged in; guests see locked security view */}
        {currentUser ? (
          <div className="pt-2 pb-4 space-y-5">
            {isMasked ? (
              <div className="my-4 p-6 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-center space-y-2.5">
                <ShieldAlert size={32} className="text-rose-400 mx-auto" />
                <h4 className="text-base font-bold text-rose-300">
                  보안조치로 인하여 열람 불가
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  현재 발령된 긴급 보안 조치(민감 정보 유출 차단 또는 전체 폐쇄)에 따라 본 게시물의 본문 조회가 일시적으로 차단되었습니다.
                </p>
              </div>
            ) : (
              <RichContentRenderer content={post.content} />
            )}

            {/* 투표 (Poll) 섹션 */}
            {post.poll && !isMasked && (
              <div className="my-5 p-4 sm:p-5 bg-slate-950/90 rounded-2xl border border-cyan-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">📊</span>
                    <span>{post.poll.question}</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">
                    총 {post.poll.totalVotes || 0}표
                  </span>
                </div>

                <div className="space-y-2">
                  {post.poll.options.map((opt) => {
                    const hasVotedThis = currentUser ? opt.votes.includes(currentUser.id) : false;
                    const percent =
                      post.poll?.totalVotes && post.poll.totalVotes > 0
                        ? Math.round((opt.votes.length / post.poll.totalVotes) * 100)
                        : 0;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            onOpenAuth?.('login');
                            return;
                          }
                          const res = db.votePoll(post.id, opt.id, currentUser.id);
                          if (res.success) {
                            const updated = db.getPost(postId);
                            if (updated) setPost({ ...updated });
                          } else if (res.error) {
                            notify(res.error);
                          }
                        }}
                        className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          hasVotedThis
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* 진행률 바 */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            hasVotedThis ? 'bg-cyan-500/25' : 'bg-slate-800/60'
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        <div className="relative flex items-center justify-between text-xs sm:text-sm">
                          <span
                            className={`font-semibold ${
                              hasVotedThis ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {hasVotedThis && '✓ '}
                            {opt.text}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400 ml-2 shrink-0">
                            {percent}% ({opt.votes.length}표)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>* 회원은 1인 1표 참여 가능하며, 다른 항목 선택 시 표가 이동합니다.</span>
                  {currentUser &&
                    post.poll.options.some((o) => o.votes.includes(currentUser.id)) && (
                      <span className="text-cyan-400 font-bold">투표 참여 완료 ✓</span>
                    )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="my-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.08)] text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock size={26} />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold tracking-wider mb-2">
              🔒 회원 전용 열람 구역
            </span>

            <h3 className="text-lg sm:text-xl font-black text-white mb-2">
              게시물 본문 및 첨부 파일 열람 제한
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
              인민정보국 보안 원칙에 따라 로그인하지 않은 방문자는 <strong>제목만 열람</strong>할 수 있습니다.
              본문 전체 내용 및 첨부된 자료를 확인하시려면 로그인해 주세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
              >
                <LogIn size={15} />
                <span>로그인하기</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth?.('signup')}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                <UserPlus size={15} />
                <span>가명 회원가입</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              🛡️ 실명 및 이메일 수집 없음 • 가명 닉네임과 생년월일만으로 안전하게 이용 가능
            </p>
          </div>
        )}

        {/* Bottom Actions Bar (Like Button) */}
        <div className="flex items-center justify-center pt-6 border-t border-slate-800">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border text-sm font-bold transition-all shadow-md cursor-pointer ${
              liked
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-rose-500 hover:text-rose-300'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-current text-rose-500 animate-bounce' : ''} />
            <span>좋아요 {likeCount}</span>
          </button>
        </div>
      </article>

      {/* Comment Section Component */}
      <div className="p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          onAuthorClick={onAuthorClick}
          onOpenAuth={onOpenAuth}
          onCommentsUpdated={() => {
            const updated = db.getPost(postId);
            if (updated) setPost({ ...updated });
          }}
        />
      </div>

      {/* Admin Trust Change Modal */}
      {isAdmin && currentUser && (
        <TrustChangeModal
          post={post}
          adminId={currentUser.id}
          isOpen={showTrustModal}
          onClose={() => setShowTrustModal(false)}
          onSuccess={handleTrustUpdateSuccess}
        />
      )}
    </div>
  );
};
