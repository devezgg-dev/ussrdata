import React, { useState, useRef, useEffect } from 'react';
import { Comment, UserProfile } from '../types';
import { db } from '../services/db';
import { TierBadge } from './TierBadge';
import {
  MessageSquare,
  CornerDownRight,
  Trash2,
  Send,
  AlertCircle,
  X,
  Upload,
  Lock,
  Calendar,
  Award,
  Shield,
  Clock,
} from 'lucide-react';

interface CommentSectionProps {
  postId: string;
  currentUser?: UserProfile | null;
  onAuthorClick: (authorId: string) => void;
  onCommentsUpdated: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  onAuthorClick,
  onCommentsUpdated,
  onOpenAuth,
}) => {
  const [comments, setComments] = useState<Comment[]>(() => db.getComments(postId));
  const [newContent, setNewContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 쿨다운 카운트다운 타이머
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const refreshComments = () => {
    setComments(db.getComments(postId));
    onCommentsUpdated();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setImageUrl(data);
      setImagePreview(data);
    };
    reader.readAsDataURL(file);
  };

  const handlePostComment = (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!currentUser) {
      setError('댓글을 작성하려면 먼저 로그인해 주세요.');
      return;
    }

    if (currentUser.isTimedOut) {
      setError('현재 계정이 타임아웃 상태이므로 댓글을 작성할 수 없습니다.');
      return;
    }

    const textToSubmit = parentId ? replyContent : newContent;
    if (!textToSubmit.trim()) {
      setError('댓글 내용을 입력해 주세요.');
      return;
    }

    try {
      const newComm = db.createComment({
        postId,
        authorId: currentUser.id,
        content: textToSubmit.trim(),
        parentId,
        imageUrl: parentId ? undefined : imageUrl || undefined,
      });

      if (newComm) {
        if (parentId) {
          setReplyingTo(null);
          setReplyContent('');
        } else {
          setNewContent('');
          setImageUrl('');
          setImagePreview(null);
        }
        setError('');
        refreshComments();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '댓글 작성에 실패했습니다.';
      setError(msg);
      // 긴장 단계 쿨다운 오류 파싱
      const match = msg.match(/(\d+)초/);
      if (match) {
        setCooldownRemaining(parseInt(match[1], 10));
      }
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!currentUser) return;
    if (confirm('댓글을 삭제하시겠습니까?')) {
      db.softDeleteComment(commentId, currentUser.id);
      refreshComments();
    }
  };

  const secConfig = db.getSecurityConfig();

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-400" />
          <span>댓글</span>
          <span className="text-sm font-semibold text-cyan-400">
            {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
          </span>
        </h3>
        {secConfig.level >= 2 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
            <Clock size={12} />
            <span>긴장 단계: 댓글 간 10초 쿨다운 적용 중</span>
          </div>
        )}
      </div>

      {/* 댓글 작성 및 목록: 회원 전용 */}
      {!currentUser ? (
        <div className="p-8 bg-slate-950/70 border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={22} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">댓글 및 토론 열람 제한</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              댓글 열람 및 참여는 인민정보국 회원 전용 기능입니다. 로그인 후 토론에 참여해 보세요.
            </p>
          </div>
          {onOpenAuth && (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              로그인하고 댓글 보기
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 댓글 작성 폼 (루트) */}
          <form
            onSubmit={(e) => handlePostComment(e)}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <img
                src={currentUser.avatarUrl || '/assets/aistudio/9066ba82ee5f80352302e2724d7988b4_1__734b64fb.jpg'}
                alt={currentUser.nickname}
                className="w-5 h-5 aspect-square rounded-md object-cover border border-slate-700"
              />
              <span className="font-semibold text-white">{currentUser.nickname}</span>
              <TierBadge tier={currentUser.tier} size="sm" />
            </div>

            <textarea
              value={newContent}
              onChange={(e) => {
                setNewContent(e.target.value);
                setError('');
              }}
              rows={3}
              placeholder="타인을 존중하는 건전한 댓글을 남겨주세요 (실명·이메일 언급 금지)"
              className="w-full p-3 text-sm bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />

            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="댓글 첨부 이미지"
                  className="max-h-32 rounded-lg border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageUrl('');
                  }}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-full"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <AlertCircle size={13} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>사진 첨부</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={cooldownRemaining > 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Send size={12} />
                {cooldownRemaining > 0 ? `대기 중 (${cooldownRemaining}초)` : '댓글 등록'}
              </button>
            </div>
          </form>

          {/* 댓글 목록 - 요청된 UI 사진 규격: 왼쪽 프로필사진+칭호+회원등급+가입날짜 / 오른쪽 댓글내용 */}
          <div className="space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const joinDateFormatted = new Date(
                  comment.authorJoinedAt || comment.createdAt
                ).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });

                return (
                  <div
                    key={comment.id}
                    className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-lg transition-colors hover:border-slate-600"
                  >
                    {/* Two-column layout matching reference photo */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(190px,0.34fr)_minmax(0,0.66fr)]">
                      {/* Left Column: 프로필 사진 (정사각형), 칭호, 회원등급, 가입 날짜 */}
                      <div
                        onClick={() => onAuthorClick(comment.authorId)}
                        className="w-full shrink-0 flex flex-row md:flex-col items-center md:items-stretch gap-3 p-3 md:p-4 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 cursor-pointer hover:bg-slate-950 transition-colors"
                      >
                        {/* 프로필 사진 (정사각형) */}
                        <div className="relative shrink-0">
                          <img
                            src={
                              comment.authorAvatar ||
                              '/assets/aistudio/9066ba82ee5f80352302e2724d7988b4_1__734b64fb.jpg'
                            }
                            alt={comment.authorNickname}
                            className="w-20 h-20 md:w-full md:h-auto md:max-h-64 md:aspect-square shrink-0 rounded-xl object-cover border border-slate-700 shadow-md"
                          />
                        </div>

                        {/* 모바일 가로 / PC 세로 정렬 메타정보 */}
                        <div className="flex flex-col items-start flex-1 min-w-0 space-y-1.5 md:pt-1">
                          {/* 닉네임 */}
                          <div className="text-xs font-bold text-white truncate max-w-full">
                            {comment.authorNickname}
                          </div>

                          {/* 칭호 */}
                          <div className="flex items-center gap-1 max-w-full">
                            {comment.authorPrimaryTitle ? (
                              <span
                                className="px-1.5 py-0.5 text-[10px] font-semibold rounded border truncate max-w-full bg-slate-900 text-slate-200 border-slate-700"
                                style={{
                                  borderColor: comment.authorPrimaryTitle.color
                                    ? `${comment.authorPrimaryTitle.color}50`
                                    : undefined,
                                }}
                              >
                                {comment.authorPrimaryTitle.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">칭호 없음</span>
                            )}
                          </div>

                          {/* 회원등급 */}
                          <div className="pt-0.5">
                            <TierBadge tier={comment.authorTier} size="xs" showPrefix={false} />
                          </div>

                          {/* 가입 날짜 */}
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5 whitespace-nowrap">
                            <Calendar size={10} className="text-slate-500 shrink-0" />
                            <span>{joinDateFormatted}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: 댓글내용, 첨부이미지, 액션 */}
                      <div className="flex-1 min-w-0 w-full flex flex-col justify-between self-stretch bg-slate-900/80 p-4 sm:p-5 min-h-44">
                        <div className="space-y-2">
                          {/* 상단 메타 및 삭제 버튼 */}
                          <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-800/60">
                            <span className="text-[11px] text-slate-400">
                              작성: {new Date(comment.createdAt).toLocaleString('ko-KR')}
                            </span>
                            {(currentUser?.id === comment.authorId || currentUser?.isAdmin) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                                title="댓글 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* 댓글내용 */}
                          <div className="text-sm sm:text-base text-slate-100 font-medium leading-7 whitespace-pre-line py-2 break-words min-h-24">
                            {comment.content}
                          </div>

                          {/* 첨부 이미지 */}
                          {comment.imageUrl && (
                            <div className="pt-1">
                              <img
                                src={comment.imageUrl}
                                alt="댓글 첨부 이미지"
                                className="max-h-56 rounded-lg border border-slate-700 object-cover shadow-md"
                              />
                            </div>
                          )}
                        </div>

                        {/* 하단 액션: 대댓글 달기 버튼 */}
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 px-2 py-1 rounded bg-slate-950/50 hover:bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                          >
                            <CornerDownRight size={13} />
                            <span>답글 달기</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 대댓글 입력 박스 */}
                    {replyingTo === comment.id && currentUser && (
                      <form
                        onSubmit={(e) => handlePostComment(e, comment.id)}
                        className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          placeholder={`${comment.authorNickname}님에게 답글 작성...`}
                          className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                          >
                            답글 등록
                          </button>
                        </div>
                      </form>
                    )}

                    {/* 대댓글 리스트 (Replies) */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-2 space-y-2 border-l-2 border-indigo-500/30 pl-3 sm:pl-4">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="p-2.5 sm:p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div
                                onClick={() => onAuthorClick(reply.authorId)}
                                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-wrap"
                              >
                                <img
                                  src={
                                    reply.authorAvatar ||
                                    '/assets/aistudio/9066ba82ee5f80352302e2724d7988b4_1__734b64fb.jpg'
                                  }
                                  alt={reply.authorNickname}
                                  className="w-5 h-5 aspect-square rounded-md object-cover border border-slate-700"
                                />
                                <span className="font-semibold text-slate-200">
                                  {reply.authorNickname}
                                </span>
                                <TierBadge tier={reply.authorTier} size="xs" />
                                <span className="text-slate-500 text-[10px]">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              {(currentUser?.id === reply.authorId || currentUser?.isAdmin) && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                  title="답글 삭제"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-6 whitespace-pre-line">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                아직 작성된 댓글이 없습니다. 첫 번째 의견을 남겨보세요!
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
