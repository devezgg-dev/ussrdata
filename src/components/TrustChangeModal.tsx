import React, { useState } from 'react';
import { Post, TrustLevel } from '../types';
import { db } from '../services/db';
import { ShieldCheck, ShieldAlert, ShieldX, X, AlertTriangle } from 'lucide-react';

interface TrustChangeModalProps {
  post: Post;
  adminId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TrustChangeModal: React.FC<TrustChangeModalProps> = ({
  post,
  adminId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<TrustLevel>(post.trustLevel);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('신뢰도 변경 사유를 입력해 주세요. 감사 기록에 영구 보존됩니다.');
      return;
    }

    const success = db.updateTrustLevel(post.id, adminId, selectedLevel, note.trim());
    if (success) {
      onSuccess();
      onClose();
    } else {
      setError('신뢰도 변경 권한이 없거나 처리에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="text-amber-400" size={22} />
          <h3 className="text-lg font-bold">게시물 신뢰도 평가 변경 (관리자)</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4 truncate">
          대상 게시물: <span className="text-slate-200 font-semibold">{post.title}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">신뢰도 등급 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {(['높음', '중간', '낮음'] as TrustLevel[]).map((level) => {
                const isSelected = selectedLevel === level;
                const meta = {
                  높음: { icon: ShieldCheck, color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/40' },
                  중간: { icon: ShieldAlert, color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/40' },
                  낮음: { icon: ShieldX, color: 'text-rose-400', border: 'border-rose-500', bg: 'bg-rose-950/40' },
                }[level];
                const Icon = meta.icon;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      isSelected
                        ? `${meta.border} ${meta.bg} ${meta.color} font-bold shadow-md`
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon size={20} className="mb-1" />
                    <span className="text-sm">{level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              변경 사유 및 팩트체크 근거 <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError('');
              }}
              rows={3}
              placeholder="예: 공식 로드맵 발표와 일치 확인됨 / 루머 출처 미확인으로 하향 조정"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px] text-amber-300">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              신뢰도 변경 내역과 변경한 관리자 정보는 감사를 위해 <code>post_trust_history</code> 및 <code>admin_logs</code>에 영구 기록됩니다.
            </span>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors"
            >
              평가 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
