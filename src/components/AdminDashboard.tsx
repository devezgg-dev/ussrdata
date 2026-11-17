import { EmblemLogo } from './EmblemLogo';
import { notify } from '../utils/notify';
import React, { useState, useEffect } from 'react';
import {
  AdminLog,
  Comment,
  CustomTier,
  Forum,
  ForumCategory,
  Post,
  SecurityConfig,
  SecurityLevel,
  Title,
  TrustLevel,
  UserAccount,
  UserProfile,
  Warning,
  TimeoutRecord,
} from '../types';
import { db } from '../services/db';
import { TierBadge } from './TierBadge';
import { TrustBadge } from './TrustBadge';
import {
  ShieldAlert,
  Users,
  UserCheck,
  FileText,
  MessageSquare,
  Award,
  Layers,
  History,
  Trash2,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Clock,
  Pin,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Search,
  Filter,
  Lock,
  Edit,
  Globe,
  Coffee,
  Terminal,
  Shield,
  Scale,
  HelpCircle,
  Share2,
  Sparkles,
  Megaphone,
  X,
} from 'lucide-react';

const FORUM_CATEGORIES: ForumCategory[] = [
  '공지 포럼',
  '자유 포럼',
  '정보 포럼',
  '토론 포럼',
  '질문 포럼',
  '공유 포럼',
];

const AVAILABLE_FORUM_ICONS = [
  { name: 'Terminal', label: '개발', icon: Terminal },
  { name: 'Shield', label: '보안/유출', icon: Shield },
  { name: 'Globe', label: '글로벌', icon: Globe },
  { name: 'Scale', label: '토론', icon: Scale },
  { name: 'Coffee', label: '라운지', icon: Coffee },
  { name: 'HelpCircle', label: 'Q&A', icon: HelpCircle },
  { name: 'Sparkles', label: '특수', icon: Sparkles },
  { name: 'Megaphone', label: '공지', icon: Megaphone },
  { name: 'Layers', label: '데이터', icon: Layers },
  { name: 'MessageSquare', label: '메시지', icon: MessageSquare },
];

const renderForumIcon = (iconName: string, size = 16) => {
  switch (iconName) {
    case 'Terminal':
      return <Terminal size={size} />;
    case 'Shield':
      return <Shield size={size} />;
    case 'Globe':
      return <Globe size={size} />;
    case 'Scale':
      return <Scale size={size} />;
    case 'Coffee':
      return <Coffee size={size} />;
    case 'HelpCircle':
      return <HelpCircle size={size} />;
    case 'Sparkles':
      return <Sparkles size={size} />;
    case 'Megaphone':
      return <Megaphone size={size} />;
    case 'MessageSquare':
      return <MessageSquare size={size} />;
    case 'Layers':
    default:
      return <Layers size={size} />;
  }
};

interface AdminDashboardProps {
  currentAdmin: UserProfile;
  onPostClick: (postId: string) => void;
  onAuthorClick: (userId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  onPostClick,
  onAuthorClick,
}) => {
  const [activeTab, setActiveTab] = useState<
    'approvals' | 'security' | 'users' | 'posts' | 'comments' | 'titles' | 'tiers' | 'forums' | 'logs'
  >('approvals');

  // 데이터 상태
  const [users, setUsers] = useState<{ user: UserAccount; profile: UserProfile }[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashComments, setTrashComments] = useState<Comment[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [tiers, setTiers] = useState<CustomTier[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => db.getSecurityConfig());

  // 보안조치 조작 모달 상태
  const [targetSecurityLevel, setTargetSecurityLevel] = useState<SecurityLevel | null>(null);
  const [securityPasswordModal, setSecurityPasswordModal] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState('');
  const [securityModalError, setSecurityModalError] = useState('');

  // 검색 및 필터
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'pending' | 'active' | 'timeout' | 'rejected'>('ALL');
  const [postSearch, setPostSearch] = useState('');
  const [logFilter, setLogFilter] = useState<string>('ALL');

  // 모달 상태들
  const [timeoutModalUser, setTimeoutModalUser] = useState<UserProfile | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(60); // 1시간
  const [timeoutReason, setTimeoutReason] = useState('');

  const [warningModalUser, setWarningModalUser] = useState<UserProfile | null>(null);
  const [warningReason, setWarningReason] = useState('');

  const [createTitleModal, setCreateTitleModal] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');
  const [newTitleColor, setNewTitleColor] = useState('#06b6d4');

  const [grantTitleModal, setGrantTitleModal] = useState(false);
  const [selectedUserForTitle, setSelectedUserForTitle] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState('');

  // 서열(등급) 관리 모달/폼 상태
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomTier | null>(null);
  const [tierFormLabel, setTierFormLabel] = useState('');
  const [tierFormLevel, setTierFormLevel] = useState(2);
  const [tierFormDesc, setTierFormDesc] = useState('');
  const [tierFormAdminOnly, setTierFormAdminOnly] = useState(false);
  const [tierFormReqPosts, setTierFormReqPosts] = useState<string>('');
  const [tierFormReqComments, setTierFormReqComments] = useState<string>('');

  const [grantTierModal, setGrantTierModal] = useState(false);
  const [selectedUserForTier, setSelectedUserForTier] = useState('');
  const [selectedTierLabel, setSelectedTierLabel] = useState('');

  const [inspectBirthDateUser, setInspectBirthDateUser] = useState<string | null>(null);
  const [birthDatePurpose, setBirthDatePurpose] = useState('');
  const [revealedBirthDate, setRevealedBirthDate] = useState<string | null>(null);

  // 포럼 관리 모달 상태 (추가 / 수정 / 삭제)
  const [showCreateForumModal, setShowCreateForumModal] = useState(false);
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [forumFormName, setForumFormName] = useState('');
  const [forumFormCategory, setForumFormCategory] = useState<ForumCategory>('자유 포럼');
  const [forumFormIcon, setForumFormIcon] = useState('MessageSquare');
  const [forumFormDesc, setForumFormDesc] = useState('');
  const [forumFormRules, setForumFormRules] = useState('');
  const [forumFormBanner, setForumFormBanner] = useState('');
  const [forumFormIsPublic, setForumFormIsPublic] = useState(true);
  const [forumFormOwnerId, setForumFormOwnerId] = useState('');
  const [forumFormError, setForumFormError] = useState('');

  const handleDeleteAccount = (userId: string, nickname: string) => {
    if (!window.confirm(`"${nickname}" 계정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    if (db.adminDeleteUser(userId, currentAdmin.id)) refreshAll();
  };

  const handleSetClearance = (userId: string, clearance: 1 | 2 | 3) => {
    if (db.setUserSecurityClearance(userId, currentAdmin.id, clearance)) refreshAll();
  };

  const refreshAll = () => {
    setUsers(db.getAllUsers());
    setPosts(db.getPosts({ includeDeleted: false }));
    setTrashPosts(db.getTrashBinPosts());
    setTrashComments(db.getTrashBinComments());
    setTitles(db.getTitles());
    setTiers(db.getTiers());
    setForums(db.getAllForumsAdmin());
    setLogs(db.getAdminLogs());
    setSecurityConfig(db.getSecurityConfig());
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // --- 보안조치 단계 변경 핸들러 ---
  const handleSelectSecurityLevel = (level: SecurityLevel) => {
    const currentLevel = securityConfig.level;
    if (level === currentLevel) return;

    // 하향 및 해제(또는 1단계 평상시로 복귀) 시에는 반드시 비밀번호 요구 모달 오픈
    if (level < currentLevel || (currentLevel > 1 && level === 1)) {
      setTargetSecurityLevel(level);
      setSecurityPasswordInput('');
      setSecurityModalError('');
      setSecurityPasswordModal(true);
    } else {
      if (
        confirm(
          `[보안경보 상향] 현재 ${currentLevel}단계에서 ${level}단계로 즉시 상향 발령하시겠습니까?`
        )
      ) {
        const res = db.setSecurityLevel(level, currentAdmin.id);
        if (res.success) {
          refreshAll();
        } else {
          notify(res.error || '보안조치 발령에 실패했습니다.');
        }
      }
    }
  };

  const handleSecurityPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSecurityLevel) return;

    const res = db.setSecurityLevel(targetSecurityLevel, currentAdmin.id);
    if (res.success) {
      setSecurityPasswordModal(false);
      setSecurityPasswordInput('');
      setSecurityModalError('');
      refreshAll();
    } else {
      setSecurityModalError(res.error || '비밀번호가 일치하지 않습니다.');
    }
  };

  // --- 회원 관리 핸들러 ---
  const handleTimeoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeoutModalUser || !timeoutReason.trim()) return;

    db.adminTimeoutUser(timeoutModalUser.id, currentAdmin.id, timeoutMinutes, timeoutReason.trim());
    setTimeoutModalUser(null);
    setTimeoutReason('');
    refreshAll();
  };

  const handleUntimeout = (userId: string) => {
    db.adminUntimeoutUser(userId, currentAdmin.id);
    refreshAll();
  };

  const handleWarningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningModalUser || !warningReason.trim()) return;

    db.adminWarnUser(warningModalUser.id, currentAdmin.id, warningReason.trim());
    setWarningModalUser(null);
    setWarningReason('');
    refreshAll();
  };

  const handleToggleAdminRole = (userId: string) => {
    if (userId === currentAdmin.id) {
      notify('본인의 관리자 권한을 스스로 해제할 수 없습니다.');
      return;
    }
    if (confirm('해당 회원의 관리자 권한을 전환하시겠습니까?')) {
      db.adminToggleRole(userId, currentAdmin.id);
      refreshAll();
    }
  };

  const handleApproveUser = (userId: string) => {
    const res = db.approveUser(userId, currentAdmin.id);
    if (res.success) {
      notify(res.message);
      refreshAll();
    } else {
      notify(res.message || '가입 승인 처리에 실패했습니다.');
    }
  };

  const handleRejectUser = (userId: string) => {
    const reason = prompt('가입 반려 사유를 입력해 주세요 (선택사항):', '관리자 심사 미승인');
    if (reason === null) return;
    const res = db.rejectUser(userId, currentAdmin.id, reason);
    if (res.success) {
      notify(res.message);
      refreshAll();
    } else {
      notify(res.message || '가입 반려 처리에 실패했습니다.');
    }
  };

  // 생년월일 열람 요청 (엄격한 목적 기록 필수)
  const handleInspectBirthDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectBirthDateUser || !birthDatePurpose.trim()) return;

    const acc = db.getUserAccountForAdmin(inspectBirthDateUser, currentAdmin.id, birthDatePurpose.trim());
    if (acc) {
      setRevealedBirthDate(
        `${acc.birthDate.year}년 ${acc.birthDate.month}월 ${acc.birthDate.day}일`
      );
    }
    refreshAll();
  };

  // --- 게시물 핸들러 ---
  const handleRestorePost = (postId: string) => {
    db.restorePost(postId, currentAdmin.id);
    refreshAll();
  };

  const handlePermanentDeletePost = (postId: string) => {
    if (confirm('이 게시물을 데이터베이스에서 영구 삭제하시겠습니까? 복구할 수 없습니다.')) {
      db.permanentDeletePost(postId, currentAdmin.id);
      refreshAll();
    }
  };

  const handleRestoreComment = (commentId: string) => {
    db.restoreComment(commentId, currentAdmin.id);
    refreshAll();
  };

  // --- 칭호 핸들러 ---
  const handleCreateTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleName.trim() || !newTitleDesc.trim()) return;

    db.createTitle({
      name: newTitleName.trim(),
      description: newTitleDesc.trim(),
      color: newTitleColor,
      icon: 'Award',
      isAdminOnly: false,
      adminId: currentAdmin.id,
    });

    setCreateTitleModal(false);
    setNewTitleName('');
    setNewTitleDesc('');
    refreshAll();
  };

  const handleGrantTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForTitle || !selectedTitleId) return;

    db.grantTitleToUser(selectedTitleId, selectedUserForTitle, currentAdmin.id);
    setGrantTitleModal(false);
    refreshAll();
  };

  const handleRevokeTitle = (titleId: string, userId: string) => {
    if (confirm('이 회원에게서 해당 칭호를 회수하시겠습니까?')) {
      db.revokeTitleFromUser(titleId, userId, currentAdmin.id);
      refreshAll();
    }
  };

  // --- 서열(등급) 관리 핸들러 ---
  const openCreateTierForm = () => {
    setEditingTier(null);
    setTierFormLabel('');
    setTierFormLevel((tiers.reduce((max, t) => (t.isAdminOnly ? max : Math.max(max, t.level)), 0) || 0) + 1);
    setTierFormDesc('');
    setTierFormAdminOnly(false);
    setTierFormReqPosts('');
    setTierFormReqComments('');
    setTierFormOpen(true);
  };

  const openEditTierForm = (tier: CustomTier) => {
    setEditingTier(tier);
    setTierFormLabel(tier.label);
    setTierFormLevel(tier.level);
    setTierFormDesc(tier.description);
    setTierFormAdminOnly(!!tier.isAdminOnly);
    setTierFormReqPosts(tier.autoRequirement?.posts?.toString() || '');
    setTierFormReqComments(tier.autoRequirement?.comments?.toString() || '');
    setTierFormOpen(true);
  };

  const handleSubmitTierForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierFormLabel.trim()) return;

    const palette = [
      { badgeBg: 'bg-red-950/70', badgeBorder: 'border-red-700/70', textColor: 'text-red-400', glowColor: 'rgba(239,68,68,0.25)' },
      { badgeBg: 'bg-amber-950/80', badgeBorder: 'border-amber-500', textColor: 'text-amber-400', glowColor: 'rgba(245,158,11,0.4)' },
      { badgeBg: 'bg-sky-950/70', badgeBorder: 'border-sky-600/70', textColor: 'text-sky-300', glowColor: 'rgba(14,165,233,0.3)' },
      { badgeBg: 'bg-violet-950/70', badgeBorder: 'border-violet-600/70', textColor: 'text-violet-300', glowColor: 'rgba(139,92,246,0.3)' },
    ];
    const colors = editingTier
      ? { badgeBg: editingTier.badgeBg, badgeBorder: editingTier.badgeBorder, textColor: editingTier.textColor, glowColor: editingTier.glowColor }
      : palette[tiers.length % palette.length];

    const tier: CustomTier = {
      id: editingTier?.id || `tier-${Date.now()}`,
      label: tierFormLabel.trim(),
      level: tierFormAdminOnly ? 99 : Number(tierFormLevel) || 1,
      description: tierFormDesc.trim(),
      iconName: editingTier?.iconName || 'Star',
      isAdminOnly: tierFormAdminOnly,
      isDefault: editingTier?.isDefault || false,
      autoRequirement:
        !tierFormAdminOnly && (tierFormReqPosts || tierFormReqComments)
          ? {
              posts: tierFormReqPosts ? Number(tierFormReqPosts) : undefined,
              comments: tierFormReqComments ? Number(tierFormReqComments) : undefined,
            }
          : undefined,
      ...colors,
    };

    const res = db.adminUpsertTier(currentAdmin.id, tier);
    if (res.success) {
      setTierFormOpen(false);
      refreshAll();
    } else {
      notify(res.message || '서열 저장에 실패했습니다.');
    }
  };

  const handleDeleteTier = (tier: CustomTier) => {
    if (tier.isDefault) {
      notify('기본(신입) 서열은 삭제할 수 없습니다. 먼저 다른 서열을 기본으로 지정해 주세요.');
      return;
    }
    if (!confirm(`"${tier.label}" 서열을 영구 삭제할까요?\n이 서열을 보유한 모든 요원은 자동으로 기본 서열로 강등됩니다.`)) return;
    const res = db.adminDeleteTier(currentAdmin.id, tier.id);
    if (res.success) refreshAll();
    else notify(res.message || '서열 삭제에 실패했습니다.');
  };

  const handleGrantTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForTier || !selectedTierLabel) return;
    const res = db.adminGrantTier(currentAdmin.id, selectedUserForTier, selectedTierLabel);
    if (res.success) {
      notify(res.message || '서열을 지급했습니다.', 'success');
      setGrantTierModal(false);
      refreshAll();
    } else {
      notify(res.message || '서열 지급에 실패했습니다.');
    }
  };

  const handleResetTier = (userId: string) => {
    if (!confirm('수동 지정을 해제하고 활동량 기반 자동 서열 산정으로 되돌릴까요?')) return;
    const res = db.adminResetTier(currentAdmin.id, userId);
    if (res.success) refreshAll();
    else notify(res.message || '초기화에 실패했습니다.');
  };

  const handleDeleteTitle = (titleId: string) => {
    const title = titles.find((t) => t.id === titleId);
    if (!title) return;

    if (
      confirm(
        `"${title.name}" 칭호를 데이터베이스에서 영구 삭제하시겠습니까?\n이 칭호를 부여받은 모든 회원의 보유 목록에서도 즉시 삭제됩니다.`
      )
    ) {
      db.deleteTitle(titleId, currentAdmin.id);
      refreshAll();
    }
  };

  // --- 포럼 관리 핸들러 (추가, 수정, 폐쇄, 복구, 영구 삭제) ---
  const resetForumForm = () => {
    setForumFormName('');
    setForumFormCategory('자유 포럼');
    setForumFormIcon('MessageSquare');
    setForumFormDesc('');
    setForumFormRules('');
    setForumFormBanner('');
    setForumFormIsPublic(true);
    setForumFormOwnerId(currentAdmin.id);
    setForumFormError('');
  };

  const openCreateForumModal = () => {
    resetForumForm();
    setShowCreateForumModal(true);
  };

  const openEditForumModal = (forum: Forum) => {
    setEditingForum(forum);
    setForumFormName(forum.name);
    setForumFormCategory(forum.category);
    setForumFormIcon(forum.icon);
    setForumFormDesc(forum.description);
    setForumFormRules(forum.rules || '');
    setForumFormBanner(forum.bannerUrl || '');
    setForumFormIsPublic(forum.isPublic);
    setForumFormOwnerId(forum.ownerId);
    setForumFormError('');
  };

  const handleCreateForumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumFormName.trim()) {
      setForumFormError('포럼 이름을 입력해 주세요.');
      return;
    }
    if (!forumFormDesc.trim()) {
      setForumFormError('포럼 설명을 입력해 주세요.');
      return;
    }

    db.createForum({
      name: forumFormName.trim(),
      description: forumFormDesc.trim(),
      category: forumFormCategory,
      icon: forumFormIcon,
      bannerUrl: forumFormBanner.trim() || undefined,
      isPublic: forumFormIsPublic,
      rules: forumFormRules.trim() || '상호 존중 및 실명/이메일 배제 정책 준수',
      ownerId: forumFormOwnerId || currentAdmin.id,
      adminId: currentAdmin.id,
    });

    setShowCreateForumModal(false);
    resetForumForm();
    refreshAll();
  };

  const handleEditForumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForum) return;
    if (!forumFormName.trim()) {
      setForumFormError('포럼 이름을 입력해 주세요.');
      return;
    }
    if (!forumFormDesc.trim()) {
      setForumFormError('포럼 설명을 입력해 주세요.');
      return;
    }

    db.updateForum(
      editingForum.id,
      {
        name: forumFormName.trim(),
        description: forumFormDesc.trim(),
        category: forumFormCategory,
        icon: forumFormIcon,
        bannerUrl: forumFormBanner.trim(),
        isPublic: forumFormIsPublic,
        rules: forumFormRules.trim(),
        ownerId: forumFormOwnerId,
      },
      currentAdmin.id
    );

    setEditingForum(null);
    resetForumForm();
    refreshAll();
  };

  const handleDeleteForum = (forumId: string, permanent: boolean) => {
    const forum = forums.find((f) => f.id === forumId);
    if (!forum) return;

    if (permanent) {
      if (
        confirm(
          `⚠️ [주의] "${forum.name}" 포럼을 데이터베이스에서 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
        )
      ) {
        db.deleteForum(forumId, currentAdmin.id, true);
        refreshAll();
      }
    } else {
      if (
        confirm(
          `"${forum.name}" 포럼을 폐쇄(비활성화)하시겠습니까?\n일반 회원에게 비공개 숨김 처리됩니다.`
        )
      ) {
        db.deleteForum(forumId, currentAdmin.id, false);
        refreshAll();
      }
    }
  };

  const handleRestoreForum = (forumId: string) => {
    db.restoreForum(forumId, currentAdmin.id);
    refreshAll();
  };

  const pendingUsers = users.filter((u) => u.user.status === 'pending');

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.profile.nickname.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (userStatusFilter === 'ALL') return true;
    return u.user.status === userStatusFilter;
  });

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    return l.actionType === logFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Dashboard Header */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-600/40 rounded-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <EmblemLogo size={56} className="w-14 h-14 rounded-2xl border-2 border-red-700/70 shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  인민정보국 정치국 통제실
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600">
                  ADMIN PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                회원 권한, 게시물 및 휴지통 복구, 신뢰도 감사, 칭호 지급, 시스템 감사 로그를 통합 관리합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => db.resetToDefault()}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
            >
              기본 데이터 리셋
            </button>
            <button
              onClick={refreshAll}
              className="px-3.5 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw size={13} />
              새로고침
            </button>
          </div>
        </div>

        {/* Dashboard Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-800/80 text-xs">
          <div
            onClick={() => setActiveTab('approvals')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              pendingUsers.length > 0
                ? 'bg-amber-950/60 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-900/60'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-amber-400 font-bold flex items-center gap-1">
              <UserCheck size={12} />
              가입 승인 대기
            </div>
            <div className="text-lg font-black text-amber-300 mt-0.5">{pendingUsers.length}명</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">총 등록 회원</div>
            <div className="text-lg font-bold text-white mt-0.5">{users.length}명</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">활성 게시물</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{posts.length}개</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">삭제 보관함 (휴지통)</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{trashPosts.length}개</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">관리자 감사 로그</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{logs.length}건</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">개설된 포럼</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{forums.length}개</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2 text-xs font-bold">
        {[
          {
            id: 'approvals',
            label: '가입 승인 대기',
            icon: UserCheck,
            count: pendingUsers.length,
            isAlert: pendingUsers.length > 0,
          },
          {
            id: 'security',
            label: '보안조치 (DEFCON)',
            icon: ShieldAlert,
            count: `${securityConfig.level}단계`,
            isAlert: securityConfig.level >= 2,
          },
          { id: 'users', label: '회원 관리', icon: Users, count: users.length },
          { id: 'posts', label: '게시물 및 휴지통', icon: FileText, count: trashPosts.length },
          { id: 'comments', label: '댓글 관리', icon: MessageSquare, count: trashComments.length },
          { id: 'titles', label: '칭호 관리', icon: Award, count: titles.length },
          { id: 'tiers', label: '서열 관리', icon: Shield, count: tiers.length },
          { id: 'forums', label: '포럼 관리', icon: Layers, count: forums.length },
          { id: 'logs', label: '관리 기록 (Audit)', icon: History, count: logs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : tab.isAlert
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/70 hover:bg-amber-900/70'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon size={14} className={tab.isAlert && !isActive ? 'text-amber-400 animate-pulse' : ''} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    tab.isAlert && !isActive
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950/80'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 탭: 가입 승인 대기 관리 */}
      {activeTab === 'approvals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck size={18} className="text-amber-400" />
                  <span>회원가입 승인 대기 목록</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                신원 조회를 통과하고 정치국이 승인한 요원만 인민정보국에 로그인할 수 있습니다.
              </p>
            </div>

            <div className="text-xs text-amber-300 bg-amber-950/70 border border-amber-600/50 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <Clock size={13} />
              <span>승인 대기: {pendingUsers.length}명</span>
            </div>
          </div>

          {pendingUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="py-2.5 px-3">가입 신청 가명</th>
                    <th className="py-2.5 px-3">임시 등급</th>
                    <th className="py-2.5 px-3">가입 신청 일시</th>
                    <th className="py-2.5 px-3">상태</th>
                    <th className="py-2.5 px-3 text-right">가입 심사 조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {pendingUsers.map(({ user, profile }) => (
                    <tr key={user.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={profile.nickname}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{profile.nickname}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-700 font-mono">
                                가입 대기
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <TierBadge tier={profile.tier} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-600/60 font-semibold text-[11px]">
                          <Clock size={11} />
                          승인 대기 중
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveUser(user.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                          >
                            <CheckCircle size={13} />
                            <span>가입 승인</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectUser(user.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold text-xs transition-all cursor-pointer"
                          >
                            <XCircle size={13} />
                            <span>반려</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <CheckCircle size={32} className="text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">현재 대기 중인 가입 신청이 없습니다</h4>
              <p className="text-xs text-slate-400">
                새로운 회원이 가입을 신청하면 이곳에 즉시 등록되어 관리자의 승인을 기다립니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 탭: 보안조치 (DEFCON / Security Levels) */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 sm:p-6 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full animate-ping ${
                    securityConfig.level === 1
                      ? 'bg-emerald-500'
                      : securityConfig.level === 2
                      ? 'bg-amber-400'
                      : securityConfig.level === 3
                      ? 'bg-orange-500'
                      : securityConfig.level === 4
                      ? 'bg-rose-500'
                      : 'bg-purple-600'
                  }`}
                />
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert
                    size={20}
                    className={
                      securityConfig.level === 1
                        ? 'text-emerald-400'
                        : securityConfig.level === 2
                        ? 'text-amber-400'
                        : securityConfig.level === 3
                        ? 'text-orange-400'
                        : securityConfig.level === 4
                        ? 'text-rose-400'
                        : 'text-purple-400'
                    }
                  />
                  <span>보안조치 경보 관제 (Security DEFCON)</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                사이트 내 보안 위기 상황 발생 시 단계별 비상 대응 조치를 즉시 발령하거나 하향 해제할 수 있습니다.
              </p>
            </div>

            {/* 현재 활성화 상태 배지 */}
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 shrink-0 ${
                securityConfig.level === 1
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : securityConfig.level === 2
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                  : securityConfig.level === 3
                  ? 'bg-orange-950/60 border-orange-500/60 text-orange-300'
                  : securityConfig.level === 4
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                  : 'bg-purple-950/80 border-purple-500/80 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              }`}
            >
              <div className="text-right">
                <div className="text-[10px] text-slate-400">현재 발령 등급</div>
                <div className="text-sm font-extrabold">{securityConfig.level}단계 발령 중</div>
              </div>
            </div>
          </div>

          {/* 5단계 보안조치 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* 1단계 평상시 */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                securityConfig.level === 1
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-950/70 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    1단계
                  </span>
                  {securityConfig.level === 1 && (
                    <span className="text-[10px] text-emerald-400 font-bold">● 현재 적용</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">평상시</h4>
                <p className="text-xs text-slate-300 font-semibold">평소 상태 (정상 가동)</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  모든 게시물과 댓글 작성이 자유로우며, 방문자 및 회원이 규정에 따라 이용 가능합니다.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={securityConfig.level === 1}
                  onClick={() => handleSelectSecurityLevel(1)}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                >
                  {securityConfig.level === 1 ? '적용 중' : '1단계로 정상화 (해제)'}
                </button>
              </div>
            </div>

            {/* 2단계 긴장 */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                securityConfig.level === 2
                  ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/70 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    2단계
                  </span>
                  {securityConfig.level === 2 && (
                    <span className="text-[10px] text-amber-400 font-bold">● 현재 적용</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">긴장</h4>
                <p className="text-xs text-amber-300 font-semibold">
                  댓글 10초 타이머 / 게시물 20초 타이머
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  도배 및 빠른 유출 루머 확산을 제어하기 위해 회원별 댓글(10초) 및 게시물(20초) 쿨다운이 강제 적용됩니다.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={securityConfig.level === 2}
                  onClick={() => handleSelectSecurityLevel(2)}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                >
                  {securityConfig.level === 2 ? '적용 중' : '2단계 발령'}
                </button>
              </div>
            </div>

            {/* 3단계 긴급 */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                securityConfig.level === 3
                  ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-950/70 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                    3단계
                  </span>
                  {securityConfig.level === 3 && (
                    <span className="text-[10px] text-orange-400 font-bold">● 현재 적용</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">긴급</h4>
                <p className="text-xs text-orange-300 font-semibold">비회원 사이트 접근 전면 차단</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  비회원은 사이트 열람이 전면 금지되며 "보안조치 안내: 비회원은 사이트 접근이 불가합니다" 차단 화면이 노출됩니다.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={securityConfig.level === 3}
                  onClick={() => handleSelectSecurityLevel(3)}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                >
                  {securityConfig.level === 3 ? '적용 중' : '3단계 발령'}
                </button>
              </div>
            </div>

            {/* 4단계 유출감지 */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                securityConfig.level === 4
                  ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'bg-slate-950/70 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    4단계
                  </span>
                  {securityConfig.level === 4 && (
                    <span className="text-[10px] text-rose-400 font-bold">● 현재 적용</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">유출감지</h4>
                <p className="text-xs text-rose-300 font-semibold">
                  민감함 태그 열람 불가 & 게시물 작성 금지
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  [민감함] 태그 게시물 조회가 잠금 처리되며, 신규 게시물 등록이 차단됩니다 (2·3단계 조치 포함).
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={securityConfig.level === 4}
                  onClick={() => handleSelectSecurityLevel(4)}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                >
                  {securityConfig.level === 4 ? '적용 중' : '4단계 발령'}
                </button>
              </div>
            </div>

            {/* 5단계 전부 유출 */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                securityConfig.level === 5
                  ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-950/70 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    5단계
                  </span>
                  {securityConfig.level === 5 && (
                    <span className="text-[10px] text-purple-400 font-bold">● 현재 적용</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">전부 유출</h4>
                <p className="text-xs text-purple-300 font-semibold">
                  전체 게시물 열람 전면 차단 (제목/내용 마스킹)
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  사이트 전체 게시물의 제목과 내용이 "보안조치로 인하여 열람 불가"로 은폐 처리됩니다 (2·3·4단계 조치 모두 통합).
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={securityConfig.level === 5}
                  onClick={() => handleSelectSecurityLevel(5)}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                >
                  {securityConfig.level === 5 ? '적용 중' : '5단계 비상 발령'}
                </button>
              </div>
            </div>
          </div>

          {/* 안내 규정 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Lock size={13} className="text-amber-400" />
              <span>보안조치 해제/하향 보안 규정</span>
            </div>
            <p>
              보안 경보 등급을 상향 발령할 때는 즉시 발령되나, 경보를 하향 조정하거나 1단계 평상시로 해제할 때는{' '}
              <strong>지정된 보안 해제 비밀번호</strong>를 정확히 입력해야만 변경이 승인됩니다.
            </p>
          </div>
        </div>
      )}

      {/* 탭 1: 회원 관리 */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="가명 닉네임 검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* 상태 필터 태그들 */}
              <div className="flex items-center gap-1 text-[11px] bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'ALL', label: '전체', count: users.length },
                    { id: 'pending', label: '승인 대기', count: pendingUsers.length },
                    { id: 'active', label: '정상 활동', count: users.filter((u) => u.user.status === 'active').length },
                    { id: 'timeout', label: '타임아웃', count: users.filter((u) => u.user.status === 'timeout').length },
                    { id: 'rejected', label: '반려됨', count: users.filter((u) => u.user.status === 'rejected').length },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setUserStatusFilter(st.id)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      userStatusFilter === st.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label} ({st.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              총 <strong>{filteredUsers.length}</strong>명의 회원 표시 중
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-2.5 px-3">가명 닉네임</th>
                  <th className="py-2.5 px-3">회원 칭호(등급)</th>
                  <th className="py-2.5 px-3">활동량 (글/댓글/방문)</th>
                  <th className="py-2.5 px-3">계정 상태</th>
                  <th className="py-2.5 px-3">가입일</th>
                  <th className="py-2.5 px-3 text-right">관리 조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.map(({ user, profile }) => (
                  <tr key={user.id} className="hover:bg-slate-950/40">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={profile.nickname}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <div
                            onClick={() => onAuthorClick(user.id)}
                            className="font-bold text-slate-100 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                          >
                            <span>{profile.nickname}</span>
                            {user.isAdmin && (
                              <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded border border-amber-600/40">
                                관리자
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {user.id.substring(0, 12)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <TierBadge tier={profile.tier} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {profile.postCount} / {profile.commentCount} / {profile.visitedPostCount}
                    </td>
                    <td className="py-3 px-3">
                      {user.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/60 font-semibold flex items-center gap-1 w-max">
                          <Clock size={11} />
                          승인 대기 중
                        </span>
                      ) : user.status === 'rejected' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-600/60 font-semibold flex items-center gap-1 w-max">
                          <XCircle size={11} />
                          가입 반려
                        </span>
                      ) : user.status === 'timeout' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/60 font-semibold flex items-center gap-1 w-max">
                          <Clock size={11} />
                          타임아웃 ({user.timeoutUntil ? new Date(user.timeoutUntil).toLocaleTimeString() : ''})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/60 font-semibold">
                          정상 활동
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {user.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveUser(user.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                            >
                              가입 승인
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectUser(user.id)}
                              className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] cursor-pointer"
                            >
                              반려
                            </button>
                          </>
                        ) : user.status === 'rejected' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveUser(user.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            재승인
                          </button>
                        ) : (
                          <>
                            {user.status === 'timeout' ? (
                              <button
                                onClick={() => handleUntimeout(user.id)}
                                className="px-2 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700"
                              >
                                타임아웃 해제
                              </button>
                            ) : (
                              <button
                                onClick={() => setTimeoutModalUser(profile)}
                                className="px-2 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-700/60 hover:bg-amber-900/60"
                              >
                                타임아웃
                              </button>
                            )}

                            <button
                              onClick={() => setWarningModalUser(profile)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                            >
                              경고 발송
                            </button>

                            <button
                              onClick={() => {
                                setInspectBirthDateUser(user.id);
                                setRevealedBirthDate(null);
                                setBirthDatePurpose('');
                              }}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-cyan-300"
                              title="생년월일 보안 열람 (목적 기록 필수)"
                            >
                              <Lock size={13} />
                            </button>

                            <button
                              onClick={() => handleToggleAdminRole(user.id)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                                user.isAdmin
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                              }`}
                            >
                              {user.isAdmin ? '권한 회수' : '관리자 임명'}
                            </button>
                            <select
                              aria-label="보안인가 등급"
                              value={profile.securityClearance ?? 3}
                              onChange={(e) => handleSetClearance(user.id, Number(e.target.value) as 1 | 2 | 3)}
                              className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-300"
                              title="보안인가: 3급은 3~5급, 2급은 2~5급, 1급은 전체 열람"
                            >
                              <option value={3}>인가 3급</option>
                              <option value={2}>인가 2급</option>
                              <option value={1}>인가 1급</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => { if (db.setCSReader(user.id, currentAdmin.id, !db.isCSReader(user.id))) refreshAll(); }}
                              className={`px-2 py-1 rounded text-[11px] font-semibold border ${db.isCSReader(user.id) ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                              title="CS 등급 게시물 열람 권한 부여 또는 회수"
                            >
                              {db.isCSReader(user.id) ? 'CS 열람 허용' : 'CS 열람 지정'}
                            </button>
                            <button
                              type="button"
                              onClick={() => notify(db.getUserSessionInfo(user.id).message)}
                              className="px-2 py-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700"
                              title="인증 세션 정보"
                            >
                              세션/토큰
                            </button>
                            {!user.isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(user.id, profile.nickname)}
                                className="px-2 py-1 rounded bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900"
                              >
                                계정 삭제
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 2: 게시물 및 휴지통(보관함) 관리 */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* 휴지통 (소프트 삭제된 게시물) */}
          <div className="bg-slate-900 border border-rose-800/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <Trash2 size={18} />
              <span>게시물 휴지통 (삭제 보관함) - {trashPosts.length}개</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              사용자 또는 관리자가 삭제한 게시물은 즉시 영구 삭제되지 않고 여기에 보관됩니다. 관리자는 삭제 사유와 작성자를 확인하고 복구하거나 영구 파기할 수 있습니다.
            </p>

            {trashPosts.length > 0 ? (
              <div className="space-y-2">
                {trashPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-100">{post.title}</span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px]">
                          삭제됨
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        작성자: <strong>{post.authorNickname}</strong> | 삭제 일시:{' '}
                        {post.deletedAt ? new Date(post.deletedAt).toLocaleString() : ''} | 사유:{' '}
                        <span className="text-slate-300">{post.deletedReason || '미지정'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestorePost(post.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 font-semibold"
                      >
                        <RotateCcw size={12} /> 복구하기
                      </button>
                      <button
                        onClick={() => handlePermanentDeletePost(post.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700 hover:bg-rose-900 font-semibold"
                      >
                        <Trash2 size={12} /> 영구 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                휴지통이 비어 있습니다.
              </div>
            )}
          </div>

          {/* 전체 활성 게시물 목록 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              <span>활성 게시물 관리</span>
            </h3>

            <div className="space-y-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-700"
                >
                  <div
                    onClick={() => onPostClick(post.id)}
                    className="cursor-pointer hover:text-cyan-300 transition-colors flex-1"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {post.isPinned && <Pin size={11} className="text-indigo-400 rotate-45" />}
                      <span className="font-bold text-slate-200">{post.title}</span>
                      <TrustBadge level={post.trustLevel} size="sm" />
                      {post.isSensitive && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-bold flex items-center gap-0.5">
                          <ShieldAlert size={10} className="text-rose-400" />
                          민감함
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      [{post.forumName}] 작성자: {post.authorNickname} • 조회 {post.viewCount} • 댓글 {post.commentCount}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        db.togglePostSensitive(post.id, currentAdmin.id);
                        refreshAll();
                      }}
                      className={`px-2 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                        post.isSensitive
                          ? 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900/60'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-600'
                      }`}
                      title="민감함 태그 부여/해제 (보안 4단계 시 차단)"
                    >
                      <ShieldAlert size={11} className={post.isSensitive ? 'text-rose-400' : 'text-amber-400'} />
                      <span>{post.isSensitive ? '민감함 해제' : '민감함 부착'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        db.togglePin(post.id, currentAdmin.id);
                        refreshAll();
                      }}
                      className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
                    >
                      {post.isPinned ? '고정해제' : '고정'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        db.softDeletePost(post.id, currentAdmin.id, '관리자 직접 삭제');
                        refreshAll();
                      }}
                      className="px-2 py-1 bg-rose-950/60 text-rose-300 border border-rose-800 rounded hover:bg-rose-900 cursor-pointer"
                    >
                      휴지통 이동
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 댓글 관리 및 복구 */}
      {activeTab === 'comments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              <span>삭제된 댓글 복구 및 관리</span>
            </h3>
          </div>

          {trashComments.length > 0 ? (
            <div className="space-y-2">
              {trashComments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="text-slate-300 font-semibold mb-1">
                      {comment.authorNickname}: "{comment.content}"
                    </div>
                    <div className="text-[11px] text-slate-500">
                      삭제 일시: {comment.deletedAt ? new Date(comment.deletedAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreComment(comment.id)}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 font-semibold"
                  >
                    <RotateCcw size={12} /> 댓글 복구
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              삭제된 댓글이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 탭 4: 칭호 관리 */}
      {activeTab === 'titles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <span>커뮤니티 칭호 관리 및 수여</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                관리자는 새로운 칭호를 생성하고 특정 회원에게 수여하거나 회수할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateTitleModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
              >
                <Plus size={13} /> 새 칭호 생성
              </button>
              <button
                onClick={() => setGrantTitleModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
              >
                <Award size={13} /> 회원에게 칭호 지급
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {titles.map((title) => (
              <div
                key={title.id}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: title.color }}>
                    <Award size={15} />
                    <span>{title.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {title.isAdminOnly && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        관리자 전용
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteTitle(title.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="칭호 영구 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{title.description}</p>
                <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>생성일: {new Date(title.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDeleteTitle(title.id)}
                    className="text-rose-400 hover:underline cursor-pointer text-[10px] font-semibold"
                  >
                    칭호 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tiers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield size={16} className="text-red-400" />
                <span>요원 서열(등급) 관리</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                서열은 활동량에 따라 자동으로 승급되지만, 정치국(관리자)이 직접 신설·수정·삭제하거나 특정 요원에게 강제 임명할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateTierForm}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                <Plus size={13} /> 새 서열 신설
              </button>
              <button
                onClick={() => setGrantTierModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
              >
                <Award size={13} /> 요원에게 직접 임명
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[...tiers].sort((a, b) => a.level - b.level).map((tier) => (
              <div key={tier.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <TierBadge tier={tier.label} size="md" showPrefix={false} />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {tier.isAdminOnly ? 'ADMIN' : `Lv.${tier.level}`}
                    </span>
                    <button
                      onClick={() => openEditTierForm(tier)}
                      className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/40"
                      title="서열 수정"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                      title="서열 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{tier.description}</p>
                <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-900">
                  {tier.isAdminOnly
                    ? '관리자 전용 / 직접 임명'
                    : tier.autoRequirement
                    ? `자동 승급: ${[
                        tier.autoRequirement.posts !== undefined ? `게시물 ${tier.autoRequirement.posts}개` : null,
                        tier.autoRequirement.comments !== undefined ? `댓글 ${tier.autoRequirement.comments}개` : null,
                      ]
                        .filter(Boolean)
                        .join(' + ')}`
                    : '자동 승급 조건 없음 (직접 임명 전용)'}
                  {tier.isDefault && <span className="ml-1.5 text-emerald-400">· 기본 서열</span>}
                </div>
              </div>
            ))}
          </div>

          {/* 수동으로 서열이 고정된 요원 목록 */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-2">직접 임명된 요원 (자동 재산정 중지됨)</h4>
            <div className="space-y-1.5">
              {users.filter((u) => u.profile.tierManuallySet).length === 0 && (
                <p className="text-[11px] text-slate-600">현재 직접 임명된 요원이 없습니다.</p>
              )}
              {users
                .filter((u) => u.profile.tierManuallySet)
                .map((u) => (
                  <div
                    key={u.profile.id}
                    className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{u.profile.nickname}</span>
                      <TierBadge tier={u.profile.tier} size="xs" />
                    </div>
                    <button
                      onClick={() => handleResetTier(u.profile.id)}
                      className="text-[11px] text-cyan-400 hover:underline font-semibold"
                    >
                      자동 산정으로 복귀
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 탭 5: 포럼 관리 (추가, 수정, 폐쇄, 복구, 영구 삭제) */}
      {activeTab === 'forums' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                <span>커뮤니티 포럼 종합 관리 (추가 / 수정 / 폐쇄 / 영구 삭제)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                사이트 내 모든 포럼 카테고리, 공개 상태, 규칙 및 소유자를 직접 관리하고 새로운 포럼을 개설합니다.
              </p>
            </div>
            <button
              onClick={openCreateForumModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl text-white shadow-lg shadow-indigo-600/20 shrink-0 cursor-pointer transition-colors"
            >
              <Plus size={15} />
              <span>새 포럼 개설</span>
            </button>
          </div>

          {/* 포럼 요약 통계 */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">총 포럼</div>
              <div className="text-base font-bold text-white mt-0.5">{forums.length}개</div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">활성 포럼</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {forums.filter((f) => !f.isDeleted).length}개
              </div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">폐쇄(비활성) 포럼</div>
              <div className="text-base font-bold text-rose-400 mt-0.5">
                {forums.filter((f) => f.isDeleted).length}개
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {forums.map((forum) => {
              const ownerUser = users.find((u) => u.user.id === forum.ownerId);
              return (
                <div
                  key={forum.id}
                  className={`p-4 rounded-xl border transition-all ${
                    forum.isDeleted
                      ? 'bg-slate-950/60 border-rose-900/40 opacity-75'
                      : 'bg-slate-950 border-slate-800/90'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
                          {renderForumIcon(forum.icon, 15)}
                        </div>
                        <span className="font-bold text-slate-100 text-sm">{forum.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium">
                          {forum.category}
                        </span>
                        {forum.isPublic ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800 text-[10px]">
                            공개 포럼
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800 text-[10px]">
                            비공개 포럼
                          </span>
                        )}
                        {forum.isDeleted && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[10px]">
                            폐쇄됨 (일반 회원 비노출)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{forum.description}</p>

                      {forum.rules && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60 inline-block">
                          <strong className="text-slate-300">규칙:</strong> {forum.rules}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>
                          소유자:{' '}
                          <strong className="text-slate-400">
                            {ownerUser?.profile.nickname || '운영진'}
                          </strong>
                        </span>
                        <span>
                          게시물: <strong className="text-slate-400">{forum.postCount || 0}건</strong>
                        </span>
                        <span>
                          구독자: <strong className="text-slate-400">{forum.subscriberCount || 0}명</strong>
                        </span>
                        <span>
                          개설일: <span className="font-mono">{new Date(forum.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 md:flex-col md:items-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <button
                        onClick={() => openEditForumModal(forum)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Edit size={13} />
                        <span>포럼 수정</span>
                      </button>

                      <button
                        onClick={() => {
                          db.updateForum(forum.id, { isPublic: !forum.isPublic }, currentAdmin.id);
                          refreshAll();
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        {forum.isPublic ? '비공개 전환' : '공개 전환'}
                      </button>

                      <button
                        onClick={() => handleDeleteForum(forum.id, false)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          forum.isDeleted
                            ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {forum.isDeleted ? '포럼 재오픈(복구)' : '포럼 폐쇄'}
                      </button>

                      <button
                        onClick={() => handleDeleteForum(forum.id, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        title="데이터베이스에서 영구 삭제"
                      >
                        <Trash2 size={13} />
                        <span>영구 삭제</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 탭 6: 관리 기록 (Audit Logs) */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History size={16} className="text-cyan-400" />
              <span>관리자 활동 감사 로그 (Audit Logs)</span>
            </h3>

            {/* 필터 셀렉터 */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300"
            >
              <option value="ALL">전체 활동 로그</option>
              <option value="FORUM_MANAGE">포럼 관리 기록</option>
              <option value="TRUST_CHANGE">신뢰도 변경 기록</option>
              <option value="USER_TIMEOUT">타임아웃 조치</option>
              <option value="USER_WARNING">회원 경고</option>
              <option value="POST_DELETE">게시물 삭제</option>
              <option value="POST_RESTORE">게시물 복구</option>
              <option value="TITLE_GRANT">칭호 수여</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {log.actionType}
                    </span>
                    <span className="text-slate-200 font-medium">{log.details}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    관리자: <strong className="text-slate-400">{log.adminNickname}</strong> (대상: {log.targetType} / {log.targetId})
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono sm:text-right shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 타임아웃 설정 모달 */}
      {timeoutModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Clock className="text-amber-400" size={18} />
              <span>회원 타임아웃 조치: {timeoutModalUser.nickname}</span>
            </h4>
            <form onSubmit={handleTimeoutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">타임아웃 기간</label>
                <select
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                >
                  <option value={10}>10분</option>
                  <option value={60}>1시간</option>
                  <option value={1440}>24시간 (1일)</option>
                  <option value={10080}>7일 (1주일)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">타임아웃 사유</label>
                <textarea
                  value={timeoutReason}
                  onChange={(e) => setTimeoutReason(e.target.value)}
                  placeholder="예: 반복적인 비방 댓글 및 스팸 작성"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTimeoutModalUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-xs rounded text-white"
                >
                  타임아웃 적용
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 경고 발송 모달 */}
      {warningModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={18} />
              <span>회원 공식 경고 발송: {warningModalUser.nickname}</span>
            </h4>
            <form onSubmit={handleWarningSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">경고 사유</label>
                <textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="예: 실명 의심 닉네임 사용 권고, 부적절한 단어 사용 주의"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWarningModalUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 font-bold text-xs rounded text-white"
                >
                  경고 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 새 칭호 생성 모달 */}
      {createTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Award className="text-amber-400" size={18} />
              <span>새로운 커뮤니티 칭호 생성</span>
            </h4>
            <form onSubmit={handleCreateTitle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">칭호 이름</label>
                <input
                  type="text"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  placeholder="예: 심해의 관측자, 팩트체커 마스터"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">칭호 설명</label>
                <textarea
                  value={newTitleDesc}
                  onChange={(e) => setNewTitleDesc(e.target.value)}
                  placeholder="칭호 부여 기준 및 설명"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">테마 색상</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTitleColor}
                    onChange={(e) => setNewTitleColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{newTitleColor}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateTitleModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded text-white"
                >
                  칭호 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 칭호 지급 모달 */}
      {grantTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Award className="text-amber-400" size={18} />
              <span>회원에게 칭호 직접 수여</span>
            </h4>
            <form onSubmit={handleGrantTitle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">대상 회원 선택</label>
                <select
                  value={selectedUserForTitle}
                  onChange={(e) => setSelectedUserForTitle(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                >
                  <option value="">회원을 선택하세요</option>
                  {users.map((u) => (
                    <option key={u.user.id} value={u.user.id}>
                      {u.profile.nickname} ({u.profile.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">수여할 칭호 선택</label>
                <select
                  value={selectedTitleId}
                  onChange={(e) => setSelectedTitleId(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                >
                  <option value="">칭호를 선택하세요</option>
                  {titles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantTitleModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-xs rounded text-white"
                >
                  칭호 수여
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 서열 신설/수정 모달 */}
      {tierFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Shield className="text-red-400" size={18} />
              <span>{editingTier ? '서열 수정' : '새 서열 신설'}</span>
            </h4>
            <form onSubmit={handleSubmitTierForm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">서열 이름</label>
                <input
                  type="text"
                  value={tierFormLabel}
                  onChange={(e) => setTierFormLabel(e.target.value)}
                  placeholder="예: 수석 공작원"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">설명</label>
                <textarea
                  value={tierFormDesc}
                  onChange={(e) => setTierFormDesc(e.target.value)}
                  placeholder="이 서열에 대한 설명"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                  rows={2}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={tierFormAdminOnly} onChange={(e) => setTierFormAdminOnly(e.target.checked)} />
                관리자 전용 서열 (직접 임명으로만 지급, 활동량 무관)
              </label>
              {!tierFormAdminOnly && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">서열 순위 (숫자가 높을수록 상위)</label>
                    <input
                      type="number"
                      value={tierFormLevel}
                      onChange={(e) => setTierFormLevel(Number(e.target.value))}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">자동 승급: 게시물 수</label>
                      <input
                        type="number"
                        value={tierFormReqPosts}
                        onChange={(e) => setTierFormReqPosts(e.target.value)}
                        placeholder="비워두면 조건 없음"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">자동 승급: 댓글 수</label>
                      <input
                        type="number"
                        value={tierFormReqComments}
                        onChange={(e) => setTierFormReqComments(e.target.value)}
                        placeholder="비워두면 조건 없음"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTierFormOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 font-bold text-xs rounded text-white"
                >
                  {editingTier ? '수정 저장' : '서열 신설'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 서열 직접 임명 모달 */}
      {grantTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Award className="text-amber-400" size={18} />
              <span>요원에게 서열 직접 임명</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              직접 임명하면 해당 요원은 활동량과 무관하게 지정한 서열을 유지하며, 자동 재산정이 멈춥니다. (서열 관리 탭에서 언제든 해제 가능)
            </p>
            <form onSubmit={handleGrantTier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">대상 요원 선택</label>
                <select
                  value={selectedUserForTier}
                  onChange={(e) => setSelectedUserForTier(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                >
                  <option value="">요원을 선택하세요</option>
                  {users.map((u) => (
                    <option key={u.user.id} value={u.user.id}>
                      {u.profile.nickname} (현재: {u.profile.tier})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">임명할 서열</label>
                <select
                  value={selectedTierLabel}
                  onChange={(e) => setSelectedTierLabel(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs"
                >
                  <option value="">서열을 선택하세요</option>
                  {[...tiers].sort((a, b) => a.level - b.level).map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label} {t.isAdminOnly ? '(관리자 전용)' : `(Lv.${t.level})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantTierModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-xs rounded text-white"
                >
                  서열 임명
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 생년월일 보안 열람 확인 모달 (요구사항: 관리자도 필요한 권한과 목적이 없으면 생년월일에 접근하지 못하도록 함) */}
      {inspectBirthDateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2 text-rose-300">
              <Lock size={18} />
              <span>민감 개인정보(생년월일) 접근 승인</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              생년월일은 일반 회원에게 절대 비공개되며, 관리자 또한 법적 요구 또는 공식 계정 분쟁 확인 등 <strong>정당한 목적</strong>을 사전에 명시해야만 접근 로그가 기록된 후 열람할 수 있습니다.
            </p>

            {revealedBirthDate ? (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <div className="text-xs text-slate-400">조회된 회원의 생년월일:</div>
                <div className="text-base font-bold text-cyan-300 mt-1">{revealedBirthDate}</div>
                <div className="text-[10px] text-slate-500 mt-2">
                  본 열람 사실은 감사 로그(admin_logs)에 영구 보존되었습니다.
                </div>
              </div>
            ) : (
              <form onSubmit={handleInspectBirthDate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    열람 목적 및 근거 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={birthDatePurpose}
                    onChange={(e) => setBirthDatePurpose(e.target.value)}
                    placeholder="예: 미성년자 유출 정보 접근 분쟁 확인 조사"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectBirthDateUser(null)}
                    className="px-3 py-1.5 bg-slate-800 text-xs rounded text-slate-300"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 font-bold text-xs rounded text-white"
                  >
                    목적 서명 후 열람
                  </button>
                </div>
              </form>
            )}

            {revealedBirthDate && (
              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={() => setInspectBirthDateUser(null)}
                  className="px-4 py-1.5 bg-slate-800 text-xs rounded text-white"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 관리자: 새 포럼 개설 모달 */}
      {showCreateForumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 my-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateForumModal(false);
                resetForumForm();
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">새 커뮤니티 포럼 개설</h4>
                <p className="text-xs text-slate-400">관리자 권한으로 포럼을 생성하고 소유자를 지정합니다.</p>
              </div>
            </div>

            {forumFormError && (
              <div className="p-3 mb-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{forumFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateForumSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    포럼 이름 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={forumFormName}
                    onChange={(e) => setForumFormName(e.target.value)}
                    placeholder="예: 보안 연구소, 미스터리 문서함"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    카테고리 <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={forumFormCategory}
                    onChange={(e) => setForumFormCategory(e.target.value as ForumCategory)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {FORUM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">포럼 아이콘</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_FORUM_ICONS.map((item) => {
                    const isSelected = forumFormIcon === item.name;
                    const IconComp = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => setForumFormIcon(item.name)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <IconComp size={18} />
                        <span className="text-[10px] mt-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  포럼 소개 및 설명 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={forumFormDesc}
                  onChange={(e) => setForumFormDesc(e.target.value)}
                  placeholder="포럼의 주제와 성격을 명확히 적어주세요."
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">포럼 내부 규칙</label>
                <textarea
                  value={forumFormRules}
                  onChange={(e) => setForumFormRules(e.target.value)}
                  placeholder="예: 팩트 체크 필수, 실명 및 이메일 언급 금지, 분쟁 금지"
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">공개 설정</label>
                  <select
                    value={forumFormIsPublic ? 'public' : 'private'}
                    onChange={(e) => setForumFormIsPublic(e.target.value === 'public')}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="public">공개 포럼 (누구나 열람 가능)</option>
                    <option value="private">비공개 포럼 (구독자/지정 회원만)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">포럼 소유자 지정</label>
                  <select
                    value={forumFormOwnerId}
                    onChange={(e) => setForumFormOwnerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.user.id} value={u.user.id}>
                        {u.profile.nickname} ({u.profile.tier}) {u.user.id === currentAdmin.id ? '★ 본인' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  배너 이미지 URL <span className="text-slate-500 font-normal">(선택)</span>
                </label>
                <input
                  type="url"
                  value={forumFormBanner}
                  onChange={(e) => setForumFormBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForumModal(false);
                    resetForumForm();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-colors"
                >
                  포럼 개설 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자: 포럼 정보 및 규칙 수정 모달 */}
      {editingForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 my-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingForum(null);
                resetForumForm();
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                <Edit size={18} />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">포럼 정보 및 규칙 수정</h4>
                <p className="text-xs text-slate-400">
                  대상 포럼: <strong className="text-indigo-300">{editingForum.name}</strong>
                </p>
              </div>
            </div>

            {forumFormError && (
              <div className="p-3 mb-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{forumFormError}</span>
              </div>
            )}

            <div className="p-3 mb-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs text-indigo-300 leading-relaxed">
              💡 <strong>안내:</strong> 포럼 이름을 변경하면 연관된 기존 게시물들의 포럼 이름 표기도 함께 자동 동기화됩니다.
            </div>

            <form onSubmit={handleEditForumSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    포럼 이름 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={forumFormName}
                    onChange={(e) => setForumFormName(e.target.value)}
                    placeholder="포럼 이름"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    카테고리 <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={forumFormCategory}
                    onChange={(e) => setForumFormCategory(e.target.value as ForumCategory)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {FORUM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">포럼 아이콘</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_FORUM_ICONS.map((item) => {
                    const isSelected = forumFormIcon === item.name;
                    const IconComp = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => setForumFormIcon(item.name)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <IconComp size={18} />
                        <span className="text-[10px] mt-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  포럼 소개 및 설명 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={forumFormDesc}
                  onChange={(e) => setForumFormDesc(e.target.value)}
                  placeholder="포럼 소개"
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">포럼 내부 규칙</label>
                <textarea
                  value={forumFormRules}
                  onChange={(e) => setForumFormRules(e.target.value)}
                  placeholder="포럼 규칙"
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">공개 설정</label>
                  <select
                    value={forumFormIsPublic ? 'public' : 'private'}
                    onChange={(e) => setForumFormIsPublic(e.target.value === 'public')}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="public">공개 포럼 (누구나 열람 가능)</option>
                    <option value="private">비공개 포럼 (구독자/지정 회원만)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">소유자 변경</label>
                  <select
                    value={forumFormOwnerId}
                    onChange={(e) => setForumFormOwnerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.user.id} value={u.user.id}>
                        {u.profile.nickname} ({u.profile.tier}) {u.user.id === currentAdmin.id ? '★ 본인' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">배너 이미지 URL</label>
                <input
                  type="url"
                  value={forumFormBanner}
                  onChange={(e) => setForumFormBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingForum(null);
                    resetForumForm();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-colors"
                >
                  수정 사항 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 보안조치 하향/해제 확인 모달 */}
      {securityPasswordModal && targetSecurityLevel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">보안조치 하향/해제 최종 확인</h4>
                <p className="text-xs text-slate-400">
                  {securityConfig.level}단계 ➔ {targetSecurityLevel}단계로의 전환 승인
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              보안 경보를 하향 해제하거나 평상시로 복귀하려면 관리자 계정으로 인증된 상태에서 변경 사항을 최종 확인해야 합니다. 이 작업은 전체 회원에게 즉시 적용됩니다.
            </p>

            <form onSubmit={handleSecurityPasswordSubmit} className="space-y-4">


              {securityModalError && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{securityModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSecurityPasswordModal(false);
                    setSecurityPasswordInput('');
                    setSecurityModalError('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/30 cursor-pointer transition-colors"
                >
                  변경 적용
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
