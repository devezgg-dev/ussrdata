import { EmblemLogo } from './EmblemLogo';
import React from 'react';
import { X, ShieldCheck, Lock, UserX, MailX, EyeOff, Server, FileCheck } from 'lucide-react';
import { PRIVACY_NOTICE_BANNER } from '../utils/privacyValidator';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <EmblemLogo size={32} className="w-8 h-8 rounded-lg border border-red-700/60" />
            <h3 className="text-lg font-bold text-white">인민정보국 개인정보 보호 정책 및 가명 운영 원칙</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* 하이라이트 공지 */}
          <div className="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl space-y-2">
            <div className="text-sm font-bold text-emerald-300">{PRIVACY_NOTICE_BANNER.title}</div>
            <p className="text-slate-200">{PRIVACY_NOTICE_BANNER.content}</p>
            <blockquote className="p-2.5 bg-slate-950/80 rounded border-l-2 border-emerald-400 font-semibold text-emerald-200">
              "{PRIVACY_NOTICE_BANNER.quote}"
            </blockquote>
          </div>

          {/* 5대 원칙 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <UserX size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-100 mb-0.5 text-sm">1. 실명 수집 및 입력 금지</h4>
                <p className="text-slate-400">
                  인민정보국는 가입, 프로필, 활동 등 어떠한 단계에서도 실명 입력을 요구하지 않습니다. 가명 닉네임만을 사용하여 완벽한 사생활과 발언의 자유를 보장합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <MailX size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-100 mb-0.5 text-sm">2. 불필요한 이메일 수집 원천 차단</h4>
                <p className="text-slate-400">
                  이메일 주소는 닉네임으로 등록할 수 없으며, 계정 생성 시에도 이메일 주소를 요구하지 않습니다. 데이터 유출 사고 발생 시에도 개인을 특정할 수 있는 이메일 정보가 존재하지 않습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <EyeOff size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-100 mb-0.5 text-sm">3. 생년월일 비공개 및 테이블 물리 격리</h4>
                <p className="text-slate-400">
                  생년월일은 연령 확인 및 서비스 보호 목적으로만 사용되며, 공개 프로필(profiles)과 물리적으로 분리된 별도의 계정 테이블(users)에 격리 보관됩니다. 다른 회원뿐만 아니라 관리자도 정당한 사유 기록 없이는 열람할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <Server size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-100 mb-0.5 text-sm">4. 데이터베이스 권한 최소화 (Supabase RLS)</h4>
                <p className="text-slate-400">
                  모든 데이터베이스 테이블에는 PostgreSQL Row Level Security (RLS) 정책이 적용되어 사용자 계정 자격 증명에 대한 무단 쿼리를 원천 차단합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <FileCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-100 mb-0.5 text-sm">5. 관리 활동 전수 감사 로그 기록</h4>
                <p className="text-slate-400">
                  관리자의 신뢰도 변경, 게시물 삭제/복구, 타임아웃, 칭호 부여 등의 모든 주요 조치는 실시간으로 감사 로그(admin_logs)에 기록되어 운영의 투명성을 유지합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/70 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
