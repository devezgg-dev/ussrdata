import React, { useState, useEffect } from 'react';
import { UserProfile, Title, Post, Comment } from '../types';
import { db } from '../services/db';
import { TierBadge } from './TierBadge';
import { getNextTierProgress } from '../utils/tierCalculator';
import { validateNickname } from '../utils/privacyValidator';
import {
  X,
  Calendar,
  FileText,
  MessageSquare,
  Eye,
  ShieldCheck,
  Edit2,
  Award,
  Lock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Trash2,
  KeyRound,
} from 'lucide-react';

interface ProfileModalProps {
  userId: string;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onPostClick?: (postId: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  userId,
  currentUserId,
  isOpen,
  onClose,
  onPostClick,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'settings'>('overview');

  // 수정 양식 상태
  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPrimaryTitleId, setEditPrimaryTitleId] = useState<string | undefined>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 사용자의 보유 칭호 목록
  const [userTitles, setUserTitles] = useState<Title[]>([]);
  // 최근 작성한 게시물 및 댓글
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const p = db.getProfile(userId);
    if (p) {
      setProfile(p);
      setEditNickname(p.nickname);
      setEditBio(p.bio);
      setEditAvatarUrl(p.avatarUrl);
      setEditPrimaryTitleId(p.primaryTitleId);

      const titles = db.getUserTitles(userId);
      setUserTitles(titles);

      const posts = db.getPosts({ authorId: userId });
      setRecentPosts(posts);
    }
  }, [isOpen, userId]);

  if (!isOpen || !profile) return null;

  const isOwner = currentUserId === userId;
  const primaryTitle = userTitles.find((t) => t.id === profile.primaryTitleId);
  const tierProgress = getNextTierProgress(
    profile.isAdmin,
    profile.postCount,
    profile.commentCount,
    profile.visitedPostCount
  );

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 닉네임 변경 시도 시 유효성 및 중복 검사
    if (editNickname.trim() !== profile.nickname) {
      const v = validateNickname(editNickname);
      if (!v.isValid) {
        setMessage({ type: 'error', text: v.errorMessage || '유효하지 않은 닉네임입니다.' });
        return;
      }

      const nickRes = db.changeNickname(userId, editNickname.trim());
      if (!nickRes.success) {
        setMessage({ type: 'error', text: nickRes.message || '닉네임 변경에 실패했습니다.' });
        return;
      }
    }

    // 자기소개, 아바타, 대표 칭호 업데이트
    db.updateProfile(userId, {
      bio: editBio.trim(),
      avatarUrl: editAvatarUrl.trim(),
      primaryTitleId: editPrimaryTitleId,
    });

    const updated = db.getProfile(userId);
    if (updated) setProfile(updated);
    setMessage({ type: 'success', text: '프로필 정보가 안전하게 저장되었습니다.' });
  };

  const handleRemoveUserTitle = (titleId: string, titleName: string) => {
    if (confirm(`"${titleName}" 칭호를 목록에서 삭제하시겠습니까?`)) {
      const actorId = currentUserId || profile.id;
      db.removeUserTitle(titleId, profile.id, actorId);
      const updatedTitles = db.getUserTitles(profile.id);
      setUserTitles(updatedTitles);
      const updated = db.getProfile(profile.id);
      if (updated) setProfile(updated);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: '현재 비밀번호를 입력해 주세요.' });
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호는 6자 이상이어야 합니다.' });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다.' });
      return;
    }

    const res = db.changePassword(profile.id, currentPassword, newPassword);
    if (res.success) {
      setPasswordMessage({
        type: 'success',
        text: res.message || '비밀번호가 성공적으로 변경되었습니다.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } else {
      setPasswordMessage({
        type: 'error',
        text: res.message || '비밀번호 변경에 실패했습니다.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Profile Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 border-b border-slate-800 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Profile Header Card */}
        <div className="px-6 pb-4 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-12 mb-4 gap-3">
            <div className="flex items-end gap-3.5">
              <img
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={profile.nickname}
                className="w-20 h-20 rounded-2xl border-4 border-slate-900 bg-slate-800 object-cover shadow-xl"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{profile.nickname}</h2>
                  <TierBadge
                    tier={profile.tier}
                    titleName={primaryTitle?.name}
                    size="md"
                    showPrefix={true}
                  />
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <Calendar size={13} />
                  <span>가입일: {new Date(profile.createdAt).toLocaleDateString()}</span>
                  {profile.isAdmin && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40">
                      총괄 관리자
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Edit2 size={13} />
                프로필 설정
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 mb-4 leading-relaxed">
            {profile.bio || '등록된 자기소개가 없습니다.'}
          </p>

          {/* 활동 통계 바 */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center mb-4">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <FileText size={12} className="text-indigo-400" /> 작성 게시물
              </div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{profile.postCount}개</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <MessageSquare size={12} className="text-cyan-400" /> 작성 댓글
              </div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{profile.commentCount}개</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Eye size={12} className="text-emerald-400" /> 방문한 게시물
              </div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{profile.visitedPostCount}회</div>
            </div>
          </div>

          {/* 다음 칭호 승급 진행도 바 */}
          {tierProgress.nextTier && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">
                  다음 칭호 승급 목표: <strong className="text-indigo-300">{tierProgress.nextTier}</strong>
                </span>
                <span className="font-bold text-indigo-400">{tierProgress.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${tierProgress.progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500">{tierProgress.requirementsText}</div>
            </div>
          )}

          {/* 철저한 개인정보 보호 안내 문구 (요구사항) */}
          <div className="flex items-start gap-2 p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-[11px] text-emerald-300 mb-4">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>개인정보 격리 보호:</strong> 본 사이트는 실명과 이메일을 절대 수집하지 않으며, 생년월일은 오직 내부 보안 연령 확인용으로 분리 저장되어 다른 회원에게 노출되지 않습니다.
            </span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-semibold mb-4 gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              보유 칭호 ({userTitles.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === 'posts'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              작성한 게시물 ({recentPosts.length})
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-2.5 transition-colors border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                회원 정보 수정
              </button>
            )}
          </div>

          {/* Tab 1: 보유 칭호 */}
          {activeTab === 'overview' && (
            <div className="space-y-2.5">
              {/* 기본 활동 칭호 */}
              <div className="p-3 rounded-xl bg-slate-950 border border-indigo-900/60 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-100">
                    <TierBadge tier={profile.tier} size="sm" showPrefix={true} />
                    <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800 font-semibold">
                      공식 활동 칭호
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    게시물, 댓글, 탐색 실적에 따라 자동 승급되는 회원의 공식 커뮤니티 등급 칭호입니다.
                  </p>
                </div>
              </div>

              {/* 특별 수여 칭호 목록 */}
              {userTitles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {userTitles.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100 flex-wrap">
                          <Award size={14} className="text-amber-400 shrink-0" />
                          <span className="truncate">{t.name}</span>
                          {profile.primaryTitleId === t.id && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                              대표
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                      </div>

                      {(isOwner || db.getCurrentUser()?.profile.isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUserTitle(t.id, t.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                          title="칭호 삭제"
                          aria-label="칭호 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 작성한 게시물 */}
          {activeTab === 'posts' && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      if (onPostClick) {
                        onPostClick(post.id);
                        onClose();
                      }
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="text-indigo-400 font-semibold">{post.forumName}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{post.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>조회 {post.viewCount}</span>
                      <span>댓글 {post.commentCount}</span>
                      <span>좋아요 {post.likeCount}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">작성한 게시물이 없습니다.</div>
              )}
            </div>
          )}

          {/* Tab 3: 회원 정보 수정 (닉네임 변경 및 중복검사) */}
          {activeTab === 'settings' && isOwner && (
            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  가명 닉네임 변경 <span className="text-slate-400 font-normal">(중복 검사 적용)</span>
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">자기소개</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  프로필 사진 (직접 업로드)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-700/80">
                  <div className="relative shrink-0">
                    <img
                      src={
                        editAvatarUrl ||
                        '/assets/aistudio/9066ba82ee5f80352302e2724d7988b4_1__734b64fb.jpg'
                      }
                      alt="프로필 미리보기"
                      className="w-16 h-16 aspect-square rounded-xl object-cover border-2 border-indigo-500/50 shadow-md"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                        <span>사진 파일 선택</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!file.type.startsWith('image/')) {
                                setMessage({ type: 'error', text: '이미지 파일만 업로드할 수 있습니다.' });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const data = ev.target?.result as string;
                                setEditAvatarUrl(data);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl('')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          기본 사진으로 변경
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      내 기기에서 직접 이미지를 선택하면 정사각형 프로필로 즉시 적용됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {userTitles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">대표 칭호 설정</label>
                  <select
                    value={editPrimaryTitleId || ''}
                    onChange={(e) => setEditPrimaryTitleId(e.target.value || undefined)}
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">대표 칭호 없음</option>
                    {userTitles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {message && (
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                    message.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer"
              >
                회원 프로필 변경사항 저장
              </button>

              {/* 비밀번호 변경 영역 */}
              <div className="pt-5 mt-5 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <KeyRound size={16} className="text-amber-400" />
                  <span>비밀번호 변경</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  개인정보 보호를 위해 비밀번호를 주기적으로 변경해 주세요 (최소 6자 이상).
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 사용 중인 비밀번호"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">새 비밀번호</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="최소 6자 이상"
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="새 비밀번호 재입력"
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {passwordMessage && (
                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                        passwordMessage.type === 'success'
                          ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                      }`}
                    >
                      {passwordMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      <span>{passwordMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-300 border border-amber-600/40 font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    비밀번호 변경 적용
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
