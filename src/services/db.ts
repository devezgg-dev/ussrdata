import {
  AdminLog,
  Comment,
  CustomTier,
  Forum,
  MemberTier,
  Poll,
  Post,
  PostLike,
  PostSortOption,
  PostTag,
  PostTrustHistory,
  PostView,
  SecurityConfig,
  SecurityLevel,
  TimeoutRecord,
  Title,
  TrustLevel,
  UserAccount,
  UserProfile,
  UserTitle,
  Warning,
} from '../types';
import { calculateUserTier, applyTierConfig, DEFAULT_TIERS } from '../utils/tierCalculator';
import { isSupabaseConfigured, supabase, authRedirectUrl } from '../lib/supabase';

// Administrative security mode changes are authorized by Supabase RLS/RPC, never by a client-side secret.

const STORAGE_KEY = 'loki_database_v1';
const CURRENT_USER_KEY = 'loki_current_user_id';

interface DbState {
  users: UserAccount[];
  profiles: UserProfile[];
  forums: Forum[];
  posts: Post[];
  comments: Comment[];
  views: PostView[];
  likes: PostLike[];
  titles: Title[];
  userTitles: UserTitle[];
  warnings: Warning[];
  timeouts: TimeoutRecord[];
  trustHistories: PostTrustHistory[];
  adminLogs: AdminLog[];
  subscriptions: { userId: string; forumId: string; createdAt: string }[];
  securityConfig: SecurityConfig;
  customTiers: CustomTier[];
}

// 초기 시드 데이터 구축
function generateInitialData(): DbState {
  const now = new Date().toISOString();
  const pastDay = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const titles: Title[] = [
    {
      id: 'title-founder',
      name: '최고위원',
      description: '인민정보국를 개설하고 수호하는 총괄 관리자',
      color: '#10b981',
      bgGradient: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/50',
      icon: 'Crown',
      isAdminOnly: true,
      createdAt: pastDay(60),
    },
    {
      id: 'title-detective',
      name: '진실의 탐정',
      description: '루머와 유출 정보의 진위를 파헤치는 팩트체커',
      color: '#06b6d4',
      bgGradient: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/50',
      icon: 'Search',
      isAdminOnly: false,
      createdAt: pastDay(40),
    },
    {
      id: 'title-curator',
      name: '정보 수집가',
      description: '양질의 개발 및 기술 트렌드를 큐레이션하는 회원',
      color: '#8b5cf6',
      bgGradient: 'from-purple-500/20 to-indigo-500/20 border-purple-500/50',
      icon: 'BookOpen',
      isAdminOnly: false,
      createdAt: pastDay(35),
    },
    {
      id: 'title-spoiler-guard',
      name: '스포일러 방패',
      description: '민감한 정보의 스포일러 처리를 철저히 지키는 모범 회원',
      color: '#10b981',
      bgGradient: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/50',
      icon: 'ShieldCheck',
      isAdminOnly: false,
      createdAt: pastDay(30),
    },
    {
      id: 'title-night-debater',
      name: '밤샘 토론가',
      description: '새벽까지 깊이 있는 주제로 의견을 교환하는 열정가',
      color: '#ec4899',
      bgGradient: 'from-pink-500/20 to-rose-500/20 border-pink-500/50',
      icon: 'Moon',
      isAdminOnly: false,
      createdAt: pastDay(20),
    },
  ];

  // 사용자 계정 (실명/이메일 전혀 없음, 생년월일은 보안 분리 저장)
  const users: UserAccount[] = [
    {
      id: 'user-admin',
      passwordHash: 'admin123',
      birthDate: { year: 1992, month: 8, day: 15 },
      isAdmin: true,
      status: 'active',
      createdAt: pastDay(90),
      updatedAt: pastDay(90),
    },
    {
      id: 'user-silver',
      passwordHash: 'user123',
      birthDate: { year: 1998, month: 3, day: 24 },
      isAdmin: false,
      status: 'active',
      createdAt: pastDay(50),
      updatedAt: pastDay(50),
    },
    {
      id: 'user-gold',
      passwordHash: 'user123',
      birthDate: { year: 1995, month: 11, day: 9 },
      isAdmin: false,
      status: 'active',
      createdAt: pastDay(70),
      updatedAt: pastDay(70),
    },
    {
      id: 'user-newbie',
      passwordHash: 'user123',
      birthDate: { year: 2001, month: 5, day: 19 },
      isAdmin: false,
      status: 'active',
      createdAt: pastDay(2),
      updatedAt: pastDay(2),
    },
    {
      id: 'user-pending-1',
      passwordHash: 'user123',
      birthDate: { year: 2002, month: 7, day: 12 },
      isAdmin: false,
      status: 'pending',
      createdAt: pastDay(1),
      updatedAt: pastDay(1),
    },
  ];

  const profiles: UserProfile[] = [
    {
      id: 'user-admin',
      nickname: '관리자-정보국',
      avatarUrl: '/assets/aistudio/9066ba82ee5f80352302e2724d7988b4_1__734b64fb.jpg',
      bio: '인민정보국의 자유와 익명성, 개인정보를 보호하는 총괄 운영진입니다.',
      primaryTitleId: 'title-founder',
      createdAt: pastDay(90),
      updatedAt: pastDay(90),
      postCount: 15,
      commentCount: 52,
      visitedPostCount: 110,
      tier: '최고위원',
      isAdmin: true,
      isTimedOut: false,
      status: 'active',
    },
    {
      id: 'user-silver',
      nickname: '사이버탐정Q',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: '미검증 루머의 팩트를 검증하고 진실을 추적합니다. 유출 자료 환영!',
      primaryTitleId: 'title-detective',
      createdAt: pastDay(50),
      updatedAt: pastDay(50),
      postCount: 24,
      commentCount: 48,
      visitedPostCount: 88,
      tier: '공작원',
      isAdmin: false,
      isTimedOut: false,
      status: 'active',
    },
    {
      id: 'user-gold',
      nickname: '밤하늘의별빛',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: '신기술 아키텍처와 분산 시스템을 연구하는 익명의 엔지니어.',
      primaryTitleId: 'title-curator',
      createdAt: pastDay(70),
      updatedAt: pastDay(70),
      postCount: 42,
      commentCount: 75,
      visitedPostCount: 140,
      tier: '동지',
      isAdmin: false,
      isTimedOut: false,
      status: 'active',
    },
    {
      id: 'user-newbie',
      nickname: '호기심토끼',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: '인민정보국에 갓 합류했습니다. 실명 없이 안전하게 소통할 수 있어 좋습니다.',
      createdAt: pastDay(2),
      updatedAt: pastDay(2),
      postCount: 2,
      commentCount: 5,
      visitedPostCount: 6,
      tier: '신입생',
      isAdmin: false,
      isTimedOut: false,
      status: 'active',
    },
    {
      id: 'user-pending-1',
      nickname: '은밀한탐색자',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: '관리자의 가입 승인을 대기 중인 신규 신청 회원입니다.',
      createdAt: pastDay(1),
      updatedAt: pastDay(1),
      postCount: 0,
      commentCount: 0,
      visitedPostCount: 0,
      tier: '신입생',
      isAdmin: false,
      isTimedOut: false,
      status: 'pending',
    },
  ];

  const userTitles: UserTitle[] = [
    { id: 'ut-1', userId: 'user-admin', titleId: 'title-founder', grantedBy: 'user-admin', grantedAt: pastDay(90) },
    { id: 'ut-2', userId: 'user-silver', titleId: 'title-detective', grantedBy: 'user-admin', grantedAt: pastDay(40) },
    { id: 'ut-3', userId: 'user-silver', titleId: 'title-spoiler-guard', grantedBy: 'user-admin', grantedAt: pastDay(25) },
    { id: 'ut-4', userId: 'user-gold', titleId: 'title-curator', grantedBy: 'user-admin', grantedAt: pastDay(35) },
    { id: 'ut-5', userId: 'user-gold', titleId: 'title-night-debater', grantedBy: 'user-admin', grantedAt: pastDay(20) },
  ];

  const forums: Forum[] = [
    {
      id: 'forum-notice',
      name: '공지 및 보안 수칙',
      slug: 'notices',
      description: '인민정보국 운영 정책, 개인정보 보호 원칙 및 중요 공지사항',
      category: '공지 포럼',
      icon: 'Megaphone',
      bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '운영진 공지만 게시되며 비방 및 허위 정보 신고는 관리 로그를 통해 검토됩니다.',
      ownerId: 'user-admin',
      isDeleted: false,
      createdAt: pastDay(90),
      updatedAt: pastDay(90),
      postCount: 2,
      subscriberCount: 240,
    },
    {
      id: 'forum-leak-room',
      name: '미공개 정보 & 유출 검증소',
      slug: 'leaks-and-rumors',
      description: '업계 미공개 자료, 제품 루머 검증 및 심층 팩트체크',
      category: '공유 포럼',
      icon: 'ShieldAlert',
      bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '유출 태그(유출 가능/불가능)를 정확히 지정하고, 민감한 내용은 반드시 [스포일러] 태그로 가려주세요.',
      ownerId: 'user-silver',
      isDeleted: false,
      createdAt: pastDay(60),
      updatedAt: pastDay(60),
      postCount: 5,
      subscriberCount: 185,
    },
    {
      id: 'forum-tech',
      name: 'IT & 개발 연구실',
      slug: 'tech-dev',
      description: '최신 웹 아키텍처, 분산 DB, 프라이버시 암호학 및 코드 리뷰',
      category: '정보 포럼',
      icon: 'Terminal',
      bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '코드 블록을 적절히 활용하고 상호 존중하는 피드백 문화를 지향합니다.',
      ownerId: 'user-gold',
      isDeleted: false,
      createdAt: pastDay(70),
      updatedAt: pastDay(70),
      postCount: 4,
      subscriberCount: 150,
    },
    {
      id: 'forum-free',
      name: '자유 광장 & 라운지',
      slug: 'free-lounge',
      description: '소소한 일상, 밤샘 수다, 잡담과 취미를 익명으로 나누는 공간',
      category: '자유 포럼',
      icon: 'Coffee',
      bannerUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '실명이나 개인 식별 정보(이메일, 연락처) 언급 절대 금지.',
      ownerId: 'user-admin',
      isDeleted: false,
      createdAt: pastDay(80),
      updatedAt: pastDay(80),
      postCount: 3,
      subscriberCount: 120,
    },
    {
      id: 'forum-debate',
      name: '심층 토론장',
      slug: 'deep-debate',
      description: '인공지능 윤리, 데이터 주권, 기술 사회학에 관한 진지한 논쟁',
      category: '토론 포럼',
      icon: 'Scale',
      bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '인신공격 금지, 논리적 근거 중심의 토론.',
      ownerId: 'user-gold',
      isDeleted: false,
      createdAt: pastDay(45),
      updatedAt: pastDay(45),
      postCount: 2,
      subscriberCount: 95,
    },
    {
      id: 'forum-qna',
      name: '익명 Q&A 질문방',
      slug: 'anonymous-qna',
      description: '사내/커리어/기술 고민을 익명으로 질문하고 답변을 구하는 곳',
      category: '질문 포럼',
      icon: 'HelpCircle',
      bannerUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
      isPublic: true,
      rules: '채택 및 감사의 마음을 댓글로 표현해 주세요.',
      ownerId: 'user-admin',
      isDeleted: false,
      createdAt: pastDay(40),
      updatedAt: pastDay(40),
      postCount: 2,
      subscriberCount: 110,
    },
  ];

  const posts: Post[] = [
    {
      id: 'post-1',
      forumId: 'forum-notice',
      forumName: '공지 및 보안 수칙',
      authorId: 'user-admin',
      authorNickname: '관리자-정보국',
      authorAvatar: profiles[0].avatarUrl,
      authorTier: '최고위원',
      authorPrimaryTitle: titles[0],
      title: '🚨 [필독] 인민정보국의 개인정보 보호 및 실명·이메일 배제 정책 안내',
      content: `인민정보국에 오신 것을 환영합니다.\n\n본 플랫폼은 회원의 완벽한 사생활과 발언의 자유를 지키기 위해 설계되었습니다.\n\n### 🛡️ 주요 개인정보 보호 규칙\n1. **실명 및 이메일 수집 절대 금지**: 본 사이트는 가입 및 프로필 어디에서도 이메일과 실명을 일체 요구하지 않습니다.\n2. **가명 닉네임 의무화**: 닉네임에 실명이나 이메일 형식 사용이 엄격히 차단됩니다.\n3. **생년월일 암호화 격리 저장**: 생년월일은 오직 서비스 연령 관리 목적으로만 저장되며, 프로필이나 게시물 어디에도 표시되지 않으며 타 회원에게 비공개됩니다.\n4. **신뢰도 평가 시스템**: 유출 정보 및 기사의 진위 판별을 돕기 위해 운영진이 검토 후 신뢰도 배지(높음/중간/낮음)를 부여합니다.\n\n> "진정한 자유는 개인정보의 철저한 보호 위에서 시작됩니다."`,
      tag: '유출 불가능',
      trustLevel: '높음',
      isPinned: true,
      isDeleted: false,
      viewCount: 1420,
      likeCount: 88,
      commentCount: 14,
      createdAt: pastDay(30),
      updatedAt: pastDay(30),
    },
    {
      id: 'post-2',
      forumId: 'forum-leak-room',
      forumName: '미공개 정보 & 유출 검증소',
      authorId: 'user-silver',
      authorNickname: '사이버탐정Q',
      authorAvatar: profiles[1].avatarUrl,
      authorTier: '공작원',
      authorPrimaryTitle: titles[1],
      title: '⚡ 차세대 플래그십 GPU 아키텍처 스펙 내부 유출본 분석 (스포일러 주의)',
      content: `해외 하드웨어 연구소 내부 엔지니어를 통해 입수된 차세대 GPU 다이 다이어그램 분석 자료입니다.\n\n태그: **유출 가능**\n\n핵심 벤치마크 결과는 민감하여 스포일러 처리합니다. 클릭하여 확인하세요:\n\n[스포일러]기존 세대 대비 전력 효율은 38% 개선되었으며, 전용 AI 텐서 코어가 2배 증설되어 FP8 연산 속도가 180TFLOPS에 달합니다. 2027년 Q1 양산 예정.[/스포일러]\n\n### 다이 아키텍처 사양\n- 공정: 차세대 2nm 첨단 파운드리\n- 메모리: 36GB GDDR7 384-bit 버스 폭\n- 권장 파워 서플라이: 850W\n\n운영진의 신뢰도 검증 요청드립니다!`,
      tag: '유출 가능',
      trustLevel: '중간',
      isPinned: false,
      isDeleted: false,
      viewCount: 890,
      likeCount: 56,
      commentCount: 22,
      createdAt: pastDay(3),
      updatedAt: pastDay(3),
    },
    {
      id: 'post-3',
      forumId: 'forum-tech',
      forumName: 'IT & 개발 연구실',
      authorId: 'user-gold',
      authorNickname: '밤하늘의별빛',
      authorAvatar: profiles[2].avatarUrl,
      authorTier: '동지',
      authorPrimaryTitle: titles[2],
      title: '💎 Supabase RLS와 영지식 증명(ZKP)을 결합한 익명 세션 아키텍처 구현기',
      content: `웹 애플리케이션에서 개인 식별자 없이 어떻게 안전한 역할 기반 인가(RBAC)와 등급 시스템을 유지할 수 있을까요?\n\n\`\`\`sql\n-- Supabase RLS 정책 예시: 관리자 전용 생년월일 접근 차단\nCREATE POLICY "Strict user privacy isolation"\nON private_user_credentials\nFOR SELECT\nUSING (auth.uid() = user_id);\n\`\`\`\n\n개인정보를 테이블 단위로 완벽하게 격리(Separation of Concerns)하고, 공개 프로필에는 오직 익명 식별자와 활동 산출 수치만 동기화하는 구조를 고안했습니다.\n\n궁금한 점은 편하게 댓글로 남겨주세요!`,
      tag: '유출 불가능',
      trustLevel: '높음',
      isPinned: false,
      isDeleted: false,
      viewCount: 640,
      likeCount: 42,
      commentCount: 15,
      createdAt: pastDay(5),
      updatedAt: pastDay(5),
    },
    {
      id: 'post-4',
      forumId: 'forum-leak-room',
      forumName: '미공개 정보 & 유출 검증소',
      authorId: 'user-newbie',
      authorNickname: '호기심토끼',
      authorAvatar: profiles[3].avatarUrl,
      authorTier: '신입생',
      title: '🔍 모 글로벌 빅테크 기업 신규 OS 코드네임 루머 정보',
      content: `커뮤니티에서 본 루머인데 사실인지 검증 부탁드립니다.\n\n비밀 코드네임:\n[스포일러]Project Horizon - 완전 브라우저 기반 가상 데스크톱 OS로 전환된다는 소문[/스포일러]\n\n출처가 불명확하여 신뢰도 평가는 낮을 수 있습니다. 운영진 팩트체크 부탁드려요.`,
      tag: '유출 가능',
      trustLevel: '낮음',
      isPinned: false,
      isDeleted: false,
      viewCount: 310,
      likeCount: 12,
      commentCount: 8,
      createdAt: pastDay(1),
      updatedAt: pastDay(1),
    },
    {
      id: 'post-5',
      forumId: 'forum-free',
      forumName: '자유 광장 & 라운지',
      authorId: 'user-silver',
      authorNickname: '사이버탐정Q',
      authorAvatar: profiles[1].avatarUrl,
      authorTier: '공작원',
      authorPrimaryTitle: titles[1],
      title: '☕ 요즘 실명 인증 요구하는 사이트들이 너무 많아서 피로했는데...',
      content: `회원가입할 때마다 핸드폰 본인인증에 실명에 이메일까지 다 털리는 기분이었는데, 인민정보국처럼 가명과 생년월일 비공개 격리 원칙 지키는 곳이 늘어났으면 좋겠습니다.\n\n다들 오늘 하루도 파이팅입니다!`,
      tag: '유출 불가능',
      trustLevel: '높음',
      isPinned: false,
      isDeleted: false,
      viewCount: 420,
      likeCount: 31,
      commentCount: 9,
      createdAt: pastDay(2),
      updatedAt: pastDay(2),
    },
  ];

  const comments: Comment[] = [
    {
      id: 'comm-1',
      postId: 'post-1',
      authorId: 'user-silver',
      authorNickname: '사이버탐정Q',
      authorAvatar: profiles[1].avatarUrl,
      authorTier: '공작원',
      authorPrimaryTitle: titles[1],
      content: '실명과 이메일 수집을 원천 차단한 방침 전적으로 동의합니다. 안전하게 활동하겠습니다!',
      isDeleted: false,
      createdAt: pastDay(29),
      updatedAt: pastDay(29),
    },
    {
      id: 'comm-2',
      postId: 'post-1',
      parentId: 'comm-1',
      authorId: 'user-admin',
      authorNickname: '관리자-정보국',
      authorAvatar: profiles[0].avatarUrl,
      authorTier: '최고위원',
      authorPrimaryTitle: titles[0],
      content: '감사합니다. 앞으로도 사용자의 개인정보와 사생활을 최우선으로 지켜나가겠습니다.',
      isDeleted: false,
      createdAt: pastDay(29),
      updatedAt: pastDay(29),
    },
    {
      id: 'comm-3',
      postId: 'post-2',
      authorId: 'user-gold',
      authorNickname: '밤하늘의별빛',
      authorAvatar: profiles[2].avatarUrl,
      authorTier: '동지',
      authorPrimaryTitle: titles[2],
      content: '스포일러 열어보니 벤치마크 수치가 인상적이네요. 2nm 양산 수율이 관건일 것 같습니다.',
      isDeleted: false,
      createdAt: pastDay(2),
      updatedAt: pastDay(2),
    },
    {
      id: 'comm-4',
      postId: 'post-2',
      parentId: 'comm-3',
      authorId: 'user-silver',
      authorNickname: '사이버탐정Q',
      authorAvatar: profiles[1].avatarUrl,
      authorTier: '공작원',
      authorPrimaryTitle: titles[1],
      content: '맞습니다. 신뢰도 평가가 중간인 이유도 수율 및 출시 시점 루머 변동 때문인 것 같아요.',
      isDeleted: false,
      createdAt: pastDay(2),
      updatedAt: pastDay(2),
    },
  ];

  const adminLogs: AdminLog[] = [
    {
      id: 'log-1',
      adminId: 'user-admin',
      adminNickname: '관리자-정보국',
      actionType: 'TRUST_CHANGE',
      targetType: 'post',
      targetId: 'post-1',
      targetName: '공지사항 게시물',
      details: '운영진 공식 보안 공지로 신뢰도 "높음" 부여',
      createdAt: pastDay(30),
    },
    {
      id: 'log-2',
      adminId: 'user-admin',
      adminNickname: '관리자-정보국',
      actionType: 'TITLE_GRANT',
      targetType: 'title',
      targetId: 'title-detective',
      targetName: '사이버탐정Q',
      details: '유출 정보 팩트체크 기여로 "진실의 탐정" 칭호 수여',
      createdAt: pastDay(40),
    },
    {
      id: 'log-3',
      adminId: 'user-admin',
      adminNickname: '관리자-정보국',
      actionType: 'TRUST_CHANGE',
      targetType: 'post',
      targetId: 'post-2',
      targetName: 'GPU 유출본 분석',
      details: '출처 일부 검증 완료로 신뢰도 "중간" 책정',
      createdAt: pastDay(3),
    },
  ];

  const trustHistories: PostTrustHistory[] = [
    {
      id: 'th-1',
      postId: 'post-2',
      adminId: 'user-admin',
      adminNickname: '관리자-정보국',
      previousLevel: '낮음',
      newLevel: '중간',
      note: '엔지니어링 다이 스펙 1차 확인 완료되어 신뢰도 상향 조정',
      createdAt: pastDay(3),
    },
  ];

  return {
    users,
    profiles,
    forums,
    posts,
    comments,
    views: [],
    likes: [],
    titles,
    userTitles,
    warnings: [],
    timeouts: [],
    trustHistories,
    adminLogs,
    subscriptions: [
      { userId: 'user-admin', forumId: 'forum-notice', createdAt: now },
      { userId: 'user-admin', forumId: 'forum-leak-room', createdAt: now },
      { userId: 'user-silver', forumId: 'forum-leak-room', createdAt: now },
      { userId: 'user-gold', forumId: 'forum-tech', createdAt: now },
    ],
    securityConfig: {
      level: 1,
      updatedAt: now,
      updatedBy: 'user-admin',
    },
    customTiers: DEFAULT_TIERS,
  };
}

class DatabaseService {
  private state: DbState;
  private currentUserId: string | null = null;
  private listeners: (() => void)[] = [];
  private lastCommentTimes: Map<string, number> = new Map();
  private lastPostTimes: Map<string, number> = new Map();
  private csReaderIds = new Set<string>();
  private realtimeStarted = false;

  constructor() {
    this.state = isSupabaseConfigured ? this.createEmptyCloudState() : this.loadState();
    this.currentUserId = isSupabaseConfigured ? null : this.loadCurrentUserId();
    this.initServerSync();
  }

  private createEmptyCloudState(): DbState {
    const empty = generateInitialData();
    empty.users = []; empty.profiles = []; empty.forums = []; empty.posts = []; empty.comments = [];
    empty.views = []; empty.likes = []; empty.titles = []; empty.userTitles = []; empty.warnings = [];
    empty.timeouts = []; empty.trustHistories = []; empty.adminLogs = []; empty.subscriptions = [];
    empty.securityConfig = { level: 1, updatedAt: new Date().toISOString(), updatedBy: 'system' };
    return empty;
  }

  private initServerSync() {
    void this.syncFromServer();
    if (isSupabaseConfigured && supabase) {
      supabase.auth.onAuthStateChange(() => { void this.syncFromServer(); });
      if (!this.realtimeStarted) {
        this.realtimeStarted = true;
        let channel = supabase.channel('loki-database-live-sync');
        for (const table of ['profiles', 'forums', 'posts', 'comments', 'post_likes', 'forum_subscriptions', 'site_security_config', 'admin_roles', 'cs_readers']) {
          channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { void this.syncFromServer(); });
        }
        channel.subscribe();
      }
    } else if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => void this.syncFromServer());
    }
  }

  public async syncFromServer(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData.session?.user;
        if (authUser) this.currentUserId = authUser.id;
        else this.currentUserId = null;

        const [profileResult, forumResult, postResult, commentResult, securityResult, likesResult, subscriptionsResult, csReaderResult, tiersResult] = await Promise.all([
          supabase.from('profiles').select('id,nickname,bio,avatar_url,activity_tier,status,security_clearance,tier_manually_set,created_at,updated_at'),
          supabase.from('forums').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
          supabase.from('posts').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          supabase.from('comments').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
          supabase.from('site_security_config').select('level,updated_at,updated_by').eq('singleton', true).maybeSingle(),
          supabase.from('post_likes').select('post_id,user_id'),
          supabase.from('forum_subscriptions').select('forum_id,user_id,created_at'),
          authUser ? supabase.from('cs_readers').select('user_id').eq('user_id', authUser.id) : Promise.resolve({ data: [], error: null }),
          supabase.from('custom_tiers').select('*').order('level', { ascending: true }),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (forumResult.error) throw forumResult.error;
        if (postResult.error) throw postResult.error;
        if (commentResult.error) throw commentResult.error;
        if (securityResult.error) throw securityResult.error;
        if (likesResult.error) throw likesResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;
        if (csReaderResult.error) throw csReaderResult.error;
        // 등급(서열) 테이블은 아직 마이그레이션을 안 돌렸을 수도 있으므로 에러여도 기본값으로 폴백
        if (!tiersResult.error && tiersResult.data && tiersResult.data.length > 0) {
          this.state.customTiers = tiersResult.data.map((t: any) => ({
            id: t.id, label: t.label, level: t.level, description: t.description || '',
            badgeBg: t.badge_bg, badgeBorder: t.badge_border, textColor: t.text_color, glowColor: t.glow_color,
            iconName: t.icon_name, autoRequirement: t.auto_requirement || undefined,
            isAdminOnly: Boolean(t.is_admin_only), isDefault: Boolean(t.is_default),
          } as CustomTier));
        } else {
          this.state.customTiers = DEFAULT_TIERS;
        }
        applyTierConfig(this.state.customTiers);
        this.csReaderIds = new Set((csReaderResult.data || []).map((r: any) => r.user_id));
        this.state.likes = (likesResult.data || []).map((r: any) => ({ id: `${r.post_id}:${r.user_id}`, postId: r.post_id, userId: r.user_id, createdAt: new Date().toISOString() }));
        this.state.subscriptions = (subscriptionsResult.data || []).map((r: any) => ({ userId: r.user_id, forumId: r.forum_id, createdAt: r.created_at }));

        const { data: adminRole } = authUser
          ? await supabase.from('admin_roles').select('user_id').eq('user_id', authUser.id).maybeSingle()
          : { data: null };
        const adminRows = adminRole
          ? await supabase.from('admin_roles').select('user_id')
          : { data: [] as { user_id: string }[] };
        const adminIds = new Set((adminRows.data || []).map((r: any) => r.user_id));
        if (adminRole) { const { data: allCsReaders } = await supabase.from('cs_readers').select('user_id'); this.csReaderIds = new Set((allCsReaders || []).map((r: any) => r.user_id)); }
        const profileMap = new Map<string, any>((profileResult.data || []).map((p: any) => [p.id, p]));
        this.state.profiles = (profileResult.data || []).map((p: any) => {
          const postCount = (postResult.data || []).filter((row: any) => row.author_id === p.id).length;
          const commentCount = (commentResult.data || []).filter((row: any) => row.author_id === p.id).length;
          const isAdmin = adminIds.has(p.id);
          const manuallySet = Boolean(p.tier_manually_set);
          const tier = manuallySet
            ? (p.activity_tier || '신입생')
            : calculateUserTier(isAdmin, postCount, commentCount, 0, this.state.customTiers);
          return {
            id: p.id, nickname: p.nickname, avatarUrl: p.avatar_url || '', bio: p.bio || '',
            createdAt: p.created_at, updatedAt: p.updated_at, postCount, commentCount,
            visitedPostCount: 0, tier, tierManuallySet: manuallySet, isAdmin,
            isTimedOut: p.status === 'timeout', status: p.status, securityClearance: p.security_clearance || 3,
          } as UserProfile;
        });
        this.state.users = (profileResult.data || []).map((p: any) => ({
          id: p.id, passwordHash: '', birthDate: { year: 2000, month: 1, day: 1 },
          isAdmin: adminIds.has(p.id), status: p.status, createdAt: p.created_at, updatedAt: p.updated_at,
        } as UserAccount));
        this.state.forums = (forumResult.data || []).map((f: any) => ({
          id: f.id, name: f.name, slug: f.slug, description: f.description || '', category: f.category || '자유 포럼',
          icon: f.icon || 'MessageSquare', bannerUrl: f.banner_url || '', isPublic: f.is_public, rules: f.rules || '',
          ownerId: f.owner_id || '', isDeleted: f.is_deleted, createdAt: f.created_at, updatedAt: f.updated_at,
          postCount: (postResult.data || []).filter((p: any) => p.forum_id === f.id).length, subscriberCount: (subscriptionsResult.data || []).filter((r: any) => r.forum_id === f.id).length,
        } as Forum));
        this.state.posts = (postResult.data || []).map((p: any) => {
          const author = profileMap.get(p.author_id);
          return {
            id: p.id, forumId: p.forum_id || '', authorId: p.author_id, authorNickname: author?.nickname || '탈퇴한 회원',
            authorAvatar: author?.avatar_url || '', authorTier: author?.activity_tier || '신입생', title: p.title, content: p.content,
            tag: p.leak_tag, isSensitive: Boolean(p.is_sensitive), secretGrade: p.secret_grade, secretGradeSetByAuthor: p.grade_locked, poll: p.poll || undefined, trustLevel: p.trust_level,
            isPinned: p.is_pinned, isDeleted: Boolean(p.deleted_at), deletedAt: p.deleted_at || undefined,
            deletedBy: p.deleted_by || undefined, deletedReason: p.deleted_reason || undefined, viewCount: 0,
            commentCount: (commentResult.data || []).filter((c: any) => c.post_id === p.id).length, likeCount: (likesResult.data || []).filter((l: any) => l.post_id === p.id).length, createdAt: p.created_at, updatedAt: p.updated_at,
          } as Post;
        });
        if (securityResult.data) this.state.securityConfig = { level: securityResult.data.level as SecurityLevel, updatedAt: securityResult.data.updated_at, updatedBy: securityResult.data.updated_by || 'system' };
        this.state.comments = (commentResult.data || []).map((c: any) => {
          const author = profileMap.get(c.author_id);
          return { id: c.id, postId: c.post_id, parentId: c.parent_id || undefined, authorId: c.author_id,
            authorNickname: author?.nickname || '탈퇴한 회원', authorAvatar: author?.avatar_url || '',
            authorTier: author?.activity_tier || '신입생', content: c.content, imageUrl: c.image_url || undefined, isDeleted: Boolean(c.deleted_at),
            deletedAt: c.deleted_at || undefined, createdAt: c.created_at, updatedAt: c.updated_at } as Comment;
        });
        if (authUser) {
          const active = this.state.users.find((u) => u.id === authUser.id);
          if (!active || active.status !== 'active') { await supabase.auth.signOut(); this.currentUserId = null; }
        }
        this.notifyListeners();
      } catch (error) {
        console.error('Supabase 동기화 실패:', error);
      }
      return;
    }

    // Local development compatibility only. Cloudflare Pages has no Express /api server.
    return;
  }

  private loadState(): DbState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.securityConfig) {
          parsed.securityConfig = {
            level: 1,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system',
          };
        }
        if (!parsed.customTiers || parsed.customTiers.length === 0) {
          parsed.customTiers = DEFAULT_TIERS;
        }
        applyTierConfig(parsed.customTiers);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load DB state, resetting to initial data', e);
    }
    const initial = generateInitialData();
    applyTierConfig(initial.customTiers);
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DbState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save DB state', e);
    }
  }

  private commit() {
    this.saveState(this.state);
    this.notifyListeners();
  }

  private loadCurrentUserId(): string | null {
    try {
      // 이전 버전의 관리자 자동 로그인 세션 잔여물 원천 삭제
      localStorage.removeItem('loki_current_user_id');
      localStorage.removeItem('loki_guest_session_initialized_v2');
      localStorage.removeItem('loki_guest_session_initialized');

      // 오직 로그인 폼을 통해 인증된 세션 토큰만 검증
      const id = localStorage.getItem('loki_session_user_id_v3');
      if (id && this.state.users.some((u) => u.id === id && u.status === 'active')) {
        return id;
      }
    } catch (e) {
      console.warn(e);
    }
    // 기본 로그인 없음: 첫 방문자는 무조건 게스트(null)
    return null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  // --- 사용자 및 인증 (실명 및 이메일 없음) ---
  public getCurrentUser(): { user: UserAccount; profile: UserProfile } | null {
    if (!this.currentUserId) return null;
    const user = this.state.users.find((u) => u.id === this.currentUserId);
    const profile = this.state.profiles.find((p) => p.id === this.currentUserId);
    if (!user || !profile) return null;

    // 미승인(대기), 반려 또는 영구정지 계정은 세션 유지 차단
    if (user.status === 'pending' || user.status === 'rejected' || user.status === 'banned') {
      this.setCurrentUser(null);
      return null;
    }

    // 타임아웃 만료 여부 자동 확인
    let isTimedOut = false;
    if (user.status === 'timeout' && user.timeoutUntil) {
      if (new Date(user.timeoutUntil).getTime() > Date.now()) {
        isTimedOut = true;
      } else {
        // 타임아웃 만료 자동 해제
        user.status = 'active';
        user.timeoutUntil = undefined;
        user.timeoutReason = undefined;
        this.commit();
      }
    }

    return {
      user,
      profile: {
        ...profile,
        status: user.status,
        isTimedOut,
      },
    };
  }

  public setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      localStorage.setItem('loki_session_user_id_v3', userId);
    } else {
      localStorage.removeItem('loki_session_user_id_v3');
    }
    this.notifyListeners();
  }

  /**
   * 빠른 계정 전환 (관리자 / 실버 회원 / 골드 회원 / 신입 회원)
   */
  public switchAccount(type: 'admin' | 'silver' | 'gold' | 'newbie') {
    const map = {
      admin: 'user-admin',
      silver: 'user-silver',
      gold: 'user-gold',
      newbie: 'user-newbie',
    };
    this.setCurrentUser(map[type]);
  }

  /**
   * 신규 회원가입:
   * - 닉네임, 생년월일(년/월/일), 비밀번호만 입력받음
   * - 실명 및 이메일 필드 원천 차단
   * - 서버(data/db.json)에 status: 'pending'으로 즉시 전송 및 영구 보존
   * - 관리자가 승인해야 로그인 가능
   */
  public async signup(
    nickname: string,
    emailAddress: string,
    birthDate: { year: number; month: number; day: number },
    passwordHash: string
  ): Promise<{ success: boolean; message?: string; pendingApproval?: boolean; user?: UserProfile }> {
    const trimmedNick = nickname.trim();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailAddress.trim().toLowerCase(),
          password: passwordHash,
          options: {
            data: { nickname: trimmedNick, birth_date: `${birthDate.year}-${String(birthDate.month).padStart(2, '0')}-${String(birthDate.day).padStart(2, '0')}` },
            emailRedirectTo: authRedirectUrl,
          },
        });
        if (authError) return { success: false, message: authError.message };
        if (!authData.user) return { success: false, message: '인증 계정을 생성하지 못했습니다.' };
        const userId = authData.user.id;
        // A database trigger creates the public profile and private birthdate atomically.
        // Email confirmation is required, so no authenticated browser session exists yet.
        await supabase.auth.signOut();
        const now = new Date().toISOString();
        const user: UserAccount = { id: userId, passwordHash: '', birthDate, isAdmin: false, status: 'pending', createdAt: now, updatedAt: now };
        const profile: UserProfile = { id: userId, nickname: trimmedNick, avatarUrl: '', bio: '', createdAt: now, updatedAt: now, postCount: 0, commentCount: 0, visitedPostCount: 0, tier: '신입생', isAdmin: false, isTimedOut: false, status: 'pending', securityClearance: 3 };
        this.state.users = this.state.users.filter((u) => !u.id.startsWith('user-'));
        this.state.profiles = this.state.profiles.filter((p) => !p.id.startsWith('user-'));
        this.state.users.push(user);
        this.state.profiles.push(profile);
        this.commit();
        return { success: true, pendingApproval: true, message: '확인 메일을 보냈습니다. 이메일 인증을 완료한 뒤 관리자의 승인을 기다려 주세요.', user: profile };
      } catch (error: any) {
        return { success: false, message: error?.message || 'Supabase 회원가입에 실패했습니다.' };
      }
    }

    if (!isSupabaseConfigured) {
      return { success: false, message: '인증 서버가 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.' };
      /* 로컬 데모 가입 비활성화 */
      if (this.state.profiles.some((p) => p.nickname.toLowerCase() === trimmedNick.toLowerCase())) {
        return { success: false, message: '이미 사용 중인 닉네임입니다. 다른 가명을 설정해 주세요.' };
      }

      const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newUser: UserAccount = {
        id,
        passwordHash,
        birthDate,
        isAdmin: false,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(trimmedNick)}&backgroundColor=0f172a`;

      const newProfile: UserProfile = {
        id,
        nickname: trimmedNick,
        avatarUrl,
        bio: '관리자의 가입 승인을 대기 중인 신규 신청 회원입니다.',
        createdAt: now,
        updatedAt: now,
        postCount: 0,
        commentCount: 0,
        visitedPostCount: 0,
        tier: '신입생',
        isAdmin: false,
        isTimedOut: false,
        status: 'pending',
      };

      this.state.users.push(newUser);
      this.state.profiles.push(newProfile);
      this.commit();

      return {
        success: true,
        pendingApproval: true,
        message: '회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인이 가능합니다.',
        user: newProfile,
      };
    }
    return { success: false, message: 'Supabase 환경변수를 설정해야 회원가입할 수 있습니다.' };
  }

  public async login(emailAddress: string, password: string): Promise<{ success: boolean; message?: string }> {
    const q = emailAddress.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: q, password });
        if (error || !data.user) return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id,nickname,status,activity_tier,security_clearance,created_at,bio,avatar_url').eq('id', data.user.id).single();
        if (profileError || !profile) { await supabase.auth.signOut(); return { success: false, message: '회원 프로필을 찾을 수 없습니다.' }; }
        if (profile.status !== 'active') {
          await supabase.auth.signOut();
          return { success: false, message: profile.status === 'pending' ? '관리자 승인 대기 중인 계정입니다.' : '현재 로그인할 수 없는 계정입니다.' };
        }
        const { data: adminRole } = await supabase.from('admin_roles').select('user_id').eq('user_id', data.user.id).maybeSingle();
        const now = new Date().toISOString();
        const user: UserAccount = { id: data.user.id, passwordHash: '', birthDate: { year: 2000, month: 1, day: 1 }, isAdmin: Boolean(adminRole), status: 'active', createdAt: profile.created_at || now, updatedAt: now };
        const userProfile: UserProfile = { id: profile.id, nickname: profile.nickname, avatarUrl: profile.avatar_url || '', bio: profile.bio || '', createdAt: profile.created_at || now, updatedAt: now, postCount: 0, commentCount: 0, visitedPostCount: 0, tier: profile.activity_tier || '신입생', isAdmin: Boolean(adminRole), isTimedOut: false, status: 'active', securityClearance: profile.security_clearance || 3 };
        this.state.users = this.state.users.filter((u) => u.id !== user.id);
        this.state.profiles = this.state.profiles.filter((p) => p.id !== user.id);
        this.state.users.push(user); this.state.profiles.push(userProfile);
        this.setCurrentUser(user.id); this.commit();
        return { success: true };
      } catch (error: any) {
        return { success: false, message: error?.message || 'Supabase 로그인에 실패했습니다.' };
      }
    }
    if (!isSupabaseConfigured) {
      return { success: false, message: '서비스 인증 서버가 아직 설정되지 않았습니다.' };
      /* 로컬 데모 로그인 비활성화 */
      const qLower = q.toLowerCase();
      const profile = this.state.profiles.find(
        (p) =>
          p.nickname.toLowerCase() === qLower ||
          (p.isAdmin && (qLower === 'admin' || qLower === '관리자' || qLower === 'user-admin'))
      );
      if (!profile) {
        return { success: false, message: '등록되지 않은 닉네임입니다.' };
      }

      const user = this.state.users.find((u) => u.id === profile.id);
      if (!user || user.passwordHash !== password) {
        return { success: false, message: '비밀번호가 일치하지 않습니다.' };
      }

      if (user.status === 'pending') {
        return {
          success: false,
          message: '현재 관리자 승인 대기 중인 계정입니다. 관리자의 승인이 완료된 후 로그인하실 수 있습니다.',
        };
      }

      if (user.status === 'rejected') {
        return {
          success: false,
          message: `관리자에 의해 가입 승인이 반려된 계정입니다.${user.rejectionReason ? ` (사유: ${user.rejectionReason})` : ''}`,
        };
      }

      if (user.status === 'banned') {
        return { success: false, message: '영구 정지된 계정입니다.' };
      }

      this.setCurrentUser(user.id);
      return { success: true };
    }
    return { success: false, message: 'Supabase 환경변수를 설정해야 로그인할 수 있습니다.' };
  }

  public logout() {
    if (isSupabaseConfigured && supabase) void supabase.auth.signOut();
    this.setCurrentUser(null);
  }

  /**
   * 닉네임 변경 (중복 검사 포함)
   */
  public changeNickname(userId: string, newNickname: string): { success: boolean; message?: string } {
    if (isSupabaseConfigured) return { success: false, message: '닉네임 변경은 로그인 별칭 동기화 기능이 추가된 뒤 사용할 수 있습니다.' };
    const trimmed = newNickname.trim();
    const existing = this.state.profiles.find(
      (p) => p.id !== userId && p.nickname.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return { success: false, message: '이미 다른 회원이 사용 중인 닉네임입니다.' };
    }

    const profile = this.state.profiles.find((p) => p.id === userId);
    if (!profile) return { success: false, message: '회원을 찾을 수 없습니다.' };

    profile.nickname = trimmed;
    profile.updatedAt = new Date().toISOString();

    // 게시물 및 댓글 작성자 닉네임 동기화
    this.state.posts.forEach((p) => {
      if (p.authorId === userId) p.authorNickname = trimmed;
    });
    this.state.comments.forEach((c) => {
      if (c.authorId === userId) c.authorNickname = trimmed;
    });

    this.commit();
    return { success: true };
  }

  /**
   * 비밀번호 변경 (현재 비밀번호 확인 및 최소 6자 검증)
   */
  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; message?: string } {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: '회원 정보를 찾을 수 없습니다.' };
    }

    if (user.passwordHash !== currentPassword) {
      return { success: false, message: '현재 비밀번호가 일치하지 않습니다.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: '새 비밀번호는 최소 6자 이상이어야 합니다.' };
    }

    if (currentPassword === newPassword.trim()) {
      return { success: false, message: '현재 비밀번호와 다른 새로운 비밀번호를 설정해 주세요.' };
    }

    user.passwordHash = newPassword.trim();
    user.updatedAt = new Date().toISOString();
    this.commit();

    return { success: true, message: '비밀번호가 안전하게 변경되었습니다.' };
  }

  public updateProfile(
    userId: string,
    data: { bio?: string; avatarUrl?: string; primaryTitleId?: string }
  ): boolean {
    const profile = this.state.profiles.find((p) => p.id === userId);
    if (!profile) return false;

    if (data.bio !== undefined) profile.bio = data.bio;
    if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
    if (data.primaryTitleId !== undefined) profile.primaryTitleId = data.primaryTitleId;
    profile.updatedAt = new Date().toISOString();

    this.commit();
    if (isSupabaseConfigured && supabase) {
      void supabase.from('profiles').update({ bio: profile.bio, avatar_url: profile.avatarUrl, updated_at: profile.updatedAt }).eq('id', userId)
        .then(({ error }) => { if (error) console.error('프로필 저장 실패:', error.message); else void this.syncFromServer(); });
    }
    return true;
  }

  public getProfile(userId: string): UserProfile | null {
    const profile = this.state.profiles.find((p) => p.id === userId);
    if (!profile) return null;
    return profile;
  }

  public getUserAccountForAdmin(userId: string, adminId: string, purpose: string): UserAccount | null {
    // 관리자라도 필요한 권한과 목적 기록이 필수
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return null;

    this.logAdminAction(
      adminId,
      'USER_ADMIN_TOGGLE',
      'user',
      userId,
      `관리자 개인정보 접근 확인 (목적: ${purpose})`
    );

    return this.state.users.find((u) => u.id === userId) || null;
  }

  // --- 활동량 및 등급 동기화 (재계산) ---
  public recalculateUserStats(userId: string) {
    const profile = this.state.profiles.find((p) => p.id === userId);
    const user = this.state.users.find((u) => u.id === userId);
    if (!profile || !user) return;

    // 실제 활성(삭제되지 않은) 게시물 및 댓글 수 계산
    const activePosts = this.state.posts.filter((p) => p.authorId === userId && !p.isDeleted).length;
    const activeComments = this.state.comments.filter((c) => c.authorId === userId && !c.isDeleted).length;
    const visits = profile.visitedPostCount || 0;

    profile.postCount = activePosts;
    profile.commentCount = activeComments;
    // 관리자가 등급을 직접 지급(수동 고정)한 경우에는 활동량에 따른 자동 재산정을 건너뜁니다.
    if (!profile.tierManuallySet) {
      profile.tier = calculateUserTier(user.isAdmin, activePosts, activeComments, visits, this.state.customTiers);
    }
    profile.isAdmin = user.isAdmin;

    // 포스트/댓글 메타데이터에도 최신 등급 반영
    this.state.posts.forEach((p) => {
      if (p.authorId === userId) p.authorTier = profile.tier;
    });
    this.state.comments.forEach((c) => {
      if (c.authorId === userId) c.authorTier = profile.tier;
    });

    this.commit();
  }

  // --- 포럼 관리 ---
  public getForums(): Forum[] {
    return this.state.forums.filter((f) => !f.isDeleted);
  }

  public getAllForumsAdmin(): Forum[] {
    return this.state.forums;
  }

  public getForum(id: string): Forum | null {
    return this.state.forums.find((f) => f.id === id) || null;
  }

  public createForum(data: {
    name: string;
    description: string;
    category: Forum['category'];
    icon: string;
    bannerUrl?: string;
    isPublic: boolean;
    rules: string;
    ownerId: string;
    adminId?: string;
  }): Forum {
    const id = isSupabaseConfigured ? crypto.randomUUID() : `forum-${Date.now()}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-');
    const newForum: Forum = {
      id,
      name: data.name.trim(),
      slug,
      description: data.description.trim(),
      category: data.category,
      icon: data.icon || 'MessageSquare',
      bannerUrl:
        data.bannerUrl ||
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
      isPublic: data.isPublic,
      rules: data.rules,
      ownerId: data.ownerId,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      postCount: 0,
      subscriberCount: 1,
    };
    this.state.forums.push(newForum);
    this.state.subscriptions.push({
      userId: data.ownerId,
      forumId: id,
      createdAt: new Date().toISOString(),
    });

    if (data.adminId) {
      this.logAdminAction(
        data.adminId,
        'FORUM_MANAGE',
        'forum',
        id,
        `관리자 권한으로 포럼 생성: "${newForum.name}" (${newForum.category})`
      );
    }

    this.commit();
    if (isSupabaseConfigured && supabase) {
      void supabase.from('forums').insert({ id, name: newForum.name, slug: `${slug}-${id.slice(0, 6)}`, description: newForum.description, category: newForum.category, icon: newForum.icon, banner_url: newForum.bannerUrl, rules: newForum.rules, is_public: newForum.isPublic, owner_id: data.ownerId })
        .then(async ({ error }) => { if (error) { this.state.forums = this.state.forums.filter((f) => f.id !== id); this.notifyListeners(); console.error('포럼 저장 실패:', error.message); } else { await supabase.from('forum_subscriptions').insert({ forum_id: id, user_id: data.ownerId }); void this.syncFromServer(); } });
    }
    return newForum;
  }

  public updateForum(id: string, updates: Partial<Forum>, adminId?: string): boolean {
    const forum = this.state.forums.find((f) => f.id === id);
    if (!forum) return false;
    const oldName = forum.name;
    Object.assign(forum, updates, { updatedAt: new Date().toISOString() });

    // 포럼 이름 변경 시 해당 포럼의 모든 게시물 forumName 필드 일괄 동기화
    if (updates.name && updates.name !== oldName) {
      this.state.posts.forEach((p) => {
        if (p.forumId === id) {
          p.forumName = updates.name;
        }
      });
    }

    if (adminId) {
      this.logAdminAction(
        adminId,
        'FORUM_MANAGE',
        'forum',
        id,
        `포럼 설정 및 정보 수정: "${forum.name}"`
      );
    }

    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('forums').update({ name: forum.name, description: forum.description, category: forum.category, icon: forum.icon, banner_url: forum.bannerUrl, rules: forum.rules, is_public: forum.isPublic, updated_at: forum.updatedAt }).eq('id', id).then(({ error }) => { if (error) console.error('포럼 수정 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public deleteForum(id: string, adminId: string, permanent: boolean = false): boolean {
    const forum = this.state.forums.find((f) => f.id === id);
    if (!forum) return false;

    if (permanent) {
      const idx = this.state.forums.findIndex((f) => f.id === id);
      if (idx >= 0) {
        this.state.forums.splice(idx, 1);
        // 구독 정보 정리
        this.state.subscriptions = this.state.subscriptions.filter((s) => s.forumId !== id);
        this.logAdminAction(
          adminId,
          'FORUM_MANAGE',
          'forum',
          id,
          `포럼 영구 삭제 (완전 파기): "${forum.name}"`
        );
      }
    } else {
      forum.isDeleted = true;
      forum.updatedAt = new Date().toISOString();
      this.logAdminAction(
        adminId,
        'FORUM_MANAGE',
        'forum',
        id,
        `포럼 폐쇄 (비활성화): "${forum.name}"`
      );
    }

    this.commit();
    if (isSupabaseConfigured && supabase) {
      if (permanent) void supabase.from('forums').delete().eq('id', id);
      else void supabase.from('forums').update({ is_deleted: true }).eq('id', id);
    }
    return true;
  }

  public restoreForum(id: string, adminId: string): boolean {
    const forum = this.state.forums.find((f) => f.id === id);
    if (!forum) return false;

    forum.isDeleted = false;
    forum.updatedAt = new Date().toISOString();
    this.logAdminAction(
      adminId,
      'FORUM_MANAGE',
      'forum',
      id,
      `포럼 복구 (재활성화): "${forum.name}"`
    );

    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('forums').update({ is_deleted: false }).eq('id', id);
    return true;
  }

  public toggleForumSubscription(forumId: string, userId: string): boolean {
    const idx = this.state.subscriptions.findIndex((s) => s.forumId === forumId && s.userId === userId);
    const forum = this.state.forums.find((f) => f.id === forumId);
    if (idx >= 0) {
      this.state.subscriptions.splice(idx, 1);
      if (forum) forum.subscriberCount = Math.max(0, (forum.subscriberCount || 1) - 1);
      this.commit();
      if (isSupabaseConfigured && supabase) void supabase.from('forum_subscriptions').delete().eq('forum_id', forumId).eq('user_id', userId);
      return false; // unsubscribed
    } else {
      this.state.subscriptions.push({ forumId, userId, createdAt: new Date().toISOString() });
      if (forum) forum.subscriberCount = (forum.subscriberCount || 0) + 1;
      this.commit();
      if (isSupabaseConfigured && supabase) void supabase.from('forum_subscriptions').insert({ forum_id: forumId, user_id: userId });
      return true; // subscribed
    }
  }

  public isSubscribed(forumId: string, userId: string): boolean {
    return this.state.subscriptions.some((s) => s.forumId === forumId && s.userId === userId);
  }

  public getUserSubscriptions(userId: string): Forum[] {
    const forumIds = this.state.subscriptions.filter((s) => s.userId === userId).map((s) => s.forumId);
    return this.state.forums.filter((f) => forumIds.includes(f.id) && !f.isDeleted);
  }

  // --- 게시물 시스템 ---
  public getPosts(params: {
    forumId?: string;
    tag?: PostTag;
    trustLevel?: TrustLevel;
    search?: string;
    sort?: PostSortOption;
    authorId?: string;
    includeDeleted?: boolean; // 관리자 전용
  }): Post[] {
    let list = this.state.posts.filter((p) => (params.includeDeleted ? true : !p.isDeleted));

    if (params.forumId) {
      list = list.filter((p) => p.forumId === params.forumId);
    }
    if (params.tag) {
      list = list.filter((p) => p.tag === params.tag);
    }
    if (params.trustLevel) {
      list = list.filter((p) => p.trustLevel === params.trustLevel);
    }
    if (params.authorId) {
      list = list.filter((p) => p.authorId === params.authorId);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.authorNickname.toLowerCase().includes(q) ||
          (p.forumName && p.forumName.toLowerCase().includes(q))
      );
    }

    // 고정 게시물 최상단 배치
    const pinned = list.filter((p) => p.isPinned);
    const unpinned = list.filter((p) => !p.isPinned);

    const sortFn = (a: Post, b: Post) => {
      switch (params.sort) {
        case 'trust_high': {
          const rank = { 높음: 3, 중간: 2, 낮음: 1 };
          return rank[b.trustLevel] - rank[a.trustLevel] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'trust_mid': {
          const rank = { 중간: 3, 높음: 2, 낮음: 1 };
          return rank[b.trustLevel] - rank[a.trustLevel] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'trust_low': {
          const rank = { 낮음: 3, 중간: 2, 높음: 1 };
          return rank[b.trustLevel] - rank[a.trustLevel] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'comments':
          return b.commentCount - a.commentCount;
        case 'views':
          return b.viewCount - a.viewCount;
        case 'likes':
          return b.likeCount - a.likeCount;
        case 'latest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    };

    unpinned.sort(sortFn);
    const sorted = [...pinned, ...unpinned];

    // 보안조치 마스킹 처리 (5단계: 전체 게시물 마스킹, 4단계: 민감함 태그 게시물 마스킹)
    const secConfig = this.getSecurityConfig();
    return sorted.map((p) => {
      if (secConfig.level === 5) {
        return {
          ...p,
          title: '보안조치로 인하여 열람 불가',
          content: '보안조치로 인하여 열람 불가',
        };
      }
      if (secConfig.level >= 4 && p.isSensitive) {
        return {
          ...p,
          title: '[민감 정보] 보안조치로 인하여 열람 불가',
          content: '보안조치로 인하여 열람 불가',
        };
      }
      return p;
    });
  }

  public getPost(id: string, viewerId?: string, sessionId?: string): Post | null {
    const post = this.state.posts.find((p) => p.id === id);
    if (!post) return null;

    // 방문 수 기록 & 중복 방지 (사용자 ID 및 세션 ID 기준)
    if (viewerId || sessionId) {
      const alreadyViewed = this.state.views.some(
        (v) =>
          v.postId === id &&
          ((viewerId && v.userId === viewerId) || (sessionId && v.sessionId === sessionId))
      );

      if (!alreadyViewed) {
        this.state.views.push({
          id: `view-${Date.now()}-${Math.random()}`,
          postId: id,
          userId: viewerId,
          sessionId: sessionId || 'anon',
          viewedAt: new Date().toISOString(),
        });
        post.viewCount += 1;

        // 회원의 방문 게시물 수 업데이트 및 등급 재계산
        if (viewerId) {
          const profile = this.state.profiles.find((p) => p.id === viewerId);
          if (profile) {
            profile.visitedPostCount = (profile.visitedPostCount || 0) + 1;
            this.recalculateUserStats(viewerId);
          }
        }
        this.commit();
      }
    }

    // 게시물 비밀등급 접근 제어
    if (!this.canReadPost(post, viewerId)) return null;

    // 보안조치 마스킹 처리
    const secConfig = this.getSecurityConfig();
    if (secConfig.level === 5) {
      return {
        ...post,
        title: '보안조치로 인하여 열람 불가',
        content: '보안조치로 인하여 열람 불가',
      };
    }
    if (secConfig.level >= 4 && post.isSensitive) {
      return {
        ...post,
        title: '[민감 정보] 보안조치로 인하여 열람 불가',
        content: '보안조치로 인하여 열람 불가',
      };
    }

    return post;
  }

  public createPost(data: {
    forumId: string;
    authorId: string;
    title: string;
    content: string;
    tag: PostTag; // 필수 선택
    isSensitive?: boolean;
    secretGrade?: 1 | 2 | 3 | 4 | 5;
    pollData?: { question: string; options: string[] };
  }): Post {
    const secConfig = this.getSecurityConfig();
    if (secConfig.level >= 4) {
      throw new Error('보안조치 4단계(유출감지) 이상으로 인해 게시물 작성이 금지되었습니다.');
    }
    const cd = this.checkPostCooldown(data.authorId);
    if (!cd.allowed) {
      throw new Error(`보안조치 긴장 단계: 게시물 작성 대기 시간이 ${cd.remainingSeconds}초 남았습니다.`);
    }

    const forum = this.state.forums.find((f) => f.id === data.forumId);
    const profile = this.state.profiles.find((p) => p.id === data.authorId);
    const authorTitle = profile?.primaryTitleId
      ? this.state.titles.find((t) => t.id === profile.primaryTitleId)
      : undefined;

    const id = isSupabaseConfigured ? crypto.randomUUID() : `post-${Date.now()}`;
    const now = new Date().toISOString();

    const validOptions = data.pollData?.options
      ?.map((opt) => opt.trim())
      .filter((opt) => opt.length > 0) || [];

    const poll: Poll | undefined =
      data.pollData && data.pollData.question.trim() && validOptions.length >= 2
        ? {
            id: `poll-${Date.now()}`,
            question: data.pollData.question.trim(),
            options: validOptions.map((opt, idx) => ({
              id: `opt-${idx}-${Date.now()}`,
              text: opt,
              votes: [],
            })),
            totalVotes: 0,
            createdAt: now,
          }
        : undefined;

    const newPost: Post = {
      id,
      forumId: data.forumId,
      forumName: forum?.name || '일반 포럼',
      authorId: data.authorId,
      authorNickname: profile?.nickname || '익명회원',
      authorAvatar: profile?.avatarUrl || '',
      authorTier: profile?.tier || '신입생',
      authorPrimaryTitle: authorTitle,
      title: data.title.trim(),
      content: data.content,
      tag: data.tag,
      isSensitive: !!data.isSensitive,
      secretGrade: data.secretGrade ?? 5,
      secretGradeSetByAuthor: data.secretGrade !== undefined,
      poll,
      trustLevel: '중간', // 기본 신뢰도 (운영진 검토 전 보통 상태)
      isPinned: false,
      isDeleted: false,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.state.posts.unshift(newPost);
    if (forum) forum.postCount = (forum.postCount || 0) + 1;
    if (isSupabaseConfigured && supabase) {
      void supabase.from('posts').insert({
        id, forum_id: data.forumId || null, author_id: data.authorId, title: newPost.title, content: newPost.content,
        leak_tag: data.tag, secret_grade: newPost.secretGrade, grade_set_by: data.authorId, grade_locked: true,
        trust_level: '중간', is_pinned: false, poll: newPost.poll || null, is_sensitive: Boolean(newPost.isSensitive),
      }).then(({ error }) => {
        if (error) { this.state.posts = this.state.posts.filter((p) => p.id !== id); this.notifyListeners(); console.error('게시물 저장 실패:', error.message); }
        else void this.syncFromServer();
      });
    }

    // 쿨다운 기록
    this.recordPostTime(data.authorId);

    // 활동량 업데이트 및 등급 자동 산정
    this.recalculateUserStats(data.authorId);
    this.commit();



    return newPost;
  }

  public updatePost(
    id: string,
    authorId: string,
    updates: { title?: string; content?: string; tag?: PostTag; isSensitive?: boolean; secretGrade?: 1 | 2 | 3 | 4 | 5 }
  ): boolean {
    const post = this.state.posts.find((p) => p.id === id);
    if (!post || (post.authorId !== authorId && !this.isAdmin(authorId))) return false;

    if (updates.title !== undefined) post.title = updates.title.trim();
    if (updates.content !== undefined) post.content = updates.content;
    if (updates.tag !== undefined) post.tag = updates.tag;
    if (updates.isSensitive !== undefined) post.isSensitive = !!updates.isSensitive;
    if (updates.secretGrade !== undefined && this.isAdmin(authorId)) { post.secretGrade = updates.secretGrade; post.secretGradeSetByAuthor = true; }
    post.updatedAt = new Date().toISOString();

    if (this.isAdmin(authorId) && updates.isSensitive !== undefined) {
      this.logAdminAction(
        authorId,
        'POST_SENSITIVE_TOGGLE',
        'post',
        post.id,
        `게시물 "${post.title}" 민감함(SENSITIVE) 태그 ${post.isSensitive ? '부여' : '해제'}`
      );
    }

    this.commit();

    if (isSupabaseConfigured && supabase) {
      const remote: Record<string, unknown> = { updated_at: post.updatedAt };
      if (updates.title !== undefined) remote.title = post.title;
      if (updates.content !== undefined) remote.content = post.content;
      if (updates.tag !== undefined) remote.leak_tag = post.tag;
      if (updates.isSensitive !== undefined) remote.is_sensitive = post.isSensitive;
      if (updates.secretGrade !== undefined && this.isAdmin(authorId)) remote.secret_grade = post.secretGrade;
      void supabase.from('posts').update(remote).eq('id', id).then(({ error }) => { if (error) console.error('게시물 수정 실패:', error.message); else void this.syncFromServer(); });
    }

    return true;
  }

  /**
   * 소프트 삭제 (영구 삭제하지 않고 휴지통 보관함 이동)
   */
  public softDeletePost(id: string, deletedByUserId: string, reason?: string): boolean {
    const post = this.state.posts.find((p) => p.id === id);
    if (!post) return false;

    const user = this.state.users.find((u) => u.id === deletedByUserId);
    if (post.authorId !== deletedByUserId && !user?.isAdmin) return false;

    post.isDeleted = true;
    post.deletedAt = new Date().toISOString();
    post.deletedBy = deletedByUserId;
    post.deletedReason = reason || (user?.isAdmin ? '관리자에 의한 삭제' : '작성자 직접 삭제');

    // 포럼 게시물 수 및 회원 등급 재계산
    const forum = this.state.forums.find((f) => f.id === post.forumId);
    if (forum) forum.postCount = Math.max(0, (forum.postCount || 1) - 1);

    this.recalculateUserStats(post.authorId);

    if (user?.isAdmin) {
      this.logAdminAction(
        deletedByUserId,
        'POST_DELETE',
        'post',
        post.id,
        `게시물 휴지통 이동: "${post.title.substring(0, 30)}..." (${post.deletedReason})`
      );
    }

    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('posts').update({ deleted_at: post.deletedAt, deleted_by: deletedByUserId, deleted_reason: post.deletedReason }).eq('id', id).then(({ error }) => { if (error) console.error('게시물 삭제 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  /**
   * 관리자: 휴지통 게시물 복구
   */
  public restorePost(id: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const post = this.state.posts.find((p) => p.id === id);
    if (!post) return false;

    post.isDeleted = false;
    post.deletedAt = undefined;
    post.deletedBy = undefined;
    post.deletedReason = undefined;

    const forum = this.state.forums.find((f) => f.id === post.forumId);
    if (forum) forum.postCount = (forum.postCount || 0) + 1;

    this.recalculateUserStats(post.authorId);

    this.logAdminAction(adminId, 'POST_RESTORE', 'post', post.id, `게시물 복구: "${post.title}"`);
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('posts').update({ deleted_at: null, deleted_by: null, deleted_reason: null }).eq('id', id).then(({ error }) => { if (error) console.error('게시물 복구 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  /**
   * 관리자: 영구 삭제
   */
  public permanentDeletePost(id: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const idx = this.state.posts.findIndex((p) => p.id === id);
    if (idx < 0) return false;

    const post = this.state.posts[idx];
    this.state.posts.splice(idx, 1);

    // 댓글 및 좋아요 연쇄 삭제
    this.state.comments = this.state.comments.filter((c) => c.postId !== id);
    this.state.likes = this.state.likes.filter((l) => l.postId !== id);
    this.state.views = this.state.views.filter((v) => v.postId !== id);

    this.recalculateUserStats(post.authorId);

    this.logAdminAction(
      adminId,
      'POST_PERMANENT_DELETE',
      'post',
      id,
      `게시물 영구 삭제: "${post.title.substring(0, 30)}"`
    );
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('posts').delete().eq('id', id).then(({ error }) => { if (error) console.error('게시물 영구 삭제 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public togglePin(id: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const post = this.state.posts.find((p) => p.id === id);
    if (!post) return false;

    post.isPinned = !post.isPinned;
    this.logAdminAction(
      adminId,
      'POST_PIN_TOGGLE',
      'post',
      post.id,
      `게시물 고정 상태 변경: ${post.isPinned ? '고정됨' : '고정 해제'}`
    );
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('posts').update({ is_pinned: post.isPinned }).eq('id', id);
    return true;
  }

  public toggleLike(postId: string, userId: string): boolean {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return false;

    const idx = this.state.likes.findIndex((l) => l.postId === postId && l.userId === userId);
    if (idx >= 0) {
      this.state.likes.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
      this.commit();
      if (isSupabaseConfigured && supabase) void supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      return false; // unliked
    } else {
      this.state.likes.push({
        id: `like-${Date.now()}`,
        postId,
        userId,
        createdAt: new Date().toISOString(),
      });
      post.likeCount += 1;
      this.commit();
      if (isSupabaseConfigured && supabase) void supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      return true; // liked
    }
  }

  public isPostLiked(postId: string, userId: string): boolean {
    return this.state.likes.some((l) => l.postId === postId && l.userId === userId);
  }

  /**
   * 신뢰도 변경 (관리자 전용 & 변경 이력 기록)
   */
  public updateTrustLevel(
    postId: string,
    adminId: string,
    newLevel: TrustLevel,
    note: string
  ): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    if (!admin || !adminProfile) return false;

    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return false;

    const prevLevel = post.trustLevel;
    post.trustLevel = newLevel;

    // 신뢰도 변경 이력 보관
    this.state.trustHistories.push({
      id: `th-${Date.now()}`,
      postId,
      adminId,
      adminNickname: adminProfile.nickname,
      previousLevel: prevLevel,
      newLevel,
      note: note || '운영진 검토 완료',
      createdAt: new Date().toISOString(),
    });

    this.logAdminAction(
      adminId,
      'TRUST_CHANGE',
      'post',
      postId,
      `신뢰도 변경: ${prevLevel} ➔ ${newLevel} (사유: ${note || '일반 검토'})`
    );

    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('posts').update({ trust_level: newLevel }).eq('id', postId).then(({ error }) => { if (error) console.error('신뢰도 변경 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public getPostTrustHistories(postId: string): PostTrustHistory[] {
    return this.state.trustHistories
      .filter((th) => th.postId === postId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- 댓글 시스템 (대댓글 지원) ---
  public getComments(postId: string, includeDeleted = false): Comment[] {
    const all = this.state.comments.filter((c) => c.postId === postId && (includeDeleted ? true : !c.isDeleted));

    // 대댓글 트리 구성
    const rootComments = all.filter((c) => !c.parentId);
    const replyComments = all.filter((c) => c.parentId);

    return rootComments.map((root) => {
      const replies = replyComments.filter((r) => r.parentId === root.id);
      return {
        ...root,
        replies: replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createComment(data: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
    imageUrl?: string;
  }): Comment | null {
    const cd = this.checkCommentCooldown(data.authorId);
    if (!cd.allowed) {
      throw new Error(`보안조치 긴장 단계: 댓글 작성 대기 시간이 ${cd.remainingSeconds}초 남았습니다.`);
    }

    const post = this.state.posts.find((p) => p.id === data.postId);
    const profile = this.state.profiles.find((p) => p.id === data.authorId);
    const userAcc = this.state.users.find((u) => u.id === data.authorId);
    if (!post || !profile) return null;

    const authorTitle = profile.primaryTitleId
      ? this.state.titles.find((t) => t.id === profile.primaryTitleId)
      : undefined;

    const id = isSupabaseConfigured ? crypto.randomUUID() : `comm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const newComment: Comment = {
      id,
      postId: data.postId,
      parentId: data.parentId,
      authorId: data.authorId,
      authorNickname: profile.nickname,
      authorAvatar: profile.avatarUrl,
      authorTier: profile.tier,
      authorPrimaryTitle: authorTitle,
      authorJoinedAt: userAcc?.createdAt || profile.createdAt || now,
      content: data.content.trim(),
      imageUrl: data.imageUrl,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.state.comments.push(newComment);
    post.commentCount += 1;
    if (isSupabaseConfigured && supabase) {
      void supabase.from('comments').insert({ id, post_id: data.postId, author_id: data.authorId, parent_id: data.parentId || null, content: data.content.trim(), image_url: data.imageUrl || null })
        .then(({ error }) => { if (error) { this.state.comments = this.state.comments.filter((c) => c.id !== id); this.notifyListeners(); console.error('댓글 저장 실패:', error.message); } else void this.syncFromServer(); });
    }

    // 쿨다운 기록
    this.recordCommentTime(data.authorId);

    // 작성자 활동량 업데이트 및 등급 자동 산정
    this.recalculateUserStats(data.authorId);
    this.commit();



    return newComment;
  }

  public softDeleteComment(commentId: string, userId: string): boolean {
    const comment = this.state.comments.find((c) => c.id === commentId);
    if (!comment) return false;

    const user = this.state.users.find((u) => u.id === userId);
    if (comment.authorId !== userId && !user?.isAdmin) return false;

    comment.isDeleted = true;
    comment.deletedAt = new Date().toISOString();

    const post = this.state.posts.find((p) => p.id === comment.postId);
    if (post) post.commentCount = Math.max(0, post.commentCount - 1);

    this.recalculateUserStats(comment.authorId);
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('comments').update({ deleted_at: comment.deletedAt }).eq('id', commentId).then(({ error }) => { if (error) console.error('댓글 삭제 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public restoreComment(commentId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const comment = this.state.comments.find((c) => c.id === commentId);
    if (!comment) return false;

    comment.isDeleted = false;
    comment.deletedAt = undefined;

    const post = this.state.posts.find((p) => p.id === comment.postId);
    if (post) post.commentCount += 1;

    this.recalculateUserStats(comment.authorId);
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.from('comments').update({ deleted_at: null }).eq('id', commentId).then(({ error }) => { if (error) console.error('댓글 복구 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  // --- 칭호 시스템 ---
  public getTitles(): Title[] {
    return this.state.titles;
  }

  public getUserTitles(userId: string): Title[] {
    const userTitleIds = this.state.userTitles.filter((ut) => ut.userId === userId).map((ut) => ut.titleId);
    return this.state.titles.filter((t) => userTitleIds.includes(t.id));
  }

  public createTitle(data: {
    name: string;
    description: string;
    color: string;
    icon: string;
    isAdminOnly: boolean;
    adminId: string;
  }): Title | null {
    const admin = this.state.users.find((u) => u.id === data.adminId && u.isAdmin);
    if (!admin) return null;

    const id = `title-${Date.now()}`;
    const newTitle: Title = {
      id,
      name: data.name,
      description: data.description,
      color: data.color || '#6366f1',
      bgGradient: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/50',
      icon: data.icon || 'Award',
      isAdminOnly: data.isAdminOnly,
      createdAt: new Date().toISOString(),
    };

    this.state.titles.push(newTitle);
    this.logAdminAction(data.adminId, 'TITLE_CREATE', 'title', id, `새로운 칭호 생성: "${data.name}"`);
    this.commit();
    return newTitle;
  }

  public grantTitleToUser(titleId: string, userId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const alreadyHas = this.state.userTitles.some((ut) => ut.titleId === titleId && ut.userId === userId);
    if (alreadyHas) return false;

    const title = this.state.titles.find((t) => t.id === titleId);
    const profile = this.state.profiles.find((p) => p.id === userId);
    if (!title || !profile) return false;

    this.state.userTitles.push({
      id: `ut-${Date.now()}`,
      titleId,
      userId,
      grantedBy: adminId,
      grantedAt: new Date().toISOString(),
    });

    if (!profile.primaryTitleId) {
      profile.primaryTitleId = titleId;
    }

    this.logAdminAction(
      adminId,
      'TITLE_GRANT',
      'title',
      titleId,
      `회원 "${profile.nickname}"에게 "${title.name}" 칭호 지급`
    );
    this.commit();
    return true;
  }

  public revokeTitleFromUser(titleId: string, userId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const idx = this.state.userTitles.findIndex((ut) => ut.titleId === titleId && ut.userId === userId);
    if (idx < 0) return false;

    this.state.userTitles.splice(idx, 1);

    const profile = this.state.profiles.find((p) => p.id === userId);
    if (profile && profile.primaryTitleId === titleId) {
      const remaining = this.getUserTitles(userId);
      profile.primaryTitleId = remaining[0]?.id;
    }

    this.logAdminAction(
      adminId,
      'TITLE_REVOKE',
      'title',
      titleId,
      `회원 ID ${userId}의 칭호 회수`
    );
    this.commit();
    return true;
  }

  /**
   * 커뮤니티 칭호 영구 삭제 (관리자 권한)
   */
  public deleteTitle(titleId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const idx = this.state.titles.findIndex((t) => t.id === titleId);
    if (idx < 0) return false;

    const title = this.state.titles[idx];
    this.state.titles.splice(idx, 1);

    // 해당 칭호를 부여받은 사용자들의 userTitles 및 primaryTitleId 정리
    this.state.userTitles = this.state.userTitles.filter((ut) => ut.titleId !== titleId);
    this.state.profiles.forEach((p) => {
      if (p.primaryTitleId === titleId) {
        p.primaryTitleId = undefined;
      }
    });

    this.logAdminAction(
      adminId,
      'TITLE_REVOKE',
      'title',
      titleId,
      `커뮤니티 칭호 영구 삭제: "${title.name}"`
    );
    this.commit();
    return true;
  }

  /**
   * 회원이 자신의 보유 칭호 삭제 또는 관리자가 특정 회원의 칭호 삭제
   */
  public removeUserTitle(titleId: string, userId: string, actorId: string): boolean {
    const isSelf = userId === actorId;
    const admin = this.state.users.find((u) => u.id === actorId && u.isAdmin);
    if (!isSelf && !admin) return false;

    const idx = this.state.userTitles.findIndex((ut) => ut.titleId === titleId && ut.userId === userId);
    if (idx < 0) return false;

    this.state.userTitles.splice(idx, 1);
    const profile = this.state.profiles.find((p) => p.id === userId);
    if (profile && profile.primaryTitleId === titleId) {
      const remaining = this.getUserTitles(userId);
      profile.primaryTitleId = remaining[0]?.id;
    }

    if (admin) {
      this.logAdminAction(actorId, 'TITLE_REVOKE', 'title', titleId, `회원 ID ${userId}의 칭호 삭제/회수`);
    }
    this.commit();
    return true;
  }

  // --- 관리자 시스템 ---
  public isAdmin(userId: string): boolean {
    const user = this.state.users.find((u) => u.id === userId);
    return !!user?.isAdmin;
  }

  public getAllUsers(): { user: UserAccount; profile: UserProfile }[] {
    return this.state.users.map((u) => {
      const p = this.state.profiles.find((p) => p.id === u.id);
      const safeProfile: UserProfile = p
        ? { ...p, status: u.status }
        : {
            id: u.id,
            nickname: '익명',
            avatarUrl: '',
            bio: '',
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            postCount: 0,
            commentCount: 0,
            visitedPostCount: 0,
            tier: '신입생' as const,
            isAdmin: u.isAdmin,
            isTimedOut: false,
            status: u.status,
          };
      return { user: u, profile: safeProfile };
    });
  }

  /**
   * 관리자 승인 대기 중인 회원 목록 조회
   */
  public getPendingUsers(): { user: UserAccount; profile: UserProfile }[] {
    return this.getAllUsers().filter((u) => u.user.status === 'pending');
  }

  /**
   * 회원가입 승인 (계정 활성화)
   */
  public approveUser(
    targetUserId: string,
    adminId: string
  ): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    if (!admin || !adminProfile) {
      return { success: false, message: '관리자 권한이 필요합니다.' };
    }

    const user = this.state.users.find((u) => u.id === targetUserId);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!user || !profile) {
      return { success: false, message: '가입 신청 회원을 찾을 수 없습니다.' };
    }

    const now = new Date().toISOString();
    user.status = 'active';
    user.approvedAt = now;
    user.approvedBy = adminId;
    user.updatedAt = now;
    profile.status = 'active';
    profile.updatedAt = now;

    this.logAdminAction(
      adminId,
      'USER_APPROVE',
      'user',
      targetUserId,
      `회원 "${profile.nickname}" 가입 승인 완료 (계정 활성화)`
    );

    this.commit();

    if (isSupabaseConfigured && supabase) {
      void supabase.from('profiles').update({ status: 'active', updated_at: now }).eq('id', targetUserId)
        .then(({ error }) => { if (error) console.error('회원 승인 실패:', error.message); else void this.syncFromServer(); });
    }

    return { success: true, message: `"${profile.nickname}" 님의 회원가입을 승인했습니다.` };
  }

  /**
   * 회원가입 반려 (사유 기록)
   */
  public rejectUser(
    targetUserId: string,
    adminId: string,
    reason?: string
  ): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    if (!admin || !adminProfile) {
      return { success: false, message: '관리자 권한이 필요합니다.' };
    }

    const user = this.state.users.find((u) => u.id === targetUserId);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!user || !profile) {
      return { success: false, message: '가입 신청 회원을 찾을 수 없습니다.' };
    }

    const now = new Date().toISOString();
    const rejectReason = reason?.trim() || '관리자 가입 심사 미승인';
    user.status = 'rejected';
    user.rejectionReason = rejectReason;
    user.updatedAt = now;
    profile.status = 'rejected';
    profile.updatedAt = now;

    this.logAdminAction(
      adminId,
      'USER_REJECT',
      'user',
      targetUserId,
      `회원 "${profile.nickname}" 가입 반려 (사유: ${rejectReason})`
    );

    this.commit();

    if (isSupabaseConfigured && supabase) void supabase.from('profiles').update({ status: 'rejected', updated_at: now }).eq('id', targetUserId).then(({ error }) => { if (error) console.error('가입 반려 실패:', error.message); else void this.syncFromServer(); });

    return { success: true, message: `"${profile.nickname}" 님의 가입 신청을 반려했습니다.` };
  }

  public adminTimeoutUser(
    targetUserId: string,
    adminId: string,
    durationMinutes: number,
    reason: string
  ): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    if (!admin || !adminProfile) return false;

    const user = this.state.users.find((u) => u.id === targetUserId);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!user || !profile || user.isAdmin) return false; // 관리자는 타임아웃 불가

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    user.status = 'timeout';
    user.timeoutUntil = expiresAt;
    user.timeoutReason = reason;

    this.state.timeouts.push({
      id: `to-${Date.now()}`,
      userId: targetUserId,
      adminId,
      adminNickname: adminProfile.nickname,
      reason,
      durationMinutes,
      expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    this.logAdminAction(
      adminId,
      'USER_TIMEOUT',
      'user',
      targetUserId,
      `회원 "${profile.nickname}" 타임아웃 ${durationMinutes}분 (사유: ${reason})`
    );
    this.commit();
    return true;
  }

  public adminUntimeoutUser(targetUserId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return false;

    const user = this.state.users.find((u) => u.id === targetUserId);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!user || !profile) return false;

    user.status = 'active';
    user.timeoutUntil = undefined;
    user.timeoutReason = undefined;

    this.state.timeouts.forEach((to) => {
      if (to.userId === targetUserId) to.isActive = false;
    });

    this.logAdminAction(
      adminId,
      'USER_UNTIMEOUT',
      'user',
      targetUserId,
      `회원 "${profile.nickname}" 타임아웃 즉시 해제`
    );
    this.commit();
    return true;
  }

  public adminWarnUser(targetUserId: string, adminId: string, reason: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    if (!admin || !adminProfile) return false;

    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!profile) return false;

    this.state.warnings.push({
      id: `warn-${Date.now()}`,
      userId: targetUserId,
      adminId,
      adminNickname: adminProfile.nickname,
      reason,
      createdAt: new Date().toISOString(),
    });

    this.logAdminAction(
      adminId,
      'USER_WARNING',
      'user',
      targetUserId,
      `회원 "${profile.nickname}"에게 공식 경고 발송 (사유: ${reason})`
    );
    this.commit();
    return true;
  }

  public adminToggleRole(targetUserId: string, adminId: string): boolean {
    const superAdmin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!superAdmin) return false;

    const targetUser = this.state.users.find((u) => u.id === targetUserId);
    const targetProfile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!targetUser || !targetProfile) return false;

    targetUser.isAdmin = !targetUser.isAdmin;
    targetProfile.isAdmin = targetUser.isAdmin;

    this.recalculateUserStats(targetUserId);

    this.logAdminAction(
      adminId,
      'USER_ADMIN_TOGGLE',
      'user',
      targetUserId,
      `회원 "${targetProfile.nickname}" 관리자 권한 ${targetUser.isAdmin ? '부여' : '회수'}`
    );
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.rpc('admin_set_user_role', { target_user: targetUserId, make_admin: targetUser.isAdmin }).then(({ error }) => { if (error) console.error('관리자 권한 변경 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public getAdminLogs(): AdminLog[] {
    return [...this.state.adminLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getWarnings(userId?: string): Warning[] {
    return userId ? this.state.warnings.filter((w) => w.userId === userId) : this.state.warnings;
  }

  public getTimeouts(userId?: string): TimeoutRecord[] {
    return userId ? this.state.timeouts.filter((t) => t.userId === userId) : this.state.timeouts;
  }

  // --- 보안조치 (Security Measures) ---
  public getSecurityConfig(): SecurityConfig {
    if (!this.state.securityConfig) {
      this.state.securityConfig = {
        level: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };
    }
    return this.state.securityConfig;
  }

  public setSecurityLevel(
    targetLevel: SecurityLevel,
    adminId: string,
    passwordAttempt?: string
  ): { success: boolean; error?: string } {
    const admin = this.state.users.find((u) => u.id === adminId);
    if (!admin?.isAdmin) {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const currentConfig = this.getSecurityConfig();
    const currentLevel = currentConfig.level;

    // Cloud mode delegates authorization to the admin-only Supabase RPC.
    if (!isSupabaseConfigured && targetLevel < currentLevel && !passwordAttempt?.trim()) {
      return { success: false, error: '보안조치 하향에는 관리자 확인이 필요합니다.' };
    }

    this.state.securityConfig = {
      level: targetLevel,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };

    const levelDescriptions: Record<SecurityLevel, string> = {
      1: '1단계 평상시: 평소 상태',
      2: '2단계 긴장: 댓글 10초 타이머, 게시물 20초 타이머',
      3: '3단계 긴급: 비회원 사이트 접근 전면 차단',
      4: '4단계 유출감지: 민감함 태그 게시물 열람 불가 및 게시물 작성 금지',
      5: '5단계 전부 유출: 전체 게시물 제목 및 내용 열람 불가',
    };

    this.logAdminAction(
      adminId,
      'SECURITY_LEVEL_CHANGE',
      'user',
      adminId,
      `보안경보 등급 발령: ${currentLevel}단계 -> ${targetLevel}단계 (${levelDescriptions[targetLevel]})`
    );

    this.commit();

    if (isSupabaseConfigured && supabase) void supabase.rpc('admin_set_site_security_level', { new_level: targetLevel }).then(({ error }) => { if (error) console.error('보안 단계 저장 실패:', error.message); else void this.syncFromServer(); });

    return { success: true };
  }

  public checkCommentCooldown(userId: string): { allowed: boolean; remainingSeconds: number } {
    const config = this.getSecurityConfig();
    if (config.level < 2) return { allowed: true, remainingSeconds: 0 };
    // 2단계 이상일 때 댓글 10초 타이머
    const last = this.lastCommentTimes.get(userId) || 0;
    const elapsed = Date.now() - last;
    const cooldownMs = 10000; // 10초
    if (elapsed < cooldownMs) {
      return { allowed: false, remainingSeconds: Math.ceil((cooldownMs - elapsed) / 1000) };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  public recordCommentTime(userId: string) {
    this.lastCommentTimes.set(userId, Date.now());
  }

  public checkPostCooldown(userId: string): { allowed: boolean; remainingSeconds: number } {
    const config = this.getSecurityConfig();
    if (config.level >= 4) {
      return { allowed: false, remainingSeconds: -1 }; // 4단계 이상 게시물 작성 불가
    }
    if (config.level < 2) return { allowed: true, remainingSeconds: 0 };
    // 2단계 이상일 때 게시물 20초 타이머
    const last = this.lastPostTimes.get(userId) || 0;
    const elapsed = Date.now() - last;
    const cooldownMs = 20000; // 20초
    if (elapsed < cooldownMs) {
      return { allowed: false, remainingSeconds: Math.ceil((cooldownMs - elapsed) / 1000) };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  public recordPostTime(userId: string) {
    this.lastPostTimes.set(userId, Date.now());
  }

  // --- 민감함 태그 관리 (관리자 및 작성자) ---
  public togglePostSensitive(postId: string, userId: string): boolean {
    const user = this.state.users.find((u) => u.id === userId);
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return false;
    if (!user || (!user.isAdmin && post.authorId !== userId)) return false;

    post.isSensitive = !post.isSensitive;
    post.updatedAt = new Date().toISOString();

    if (user.isAdmin) {
      this.logAdminAction(
        userId,
        'POST_SENSITIVE_TOGGLE',
        'post',
        postId,
        `게시물 "${post.title}" 민감함(SENSITIVE) 태그 ${post.isSensitive ? '부여' : '해제'}`
      );
    }
    this.commit();

    return true;
  }

  // --- 투표 기능 (관리자 전용 생성 및 전 회원 투표) ---
  public addPollToPost(
    postId: string,
    adminId: string,
    question: string,
    options: string[]
  ): boolean {
    const admin = this.state.users.find((u) => u.id === adminId);
    if (!admin?.isAdmin) return false;
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return false;

    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) return false;

    post.poll = {
      id: `poll-${Date.now()}`,
      question: question.trim(),
      options: validOptions.map((opt, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        text: opt,
        votes: [],
      })),
      totalVotes: 0,
      createdAt: new Date().toISOString(),
    };
    post.updatedAt = new Date().toISOString();

    this.logAdminAction(
      adminId,
      'POST_POLL_CREATE',
      'post',
      postId,
      `게시물 "${post.title}"에 투표 등록: "${question}"`
    );
    this.commit();
    return true;
  }

  public votePoll(postId: string, optionId: string, userId: string): { success: boolean; error?: string } {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post || !post.poll) {
      return { success: false, error: '투표가 존재하지 않습니다.' };
    }
    if (post.poll.isClosed) {
      return { success: false, error: '마감된 투표입니다.' };
    }

    // 이미 투표했는지 검사
    const existingOpt = post.poll.options.find((opt) => opt.votes.includes(userId));
    if (existingOpt) {
      if (existingOpt.id === optionId) {
        return { success: false, error: '이미 해당 항목에 투표하셨습니다.' };
      }
      // 선택 변경 허용: 기존 표 차감
      existingOpt.votes = existingOpt.votes.filter((id) => id !== userId);
    } else {
      post.poll.totalVotes = (post.poll.totalVotes || 0) + 1;
    }

    const targetOpt = post.poll.options.find((opt) => opt.id === optionId);
    if (!targetOpt) {
      return { success: false, error: '선택 항목을 찾을 수 없습니다.' };
    }
    targetOpt.votes.push(userId);
    post.updatedAt = new Date().toISOString();

    this.commit();

    return { success: true };
  }


  /** 게시물 비밀등급 변경: 작성자는 최초 1회만, 이후 관리자만 변경 가능 */
  public setPostSecretGrade(postId: string, actorId: string, grade: 1 | 2 | 3 | 4 | 5): { success: boolean; error?: string } {
    const post = this.state.posts.find((p) => p.id === postId);
    const actor = this.state.users.find((u) => u.id === actorId);
    if (!post || !actor) return { success: false, error: '게시물 또는 회원을 찾을 수 없습니다.' };
    if (actor.isAdmin) {
      post.secretGrade = grade;
      post.secretGradeSetByAuthor = true;
      post.updatedAt = new Date().toISOString();
      this.logAdminAction(actorId, 'SECURITY_LEVEL_CHANGE', 'post', postId, `비밀등급을 ${grade}급으로 변경`);
      this.commit();
      if (isSupabaseConfigured && supabase) void supabase.from('posts').update({ secret_grade: grade, updated_at: post.updatedAt }).eq('id', postId).then(({ error }) => { if (error) console.error('비밀등급 변경 실패:', error.message); else void this.syncFromServer(); });
      return { success: true };
    }
    if (post.authorId !== actorId) return { success: false, error: '작성자만 최초 등급을 지정할 수 있습니다.' };
    if (post.secretGradeSetByAuthor) return { success: false, error: '작성자 등급 지정은 게시물당 1회만 가능합니다. 이후 변경은 관리자에게 요청하세요.' };
    post.secretGrade = grade;
    post.secretGradeSetByAuthor = true;
    post.updatedAt = new Date().toISOString();
    this.commit();
    return { success: true };
  }

  /** 보안인가: 3급=3~5급 열람, 2급=2~5급 열람, 1급=전체 열람 */
  public setUserSecurityClearance(targetUserId: string, adminId: string, clearance: 1 | 2 | 3): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!admin || !profile) return false;
    profile.securityClearance = clearance;
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'user', targetUserId, `보안인가 ${clearance}급 부여`);
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.rpc('admin_set_security_clearance', { target_user: targetUserId, new_clearance: clearance }).then(({ error }) => { if (error) console.error('인가 변경 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  public isCSReader(userId: string): boolean {
    return this.csReaderIds.has(userId);
  }

  public setCSReader(targetUserId: string, adminId: string, allowed: boolean): boolean {
    if (!this.isAdmin(adminId) || !this.state.users.some((u) => u.id === targetUserId)) return false;
    if (allowed) this.csReaderIds.add(targetUserId); else this.csReaderIds.delete(targetUserId);
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'user', targetUserId, `CS 열람 ${allowed ? '허용' : '회수'}`);
    this.commit();
    if (isSupabaseConfigured && supabase) void supabase.rpc('admin_set_cs_reader', { target_user: targetUserId, allowed }).then(({ error }) => { if (error) console.error('CS 열람 권한 변경 실패:', error.message); else void this.syncFromServer(); });
    return true;
  }

  // --- 서열(등급) 관리: 관리자가 직접 추가 / 수정 / 삭제 / 지급 / 해제 ---

  public getTiers(): CustomTier[] {
    return [...this.state.customTiers].sort((a, b) => a.level - b.level);
  }

  public adminUpsertTier(
    adminId: string,
    tier: CustomTier
  ): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };
    if (!tier.label.trim()) return { success: false, message: '서열 이름을 입력해 주세요.' };

    const dup = this.state.customTiers.find((t) => t.label === tier.label && t.id !== tier.id);
    if (dup) return { success: false, message: '이미 같은 이름의 서열이 존재합니다.' };

    const idx = this.state.customTiers.findIndex((t) => t.id === tier.id);
    if (idx >= 0) this.state.customTiers[idx] = tier;
    else this.state.customTiers.push(tier);

    applyTierConfig(this.state.customTiers);
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'post', tier.id, `서열 "${tier.label}" 추가/수정`);
    this.commit();

    if (isSupabaseConfigured && supabase) {
      void supabase
        .rpc('admin_upsert_tier', {
          p_id: tier.id,
          p_label: tier.label,
          p_level: tier.level,
          p_description: tier.description,
          p_badge_bg: tier.badgeBg,
          p_badge_border: tier.badgeBorder,
          p_text_color: tier.textColor,
          p_glow_color: tier.glowColor,
          p_icon_name: tier.iconName,
          p_auto_requirement: tier.autoRequirement || null,
          p_is_admin_only: !!tier.isAdminOnly,
          p_is_default: !!tier.isDefault,
        })
        .then(({ error }: any) => {
          if (error) console.error('서열 저장 실패:', error.message);
          else void this.syncFromServer();
        });
    }
    return { success: true };
  }

  public adminDeleteTier(adminId: string, tierId: string): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };
    const tier = this.state.customTiers.find((t) => t.id === tierId);
    if (!tier) return { success: false, message: '서열을 찾을 수 없습니다.' };
    if (this.state.customTiers.length <= 1) {
      return { success: false, message: '최소 1개 이상의 서열은 유지되어야 합니다.' };
    }

    const fallback =
      this.state.customTiers.find((t) => t.isDefault && t.id !== tierId) ||
      this.state.customTiers.find((t) => t.id !== tierId);
    const fallbackLabel = fallback?.label || '신입생';

    // 해당 서열을 보유한 회원은 대체 서열로 강등하고, 수동 지정 플래그를 해제합니다.
    this.state.profiles.forEach((p) => {
      if (p.tier === tier.label) {
        p.tier = fallbackLabel;
        p.tierManuallySet = false;
      }
    });

    this.state.customTiers = this.state.customTiers.filter((t) => t.id !== tierId);
    applyTierConfig(this.state.customTiers);
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'post', tierId, `서열 "${tier.label}" 삭제 (대체: ${fallbackLabel})`);
    this.commit();

    if (isSupabaseConfigured && supabase) {
      void supabase.rpc('admin_delete_tier', { p_id: tierId, p_fallback_label: fallbackLabel }).then(({ error }: any) => {
        if (error) console.error('서열 삭제 실패:', error.message);
        else void this.syncFromServer();
      });
    }
    return { success: true };
  }

  /** 관리자가 특정 요원에게 서열을 직접 임명(지급)합니다. 이후 활동량 기반 자동 재산정은 멈춥니다. */
  public adminGrantTier(adminId: string, targetUserId: string, tierLabel: string): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };
    if (!profile) return { success: false, message: '대상 회원을 찾을 수 없습니다.' };
    if (!this.state.customTiers.some((t) => t.label === tierLabel)) {
      return { success: false, message: '존재하지 않는 서열입니다.' };
    }

    profile.tier = tierLabel;
    profile.tierManuallySet = true;
    profile.updatedAt = new Date().toISOString();
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'user', targetUserId, `서열 "${tierLabel}" 직접 지급`);
    this.commit();

    if (isSupabaseConfigured && supabase) {
      void supabase.rpc('admin_grant_tier', { target_user: targetUserId, tier_label: tierLabel }).then(({ error }: any) => {
        if (error) console.error('서열 지급 실패:', error.message);
        else void this.syncFromServer();
      });
    }
    return { success: true, message: `"${profile.nickname}" 님에게 "${tierLabel}" 서열을 지급했습니다.` };
  }

  /** 수동 지정을 해제하여 활동량 기반 자동 서열 산정을 재개합니다. */
  public adminResetTier(adminId: string, targetUserId: string): { success: boolean; message?: string } {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    const user = this.state.users.find((u) => u.id === targetUserId);
    if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };
    if (!profile || !user) return { success: false, message: '대상 회원을 찾을 수 없습니다.' };

    profile.tierManuallySet = false;
    this.recalculateUserStats(targetUserId);
    this.logAdminAction(adminId, 'SECURITY_LEVEL_CHANGE', 'user', targetUserId, `서열 자동 재산정으로 복귀`);
    this.commit();

    if (isSupabaseConfigured && supabase) {
      void supabase.rpc('admin_reset_tier', { target_user: targetUserId }).then(({ error }: any) => {
        if (error) console.error('서열 초기화 실패:', error.message);
        else void this.syncFromServer();
      });
    }
    return { success: true };
  }

  public canReadPost(post: Post, viewerId?: string): boolean {
    if (!viewerId) return (post.secretGrade ?? 5) >= 4;
    const user = this.state.users.find((u) => u.id === viewerId);
    if (user?.isAdmin || post.authorId === viewerId) return true;
    const profile = this.state.profiles.find((p) => p.id === viewerId);
    const clearance = profile?.securityClearance ?? 3;
    const grade = post.secretGrade ?? 5;
    if (clearance === 1) return true;
    if (grade === 1) return this.csReaderIds.has(viewerId);
    if (clearance === 2) return grade >= 2;
    return grade >= 3;
  }

  /** 현재 구현은 세션 메타데이터만 제공. 비밀번호/인증 토큰 원문은 저장·노출하지 않음. */
  public adminDeleteUser(targetUserId: string, adminId: string): boolean {
    const admin = this.state.users.find((u) => u.id === adminId && u.isAdmin);
    const target = this.state.users.find((u) => u.id === targetUserId);
    if (!admin || !target || target.isAdmin || targetUserId === adminId) return false;
    this.state.users = this.state.users.filter((u) => u.id !== targetUserId);
    this.state.profiles = this.state.profiles.filter((p) => p.id !== targetUserId);
    this.state.userTitles = this.state.userTitles.filter((t) => t.userId !== targetUserId);
    this.state.posts = this.state.posts.filter((p) => p.authorId !== targetUserId);
    this.state.comments = this.state.comments.filter((c) => c.authorId !== targetUserId);
    this.state.likes = this.state.likes.filter((l) => l.userId !== targetUserId);
    this.state.views = this.state.views.filter((v) => v.userId !== targetUserId);
    this.logAdminAction(adminId, 'USER_WARNING', 'user', targetUserId, '회원 계정 삭제');
    if (this.currentUserId === targetUserId) this.logout();
    this.commit();
    if (isSupabaseConfigured && supabase) {
      void supabase.functions.invoke('admin-delete-user', { body: { targetUserId } })
        .then(({ error }) => { if (error) { console.error('계정 삭제 실패:', error.message); void this.syncFromServer(); } else void this.syncFromServer(); });
    }
    return true;
  }

  public getUserSessionInfo(_targetUserId: string): { tokenAvailable: false; message: string } {
    return { tokenAvailable: false, message: '현재 인증 구조에는 조회 가능한 로그인 토큰이 없습니다. 토큰 원문 대신 세션 목록·강제 로그아웃 기능을 확장할 수 있습니다.' };
  }

  public getTrashBinPosts(): Post[] {
    return this.state.posts.filter((p) => p.isDeleted);
  }

  public getTrashBinComments(): Comment[] {
    return this.state.comments.filter((c) => c.isDeleted);
  }

  private logAdminAction(
    adminId: string,
    actionType: AdminLog['actionType'],
    targetType: AdminLog['targetType'],
    targetId: string,
    details: string
  ) {
    const adminProfile = this.state.profiles.find((p) => p.id === adminId);
    this.state.adminLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminId,
      adminNickname: adminProfile?.nickname || '관리자',
      actionType,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 데모 데이터 전체 초기화
   */
  public resetToDefault() {
    this.state = generateInitialData();
    this.saveState(this.state);
    this.notifyListeners();
  }
}

export const db = new DatabaseService();
