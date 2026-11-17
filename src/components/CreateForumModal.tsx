import React, { useState } from 'react';
import { ForumCategory } from '../types';
import { db } from '../services/db';
import {
  MessageSquare,
  X,
  Shield,
  HelpCircle,
  Share2,
  Terminal,
  Coffee,
  Scale,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface CreateForumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newForumId: string) => void;
  ownerId: string;
}

const CATEGORIES: ForumCategory[] = [
  '자유 포럼',
  '정보 포럼',
  '토론 포럼',
  '질문 포럼',
  '공유 포럼',
  '공지 포럼',
];

const ICONS = [
  { name: 'MessageSquare', label: '메시지', icon: MessageSquare },
  { name: 'Coffee', label: '라운지', icon: Coffee },
  { name: 'Terminal', label: '개발', icon: Terminal },
  { name: 'Shield', label: '보안/유출', icon: Shield },
  { name: 'Scale', label: '토론', icon: Scale },
  { name: 'HelpCircle', label: 'Q&A', icon: HelpCircle },
  { name: 'Share2', label: '공유', icon: Share2 },
  { name: 'Sparkles', label: '특수', icon: Sparkles },
];

export const CreateForumModal: React.FC<CreateForumModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ownerId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ForumCategory>('자유 포럼');
  const [icon, setIcon] = useState('MessageSquare');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [rules, setRules] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('포럼 이름을 입력해 주세요.');
      return;
    }

    if (!description.trim()) {
      setError('포럼 설명을 입력해 주세요.');
      return;
    }

    const newForum = db.createForum({
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      bannerUrl: bannerUrl.trim() || undefined,
      isPublic,
      rules: rules.trim() || '상호 존중 및 실명/이메일 배제 정책 준수',
      ownerId,
    });

    onSuccess(newForum.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 my-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-indigo-400" size={22} />
          <h3 className="text-lg font-bold">새 커뮤니티 포럼 개설</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          회원 누구나 새로운 관심사 포럼을 자유롭게 개설할 수 있습니다. 개설자는 해당 포럼의 소유자가 되어 게시물을 관리할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              포럼 이름 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 클라우드 인프라 연구실, 인디 게임 제작소"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                카테고리 <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ForumCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">공개 범위</label>
              <select
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="public">전체 공개</option>
                <option value="private">회원 전용 비공개</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">아이콘 선택</label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ItemIcon size={14} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              포럼 소개 및 설명 <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="포럼의 주제와 소통 방향을 간략히 소개해 주세요."
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">포럼 운영 규칙 (선택)</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={2}
              placeholder="예: 비방 금지, 코드 스니펫 첨부 권장, 유출 태그 준수 등"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-950/50 border border-rose-800 rounded-lg text-xs text-rose-300">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors"
            >
              포럼 생성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
