import React from 'react';
import { TIER_CONFIG } from '../utils/tierCalculator';
import { TierBadge } from './TierBadge';
import { X, Award, Sparkles } from 'lucide-react';

interface TierGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function describeRequirement(label: string): string {
  // TIER_CONFIG의 description 필드에 조건이 이미 서술되어 있으므로 그대로 사용합니다.
  return TIER_CONFIG[label]?.description || '';
}

export const TierGuideModal: React.FC<TierGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // 등급은 관리자 대시보드에서 자유롭게 추가/수정/삭제되므로 매번 TIER_CONFIG에서 정렬해 가져옵니다.
  const orderedTiers = Object.values(TIER_CONFIG).sort((a, b) => a.level - b.level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 border border-red-800 flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                요원 서열 (등급) 체계 안내
              </h3>
              <p className="text-[11px] text-slate-400">
                인민정보국에서는 요원의 서열이 곧 공식 칭호입니다. 서열은 관리자가 직접 신설·변경·박탈할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-red-300">
              <Sparkles size={14} />
              <span>서열 = 공식 칭호 연동 안내</span>
            </div>
            게시물 작성, 소통 댓글, 게시물 탐색 실적을 데이터베이스에서 실시간 정밀 계산하여 서열이 자동 승급됩니다.
            정치국(관리자)은 언제든 요원의 서열을 직접 임명하거나 박탈할 수 있으며, 이 경우 자동 재산정은 멈춥니다.
          </div>

          <div className="space-y-2">
            {orderedTiers.map((meta) => (
              <div
                key={meta.label}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-xs font-mono text-slate-500 w-10 shrink-0">
                    {meta.level >= 99 ? 'ADMIN' : `Lv.${meta.level}`}
                  </div>
                  <TierBadge tier={meta.label} size="md" showPrefix={true} />
                  <div className="text-xs text-slate-300 font-medium">{meta.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-right">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
