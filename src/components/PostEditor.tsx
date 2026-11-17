import React, { useState, useRef } from 'react';
import { Forum, Post, PostTag } from '../types';
import { db } from '../services/db';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { RichContentRenderer } from './RichContentRenderer';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  Quote,
  Code,
  X,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Vote,
  ShieldAlert,
  Plus,
  Trash2,
} from 'lucide-react';

interface PostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPostId: string) => void;
  initialPost?: Post; // 수정 모드 지원
  defaultForumId?: string;
  forums: Forum[];
  authorId: string;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPost,
  defaultForumId,
  forums,
  authorId,
}) => {
  const [forumId, setForumId] = useState(initialPost?.forumId || defaultForumId || forums[0]?.id || '');
  const [title, setTitle] = useState(initialPost?.title || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [tag, setTag] = useState<PostTag>(initialPost?.tag || '유출 불가능');
  const [isSensitive, setIsSensitive] = useState<boolean>(initialPost?.isSensitive || false);
  const [secretGrade, setSecretGrade] = useState<1 | 2 | 3 | 4 | 5>(initialPost?.secretGrade || 5);
  const [enablePoll, setEnablePoll] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = db.isAdmin(authorId);

  if (!isOpen) return null;

  // 에디터 툴바 단축 서식 삽입 함수
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '내용') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  // Cloud deployment stores image files in Supabase Storage; local preview remains available in dev mode.
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('PNG, JPG, GIF, WebP 이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 파일 크기는 최대 5MB까지 업로드 가능합니다.');
      return;
    }

    if (isSupabaseConfigured && supabase) {
      setError('이미지를 업로드하고 있습니다...');
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setError('로그인 후 이미지를 업로드할 수 있습니다.'); return; }
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const objectPath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('forum-uploads').upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) { setError(`이미지 업로드 실패: ${uploadError.message}`); return; }
      const { data: publicUrl } = supabase.storage.from('forum-uploads').getPublicUrl(objectPath);
      setUploadedImagePreview(publicUrl.publicUrl);
      insertFormatting(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${publicUrl.publicUrl})\n`, '', '');
      setError('');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImagePreview(dataUrl);
      insertFormatting(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${dataUrl})\n`, '', '');
    };
    reader.readAsDataURL(file);
  };

  const handleCustomImageUrl = () => {
    const url = prompt('삽입할 이미지의 웹 URL을 입력해 주세요:');
    if (url && url.trim()) {
      insertFormatting(`\n![이미지](${url.trim()})\n`, '', '');
    }
  };

  const handleInsertLink = () => {
    const url = prompt('연결할 웹 주소(URL)를 입력하세요:', 'https://');
    if (url && url.trim()) {
      const titlePrompt = prompt('링크 텍스트를 입력하세요:', '링크 바로가기');
      insertFormatting(`[${titlePrompt || '링크'}](${url.trim()})`, '', '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('게시물 제목을 입력해 주세요.');
      return;
    }

    if (!content.trim()) {
      setError('게시물 본문 내용을 입력해 주세요.');
      return;
    }

    if (!tag) {
      setError('게시물 태그("유출 가능" 또는 "유출 불가능")를 반드시 선택해야 합니다.');
      return;
    }

    if (!forumId) {
      setError('게시할 포럼을 선택해 주세요.');
      return;
    }

    if (initialPost) {
      // 수정 모드 (이미 작성된 글에도 민감함 태그 부착 및 수정 지원)
      const ok = db.updatePost(initialPost.id, authorId, {
        title: title.trim(),
        content: content.trim(),
        tag,
        isSensitive,
        ...(isAdmin ? { secretGrade } : {}),
      });
      if (ok) {
        onSuccess(initialPost.id);
        onClose();
      } else {
        setError('게시물 수정 권한이 없거나 오류가 발생했습니다.');
      }
    } else {
      // 신규 작성
      try {
        const newPost = db.createPost({
          forumId,
          authorId,
          title: title.trim(),
          content: content.trim(),
          tag,
          isSensitive,
          secretGrade,
          pollData:
            isAdmin &&
            enablePoll &&
            pollQuestion.trim() &&
            pollOptions.filter((o) => o.trim().length > 0).length >= 2
              ? {
                  question: pollQuestion.trim(),
                  options: pollOptions.filter((o) => o.trim().length > 0),
                }
              : undefined,
        });
        onSuccess(newPost.id);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '게시물 작성 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileText className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-slate-100">
              {initialPost ? '게시물 수정' : '새 게시물 작성'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Forum & Tag Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 포럼 선택 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                게시 포럼 선택 <span className="text-rose-400">*</span>
              </label>
              <select
                value={forumId}
                onChange={(e) => setForumId(e.target.value)}
                disabled={!!initialPost}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
              >
                {forums.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.category}] {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 필수 태그 선택: 유출 가능 vs 유출 불가능 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                필수 보안 태그 선택 <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTag('유출 가능')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    tag === '유출 가능'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  유출 가능
                </button>
                <button
                  type="button"
                  onClick={() => setTag('유출 불가능')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    tag === '유출 불가능'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  유출 불가능
                </button>
              </div>
            </div>
          </div>

          {/* 보안 및 민감함 옵션 (이미 작성된 글 수정 및 새 글 작성 시 모두 부착 가능) */}
          <div className="p-3.5 bg-slate-950/90 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-400" />
                보안 분류 옵션
              </span>

              {/* 게시물 비밀등급: 작성 시 회원이 1회 지정, 이후 관리자만 변경 */}
            {(!initialPost || isAdmin) && (
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 items-center">
                <label htmlFor="post-secret-grade" className="text-xs font-semibold text-slate-300">게시물 비밀등급</label>
                <select
                  id="post-secret-grade"
                  value={secretGrade}
                  onChange={(e) => setSecretGrade(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full min-w-0 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5급 [EK] — 누구나 다 아는 정보</option>
                  <option value={4}>4급 [TXE] — 조금 퍼진 소문</option>
                  <option value={3}>3급 [KNP] — 개인적인 비밀</option>
                  <option value={2}>2급 [SGO] — 퍼지면 망함</option>
                  <option value={1}>1급 [CS] — 지정된 열람자만</option>
                </select>
                <p className="sm:col-start-2 text-[10px] text-slate-500">회원은 게시물 작성 시 한 번만 지정할 수 있으며, 게시 후에는 관리자만 변경할 수 있습니다.</p>
              </div>
            )}
            {initialPost && !isAdmin && (
              <p className="text-[11px] text-slate-500">현재 비밀등급: {initialPost.secretGrade}급 · 작성 후 등급 변경은 관리자만 가능합니다.</p>
            )}

            {/* 민감함 태그 체크박스 */}
              <label className="flex items-center gap-2 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={isSensitive}
                  onChange={(e) => setIsSensitive(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded bg-slate-950 border-slate-700 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-[11px]">
                    🚨 [민감함] 태그 {initialPost ? '부착/해제' : '부여'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (보안 4단계 발령 시 열람 차단 대상)
                  </span>
                </span>
              </label>
            </div>

            {/* 투표 기능 생성 토글 (새 글 작성 시 관리자 전용) */}
            {isAdmin && !initialPost && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vote size={15} className="text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">투표 추가 (관리자 전용)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnablePoll(!enablePoll)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                      enablePoll
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {enablePoll ? '투표 활성화됨 ✓' : '+ 투표 추가하기'}
                  </button>
                </div>

                {/* 투표 설정 폼 */}
                {enablePoll && (
                  <div className="mt-3 p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        투표 질문 / 주제 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="예: 이번 유출 루머의 신빙성을 어떻게 보시나요?"
                        className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        투표 선택 항목 (최소 2개 ~ 최대 6개)
                      </label>
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-mono w-4">{idx + 1}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...pollOptions];
                              next[idx] = e.target.value;
                              setPollOptions(next);
                            }}
                            placeholder={`항목 ${idx + 1} 입력`}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = pollOptions.filter((_, i) => i !== idx);
                                setPollOptions(next);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                              title="항목 제거"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}

                      {pollOptions.length < 6 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="mt-1 flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>선택지 항목 추가</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              게시물 제목 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시물의 핵심 내용을 명확하게 작성해 주세요"
              className="w-full px-4 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* 에디터 툴바 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                본문 서식 및 내용 <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    !previewMode ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  편집기
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    previewMode ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Check size={13} />
                  미리보기
                </button>
              </div>
            </div>

            {/* 툴바 버튼군 (모바일 가로 스크롤 대응) */}
            {!previewMode && (
              <div className="flex items-center gap-1 p-2 bg-slate-950/90 border border-slate-800 rounded-t-xl border-b-0 text-slate-300 overflow-x-auto scrollbar-none shrink-0">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', '굵은 텍스트')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="굵게 (Ctrl+B)"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', '기울임 텍스트')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="기울임 (Italic)"
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<u>', '</u>', '밑줄 텍스트')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="밑줄 (Underline)"
                >
                  <Underline size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('~~', '~~', '취소선 텍스트')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="취소선 (Strikethrough)"
                >
                  <Strikethrough size={16} />
                </button>

                <div className="w-[1px] h-5 bg-slate-800 mx-1" />

                {/* 스포일러 처리 버튼 */}
                <button
                  type="button"
                  onClick={() => insertFormatting('[스포일러]', '[/스포일러]', '가려둘 스포일러 내용')}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60 rounded text-xs font-semibold shadow-xs transition-colors"
                  title="스포일러 처리 (클릭 시 가려진 블록 생성)"
                >
                  <Eye size={14} className="text-amber-400" />
                  <span>스포일러</span>
                </button>

                <div className="w-[1px] h-5 bg-slate-800 mx-1" />

                {/* 실제 파일 업로드 버튼 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-600/60 rounded text-xs font-medium"
                  title="이미지 파일 직접 업로드"
                >
                  <Upload size={14} />
                  <span>사진 업로드</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleCustomImageUrl}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="이미지 URL 삽입"
                >
                  <ImageIcon size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="링크 삽입"
                >
                  <LinkIcon size={16} />
                </button>

                <div className="w-[1px] h-5 bg-slate-800 mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting('\n- ', '', '목록 항목')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="글머리 기호 목록"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('\n> ', '', '인용구 내용')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="인용문"
                >
                  <Quote size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('\n```\n', '\n```\n', '// 여기에 코드를 입력하세요')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="코드 블록"
                >
                  <Code size={16} />
                </button>
              </div>
            )}

            {/* 에디터 텍스트 영역 또는 미리보기 */}
            {previewMode ? (
              <div className="w-full min-h-[260px] max-h-[420px] overflow-y-auto p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                {content.trim() ? (
                  <RichContentRenderer content={content} />
                ) : (
                  <div className="text-slate-500 text-sm italic">작성된 본문 내용이 없습니다.</div>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="본문 내용을 입력해 주세요. 상단 툴바를 눌러 굵게, 밑줄, 스포일러, 이미지 업로드, 코드 블록을 쉽게 삽입할 수 있습니다."
                className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700 rounded-b-lg text-slate-100 placeholder-slate-500 font-mono focus:outline-hidden focus:border-indigo-500"
              />
            )}
          </div>

          {/* 이미지 미리보기 바 */}
          {uploadedImagePreview && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={uploadedImagePreview}
                  alt="업로드 미리보기"
                  className="w-14 h-14 object-cover rounded-md border border-slate-700"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">첨부 이미지 미리보기 확인 완료</div>
                  <div className="text-[11px] text-slate-400">본문에 이미지 태그가 삽입되었습니다.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadedImagePreview(null)}
                className="text-xs text-slate-400 hover:text-rose-400"
              >
                미리보기 닫기
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              💡 스포일러 처리된 내용은 기본적으로 블러 처리되며 독자가 클릭 시 열람됩니다.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                {initialPost ? '게시물 수정 완료' : '게시물 등록하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
