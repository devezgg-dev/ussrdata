import { EmblemLogo } from './EmblemLogo';
import { TurnstileWidget, verifyTurnstile } from './TurnstileWidget';
import { supabase } from '../lib/supabase';
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import {
  validateNickname,
  validateBirthDate,
  validatePassword,
  PRIVACY_NOTICE_BANNER,
} from '../utils/privacyValidator';
import {
  ShieldCheck,
  Lock,
  User,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // 모달이 열리거나 모드가 변경될 때 상태 초기화 및 동기화
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSignupSuccessNickname(null);
      setError('');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setRecoveryMode('password'); setMode('login'); setError('새 비밀번호를 설정해 주세요.'); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 로그인 상태
  const [loginNickname, setLoginNickname] = useState('');
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'password'>('none');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 상태 (실명/이메일 전혀 없음)
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState<number>(2000);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // 관리자 승인 대기 상태
  const [signupSuccessNickname, setSignupSuccessNickname] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [realNameWarning, setRealNameWarning] = useState(false);

  // 현재 연도 기준 연도 선택지 생성 (1920 ~ 현재년도 - 5)
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 10; y >= 1925; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // 선택된 년/월에 따른 유효한 일 수 계산 (윤년 고려)
  const daysInSelectedMonth = useMemo(() => {
    return new Date(birthYear, birthMonth, 0).getDate();
  }, [birthYear, birthMonth]);

  const days = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= daysInSelectedMonth; d++) {
      list.push(d);
    }
    return list;
  }, [daysInSelectedMonth]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 닉네임 입력 핸들러 (실시간 실명 의심 검사)
  const handleNicknameChange = (val: string) => {
    setNickname(val);
    setError('');
    const res = validateNickname(val);
    if (res.isRealNameSuspected) {
      setRealNameWarning(true);
    } else {
      setRealNameWarning(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginNickname.trim() || !loginPassword) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) { setError('보안 인증을 완료해 주세요.'); setTurnstileToken(''); setTurnstileNonce((n) => n + 1); return; }
    setTurnstileToken(''); setTurnstileNonce((n) => n + 1);
    setIsSubmitting(true);
    setError('');
    try {
      const res = await db.login(loginNickname.trim(), loginPassword);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || '로그인에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err?.message || '로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('인증에 사용할 올바른 이메일을 입력해 주세요.'); return; }
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) { setError('보안 인증을 완료해 주세요.'); setTurnstileToken(''); setTurnstileNonce((n) => n + 1); return; }
    setTurnstileToken(''); setTurnstileNonce((n) => n + 1);

    // 1. 닉네임 검증
    const nickRes = validateNickname(nickname);
    if (!nickRes.isValid) {
      setError(nickRes.errorMessage || '유효하지 않은 닉네임입니다.');
      return;
    }

    // 2. 생년월일 검증
    const dateRes = validateBirthDate(birthYear, birthMonth, birthDay);
    if (!dateRes.isValid) {
      setError(dateRes.errorMessage || '유효하지 않은 생년월일입니다.');
      return;
    }

    // 3. 비밀번호 검증
    const passRes = validatePassword(password, passwordConfirm);
    if (!passRes.isValid) {
      setError(passRes.errorMessage || '비밀번호를 확인해 주세요.');
      return;
    }

    // 4. 개인정보 동의
    if (!agreePrivacy) {
      setError('개인정보 보호 정책 및 가명 사용 안내에 동의해야 가입할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await db.signup(nickname, email, { year: birthYear, month: birthMonth, day: birthDay }, password);
      if (res.success) {
        setSignupSuccessNickname(nickname);
        setLoginNickname(email);
        setError('');
        onSuccess();
      } else {
        setError(res.message || '회원가입에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err?.message || '회원가입 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSignupSuccessNickname(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Brand Banner */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 bg-slate-950/90 border-b border-slate-800">
          <EmblemLogo size={40} className="w-10 h-10 rounded-xl border border-red-700/60 shadow-md" />
          <div>
            <div className="flex items-center gap-1.5 font-black text-base text-white">
              <span>인민정보국</span>
              <span className="text-emerald-400">database</span>
            </div>
            <div className="text-[11px] text-slate-400">중앙기록국 · 인증된 정보원 전용 시스템</div>
          </div>
        </div>

        {/* Header Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950/80 text-center font-bold text-sm">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setSignupSuccessNickname(null);
              setError('');
            }}
            className={`py-3 transition-colors border-b-2 cursor-pointer ${
              mode === 'login' && !signupSuccessNickname
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setSignupSuccessNickname(null);
              setError('');
            }}
            className={`py-3 transition-colors border-b-2 cursor-pointer ${
              mode === 'signup' && !signupSuccessNickname
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            정보원 등록
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {signupSuccessNickname ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Clock size={32} />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                  신원 조회 중
                </span>
                <h3 className="text-xl font-black text-white">입국 신청서 접수</h3>
                <p className="text-xs text-slate-300">
                  가명 <strong className="text-emerald-400">"{signupSuccessNickname}"</strong> 등록이 접수되었습니다. 먼저 이메일 인증 링크를 눌러야 하며, 이후 관리자의 승인을 기다려 주세요.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-left text-xs text-slate-400 space-y-2 leading-relaxed">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  가입 승인 절차 안내
                </p>
                <p>• 이메일 인증이 완료되면 운영진이 가입 신청을 검토합니다.</p>
                <p className="text-slate-300 font-medium">
                  • 승인 완료 전까지는 로그인이 제한됩니다. 인증 메일이 오지 않으면 스팸함도 확인해 주세요.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignupSuccessNickname(null);
                    setMode('login');
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  로그인 화면으로 이동
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          ) : recoveryMode === 'password' ? (
            <form onSubmit={async (e) => { e.preventDefault(); if (newPassword.length < 8 || newPassword !== newPasswordConfirm || !supabase) { setError('비밀번호는 8자 이상이며 두 입력이 같아야 합니다.'); return; } const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) setError(error.message); else { setRecoveryMode('none'); setError('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.'); setNewPassword(''); setNewPasswordConfirm(''); await supabase.auth.signOut(); } }} className="space-y-4">
              <h3 className="text-lg font-black text-[#f4e5ce]">비밀번호 재설정</h3>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호 (8자 이상)" className="w-full border border-[#70402d] bg-[#17110f] p-3 text-sm text-[#f4e5ce]" />
              <input type="password" autoComplete="new-password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="새 비밀번호 확인" className="w-full border border-[#70402d] bg-[#17110f] p-3 text-sm text-[#f4e5ce]" />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button type="submit" className="w-full bg-[#a5221d] p-3 text-sm font-black text-[#fff1db]">새 비밀번호 저장</button>
            </form>
          ) : mode === 'signup' ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {/* 필수 개인정보 보호 눈에 띄는 안내 배너 (요구사항) */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <ShieldCheck size={18} className="text-cyan-400 shrink-0" />
                  <span>{PRIVACY_NOTICE_BANNER.title}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {PRIVACY_NOTICE_BANNER.content}
                </p>
                <div className="p-2 bg-indigo-900/30 rounded border border-indigo-500/30 text-[11px] text-cyan-200 font-medium">
                  "{PRIVACY_NOTICE_BANNER.quote}"
                </div>
                <div className="p-2 bg-amber-950/50 border border-amber-500/40 rounded text-[11px] text-amber-300 flex items-center gap-1.5 font-semibold">
                  <Clock size={13} className="shrink-0 text-amber-400" />
                  <span>회원가입 정책: 가입 신청 후 관리자의 승인이 완료되어야 로그인이 가능합니다.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">인증 이메일 <span className="text-rose-400">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="인증 메일을 받을 이메일" className="w-full px-3 py-2.5 text-sm bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500" />
                <p className="mt-1 text-[10px] text-slate-400">이메일은 인증 및 계정 복구에만 사용하며 공개 프로필에는 표시하지 않습니다.</p>
              </div>

              {/* 1. 닉네임 입력 (가명 원칙) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  가명 닉네임 설정 <span className="text-rose-400">*</span>
                  <span className="text-[11px] text-slate-400 font-normal ml-2">
                    (실명 사용 불가, 2~16자)
                  </span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    placeholder="예: 밤하늘의별빛, 사이버탐정Q (가명)"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                {realNameWarning && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    실명으로 의심되는 형태입니다. 개인정보 보호를 위해 별도의 가명을 권장합니다.
                  </p>
                )}
              </div>

              {/* 2. 생년월일 선택 (년/월/일 선택 방식, 비공개 격리 보관) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    생년월일 선택 <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                    타인에게 절대 비공개 격리
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* 년 */}
                  <div className="relative">
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}년
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* 월 */}
                  <div>
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m}월
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* 일 (월별 일 수 자동 제한) */}
                  <div>
                    <select
                      value={Math.min(birthDay, daysInSelectedMonth)}
                      onChange={(e) => setBirthDay(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    >
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}일
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  생년월일은 연령 확인 및 서비스 운영 목적으로만 암호화 저장되며 프로필에 노출되지 않습니다.
                </p>
              </div>

              {/* 3. 비밀번호 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  비밀번호 <span className="text-rose-400">*</span>
                  <span className="text-[11px] text-slate-400 font-normal ml-2">(6자 이상)</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 4. 비밀번호 확인 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  비밀번호 확인 <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 한 번 입력하세요"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 동의 체크박스 */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                  />
                  <span>
                    이메일 인증 및 개인정보(생년월일) 비공개 보호 정책에 동의합니다.
                  </span>
                </label>
              </div>

              <div className="rounded border border-[#70402d] bg-[#17110f] p-3"><div className="mb-2 text-[10px] font-bold tracking-widest text-[#d6b48f]">SECURITY CHECK / 보안 검문</div><TurnstileWidget key={turnstileNonce} onToken={setTurnstileToken} /></div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-xs text-rose-300">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all text-sm mt-2"
              >
                정보원 등록 신청
              </button>
            </form>
          ) : (
            /* 로그인 폼 */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="p-3 bg-[#211713] border border-[#70402d] rounded text-xs text-[#d7b99e]">
                등록한 이메일과 비밀번호로 접속합니다. 이메일은 다른 회원에게 공개되지 않습니다.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">이메일 주소</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={loginNickname}
                    onChange={(e) => {
                      setLoginNickname(e.target.value);
                      setError('');
                    }}
                    placeholder="name@example.com" autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">비밀번호</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="rounded border border-[#70402d] bg-[#17110f] p-3"><div className="mb-2 text-[10px] font-bold tracking-widest text-[#d6b48f]">SECURITY CHECK / 보안 검문</div><TurnstileWidget key={turnstileNonce} onToken={setTurnstileToken} /></div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-xs text-rose-300">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                <button type="button" onClick={async () => { if (!loginNickname.trim() || !supabase) { setError('비밀번호 재설정 이메일을 입력해 주세요.'); return; } const { error } = await supabase.auth.resetPasswordForEmail(loginNickname.trim(), { redirectTo: `${window.location.origin}/` }); setError(error ? error.message : '비밀번호 재설정 링크를 이메일로 보냈습니다.'); }} className="text-[#e6b98f] underline">비밀번호 재설정</button>
                <button type="button" onClick={async () => { if (!loginNickname.trim() || !supabase) { setError('가입할 때 사용한 이메일을 입력해 주세요.'); return; } const { data, error } = await supabase.functions.invoke('recover-username', { body: { email: loginNickname.trim() } }); setError(error ? '계정 안내 메일을 보내지 못했습니다. 관리자 설정을 확인해 주세요.' : (data?.message || '등록된 주소라면 계정 안내 메일을 보냈습니다.')); }} className="text-[#e6b98f] underline">아이디 찾기</button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all text-sm mt-3 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>로그인 확인 중...</span>
                  </>
                ) : (
                  <span>접속 승인 요청</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
