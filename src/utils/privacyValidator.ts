// 욕설 및 부적절한 단어 블랙리스트 (단어 변형 및 비속어 필터링)
const PROFANITY_LIST = [
  '시발', '씨발', '개새끼', '병신', '지랄', '존나', '좆', '창녀', '느금',
  '바보새끼', '엠창', '새끼', '꺼져', '죽어', 'admin', 'administrator', '관리자',
  '운영자', 'root', 'master', 'system', '인민정보국공식', '인민정보국관리자', '정치국공식',
];

// 이메일 패턴 검사 정규식
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const EMAIL_HINT_REGEX = /(@|\.com|\.net|\.kr|\.org|\.io|\.co)/i;

// 전형적인 한국 실명 패턴 감지 (예: 김철수, 이영희 등 2~4글자 전형적 성씨 조합 권고)
const KOREAN_SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];

export interface NicknameValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isRealNameSuspected?: boolean;
}

/**
 * 닉네임 정책 검증:
 * - 2자 이상 16자 이하
 * - 실명 사용 금지 안내 및 검사
 * - 이메일 주소 사용 금지
 * - 욕설 및 부적절한 단어 / 시스템 예약어 금지
 */
export function validateNickname(nickname: string): NicknameValidationResult {
  const trimmed = nickname.trim();

  if (!trimmed) {
    return { isValid: false, errorMessage: '닉네임을 입력해 주세요.' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, errorMessage: '닉네임은 최소 2자 이상이어야 합니다.' };
  }

  if (trimmed.length > 16) {
    return { isValid: false, errorMessage: '닉네임은 최대 16자까지 가능합니다.' };
  }

  // 이메일 주소 사용 금지
  if (EMAIL_REGEX.test(trimmed) || EMAIL_HINT_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: '개인정보 보호를 위해 이메일 주소는 닉네임으로 사용할 수 없습니다.',
    };
  }

  // 욕설 및 비속어 / 시스템 예약어 필터링
  const lower = trimmed.toLowerCase();
  for (const word of PROFANITY_LIST) {
    if (lower.includes(word.toLowerCase())) {
      return {
        isValid: false,
        errorMessage: '부적절하거나 사용할 수 없는 단어가 포함되어 있습니다.',
      };
    }
  }

  // 전형적인 실명(한글 2~4글자 성씨 조합) 경고 확인
  let isRealNameSuspected = false;
  if (/^[가-힣]{2,4}$/.test(trimmed)) {
    const firstChar = trimmed.charAt(0);
    if (KOREAN_SURNAMES.includes(firstChar)) {
      isRealNameSuspected = true;
    }
  }

  return {
    isValid: true,
    isRealNameSuspected,
  };
}

/**
 * 생년월일 유효성 검사 (년 / 월 / 일)
 * - 윤년 계산 및 각 월별 실제 일수 초과 방지 (예: 2월 30일 방지)
 * - 미래 날짜 방지
 * - 비현실적인 나이(120세 초과) 방지
 */
export function validateBirthDate(
  year: number,
  month: number,
  day: number
): { isValid: boolean; errorMessage?: string } {
  const currentYear = new Date().getFullYear();

  if (!year || year < currentYear - 110 || year > currentYear - 5) {
    return {
      isValid: false,
      errorMessage: `유효한 출생 연도를 선택해 주세요. (1920 ~ ${currentYear - 5})`,
    };
  }

  if (!month || month < 1 || month > 12) {
    return { isValid: false, errorMessage: '유효한 월을 선택해 주세요.' };
  }

  // 각 월의 최대 일수 계산 (윤년 고려)
  const daysInMonth = new Date(year, month, 0).getDate();

  if (!day || day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      errorMessage: `${year}년 ${month}월은 1일부터 ${daysInMonth}일까지 선택 가능합니다.`,
    };
  }

  return { isValid: true };
}

/**
 * 비밀번호 유효성 검사
 */
export function validatePassword(password: string, passwordConfirm: string): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (!password) {
    return { isValid: false, errorMessage: '비밀번호를 입력해 주세요.' };
  }

  if (password.length < 6) {
    return { isValid: false, errorMessage: '비밀번호는 최소 6자 이상이어야 합니다.' };
  }

  if (password !== passwordConfirm) {
    return { isValid: false, errorMessage: '비밀번호와 비밀번호 확인이 일치하지 않습니다.' };
  }

  return { isValid: true };
}

export const PRIVACY_NOTICE_BANNER = {
  title: '개인정보 보호 안내',
  content:
    '이 사이트에서는 실명이나 이메일 주소를 닉네임으로 사용하지 않습니다. 반드시 별도의 가명 닉네임을 설정해 주세요. 생년월일은 회원 관리 및 서비스 운영 목적으로만 사용하며 다른 회원에게 공개되지 않습니다.',
  quote:
    '실명이나 이메일 주소를 닉네임으로 사용하지 마세요. 개인정보 보호를 위해 별도의 가명 닉네임을 사용해 주세요.',
};
