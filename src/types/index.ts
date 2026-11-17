// 등급명은 관리자가 자유롭게 추가/수정/삭제할 수 있으므로 고정 유니온이 아닌 문자열(등급 label)입니다.
export type MemberTier = string;

export interface CustomTier {
  id: string;
  label: string; // 표시 등급명 (예: '공작원'). 고유해야 합니다.
  level: number; // 숫자가 높을수록 상위 서열
  description: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  glowColor: string;
  iconName: string;
  // 자동 승급 조건 (하나라도 지정되면 모두 충족 시 자동 승급). 없으면 관리자 직접 지급 전용 등급.
  autoRequirement?: { posts?: number; comments?: number; visits?: number };
  isAdminOnly?: boolean; // 관리자 계정에 자동으로 부여되는 최고위 등급
  isDefault?: boolean; // 신규 가입 회원에게 기본 지급되는 등급
}

export type TrustLevel = '높음' | '중간' | '낮음';

export type PostTag = '유출 가능' | '유출 불가능';

export type ForumCategory =
  | '공지 포럼'
  | '자유 포럼'
  | '정보 포럼'
  | '토론 포럼'
  | '질문 포럼'
  | '공유 포럼';

export type UserStatus = 'pending' | 'active' | 'timeout' | 'banned' | 'rejected';

export interface UserAccount {
  id: string;
  // 민감 정보 (공개 프로필과 격리 저장)
  passwordHash: string;
  birthDate: {
    year: number;
    month: number;
    day: number;
  };
  isAdmin: boolean;
  status: UserStatus;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  timeoutUntil?: string; // ISO date string
  timeoutReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string; // matches UserAccount.id
  nickname: string;
  avatarUrl: string;
  bio: string;
  primaryTitleId?: string;
  createdAt: string;
  updatedAt: string;

  // 계산된 활동 정보 (실제 DB 레코드 기반 산출)
  postCount: number;
  commentCount: number;
  visitedPostCount: number;
  tier: MemberTier;
  // 관리자가 등급을 직접 지급한 경우 true. true인 동안에는 활동량에 따른 자동 재산정이 적용되지 않습니다.
  tierManuallySet?: boolean;
  isAdmin: boolean;
  isTimedOut: boolean;
  status?: UserStatus;
  securityClearance?: SecurityClearance;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  color: string; // hex or tailwind color
  bgGradient: string;
  icon: string; // lucide icon identifier
  isAdminOnly: boolean;
  createdAt: string;
}

export interface UserTitle {
  id: string;
  userId: string;
  titleId: string;
  grantedBy: string; // admin user id
  grantedAt: string;
}

export interface Forum {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ForumCategory;
  icon: string;
  bannerUrl: string;
  isPublic: boolean;
  rules: string;
  ownerId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  postCount?: number;
  subscriberCount?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs who voted
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isClosed?: boolean;
  createdAt: string;
}

export type SecurityLevel = 1 | 2 | 3 | 4 | 5;
export type SecretGrade = 1 | 2 | 3 | 4 | 5;
export type SecurityClearance = 1 | 2 | 3;

export interface SecurityConfig {
  level: SecurityLevel;
  updatedAt: string;
  updatedBy: string;
}

export interface Post {
  id: string;
  forumId: string;
  forumName?: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  authorTier: MemberTier;
  authorPrimaryTitle?: Title;
  title: string;
  content: string; // contains markdown / formatting / spoilers
  tag: PostTag; // 필수 선택: '유출 가능' | '유출 불가능'
  isSensitive?: boolean; // 관리자 지정 민감함 태그
  secretGrade?: SecretGrade;
  secretGradeSetByAuthor?: boolean;
  poll?: Poll; // 관리자 지정 투표 기능
  trustLevel: TrustLevel;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string; // 대댓글 지원 (부모 댓글 ID)
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  authorTier: MemberTier;
  authorPrimaryTitle?: Title;
  authorJoinedAt?: string; // 가입 날짜 (사진 레이아웃 반영)
  content: string;
  imageUrl?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface PostView {
  id: string;
  postId: string;
  userId?: string;
  sessionId: string;
  viewedAt: string;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface ForumSubscription {
  id: string;
  forumId: string;
  userId: string;
  createdAt: string;
}

export interface Warning {
  id: string;
  userId: string;
  adminId: string;
  adminNickname: string;
  reason: string;
  createdAt: string;
}

export interface TimeoutRecord {
  id: string;
  userId: string;
  adminId: string;
  adminNickname: string;
  reason: string;
  durationMinutes: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface PostTrustHistory {
  id: string;
  postId: string;
  adminId: string;
  adminNickname: string;
  previousLevel: TrustLevel;
  newLevel: TrustLevel;
  note: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminNickname: string;
  actionType:
    | 'POST_DELETE'
    | 'POST_RESTORE'
    | 'POST_PERMANENT_DELETE'
    | 'POST_PIN_TOGGLE'
    | 'TRUST_CHANGE'
    | 'USER_TIMEOUT'
    | 'USER_UNTIMEOUT'
    | 'USER_WARNING'
    | 'USER_ADMIN_TOGGLE'
    | 'USER_APPROVE'
    | 'USER_REJECT'
    | 'TITLE_CREATE'
    | 'TITLE_GRANT'
    | 'TITLE_REVOKE'
    | 'FORUM_MANAGE'
    | 'SECURITY_LEVEL_CHANGE'
    | 'POST_POLL_CREATE'
    | 'POST_SENSITIVE_TOGGLE';
  targetType: 'post' | 'user' | 'title' | 'forum' | 'comment';
  targetId: string;
  targetName?: string;
  details: string;
  createdAt: string;
}

export type PostSortOption =
  | 'latest'
  | 'trust_high'
  | 'trust_mid'
  | 'trust_low'
  | 'comments'
  | 'views'
  | 'likes';
