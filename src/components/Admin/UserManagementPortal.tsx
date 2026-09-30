import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Briefcase, 
  Search, 
  UserX, 
  UserCheck, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Star, 
  RefreshCw, 
  Mail, 
  History, 
  Clock, 
  ArrowRightLeft, 
  Filter, 
  PauseCircle, 
  LogOut, 
  KeyRound, 
  ShieldCheck, 
  Check, 
  X,
  ExternalLink,
  Lock,
  ChevronRight
} from 'lucide-react';
import type { Task } from '../../types';
import type { 
  Department, 
  DepartmentMember, 
  DepartmentRole, 
  OrganizationMember, 
  OrganizationRole, 
  OrganizationInvitation, 
  AuditLog 
} from '../../types/auth';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getWorkloadSummary } from '../../utils/workloadUtils';
import { 
  formatDuration, 
  formatBusinessDuration, 
  getLiveKanbanDurationSeconds, 
  calculateBusinessSeconds, 
  createHandoffTransition
} from '../../utils/timeMetrics';
import { TaskAuditModal } from '../Kanban/TaskAuditModal';

export type AdminSection = 
  | 'membros' 
  | 'setores' 
  | 'convites' 
  | 'auditoria' 
  | 'workload' 
  | 'sla_metrics' 
  | 'profile';

const getThemeClasses = (colorTheme?: string) => {
  switch (colorTheme) {
    case 'sky':
      return {
        cardBorder: 'border-sky-200',
        cardBg: 'from-sky-50 via-white to-sky-50/30',
        avatarBg: 'bg-sky-600',
        titleColor: 'text-sky-950',
        subColor: 'text-sky-700',
        barBg: 'bg-sky-100',
        barFill: 'bg-sky-600',
        numColor: 'text-sky-950',
        filterBg: 'bg-sky-600 text-white',
        filterInactive: 'bg-sky-50 text-sky-800 hover:bg-sky-100',
      };
    case 'emerald':
      return {
        cardBorder: 'border-emerald-200',
        cardBg: 'from-emerald-50 via-white to-emerald-50/30',
        avatarBg: 'bg-emerald-600',
        titleColor: 'text-emerald-950',
        subColor: 'text-emerald-700',
        barBg: 'bg-emerald-100',
        barFill: 'bg-emerald-600',
        numColor: 'text-emerald-950',
        filterBg: 'bg-emerald-600 text-white',
        filterInactive: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
      };
    case 'amber':
      return {
        cardBorder: 'border-amber-200',
        cardBg: 'from-amber-50 via-white to-amber-50/30',
        avatarBg: 'bg-amber-600',
        titleColor: 'text-amber-950',
        subColor: 'text-amber-700',
        barBg: 'bg-amber-100',
        barFill: 'bg-amber-600',
        numColor: 'text-amber-950',
        filterBg: 'bg-amber-600 text-white',
        filterInactive: 'bg-amber-50 text-amber-800 hover:bg-amber-100',
      };
    case 'indigo':
      return {
        cardBorder: 'border-indigo-200',
        cardBg: 'from-indigo-50 via-white to-indigo-50/30',
        avatarBg: 'bg-indigo-600',
        titleColor: 'text-indigo-950',
        subColor: 'text-indigo-700',
        barBg: 'bg-indigo-100',
        barFill: 'bg-indigo-600',
        numColor: 'text-indigo-950',
        filterBg: 'bg-indigo-600 text-white',
        filterInactive: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
      };
    case 'rose':
      return {
        cardBorder: 'border-rose-200',
        cardBg: 'from-rose-50 via-white to-rose-50/30',
        avatarBg: 'bg-rose-600',
        titleColor: 'text-rose-950',
        subColor: 'text-rose-700',
        barBg: 'bg-rose-100',
        barFill: 'bg-rose-600',
        numColor: 'text-rose-950',
        filterBg: 'bg-rose-600 text-white',
        filterInactive: 'bg-rose-50 text-rose-800 hover:bg-rose-100',
      };
    case 'teal':
      return {
        cardBorder: 'border-teal-200',
        cardBg: 'from-teal-50 via-white to-teal-50/30',
        avatarBg: 'bg-teal-600',
        titleColor: 'text-teal-950',
        subColor: 'text-teal-700',
        barBg: 'bg-teal-100',
        barFill: 'bg-teal-600',
        numColor: 'text-teal-950',
        filterBg: 'bg-teal-600 text-white',
        filterInactive: 'bg-teal-50 text-teal-800 hover:bg-teal-100',
      };
    case 'purple':
    default:
      return {
        cardBorder: 'border-purple-200',
        cardBg: 'from-purple-50 via-white to-purple-50/30',
        avatarBg: 'bg-purple-600',
        titleColor: 'text-purple-950',
        subColor: 'text-purple-700',
        barBg: 'bg-purple-100',
        barFill: 'bg-purple-600',
        numColor: 'text-purple-950',
        filterBg: 'bg-purple-600 text-white',
        filterInactive: 'bg-purple-50 text-purple-800 hover:bg-purple-100',
      };
  }
};

interface UserManagementPortalProps {
  onBackToWorkspace: () => void;
  initialSection?: AdminSection;
  tasks: Task[];
  companies: string[];
  currentYear: number;
  currentMonth: number;
  onSelectTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onAddNewCompany?: (name: string) => Promise<void | boolean>;
  onDeleteCompany?: (name: string) => Promise<void | boolean>;
}

export const UserManagementPortal: React.FC<UserManagementPortalProps> = ({
  onBackToWorkspace,
  initialSection = 'membros',
  tasks,
  companies,
  currentYear,
  currentMonth,
  onSelectTask,
  onUpdateTask,
}) => {
  const { 
    user, 
    organization, 
    isOrgAdmin, 
    isOrgOwner, 
    isDepartmentManager, 
    departments: userDepartments,
    signOut,
    updateUserPassword,
    refreshSessionData
  } = useAuth();

  // Seção ativa da barra lateral
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    if (!isOrgAdmin && !isDepartmentManager && (initialSection === 'membros' || initialSection === 'setores' || initialSection === 'convites' || initialSection === 'auditoria')) {
      return 'workload';
    }
    return initialSection;
  });

  // Escuta tecla Escape para retornar ao Workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBackToWorkspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToWorkspace]);

  // ============================================================================
  // ESTADOS E DADOS DE GOVERNANÇA (MEMBROS, SETORES, CONVITES, AUDITORIA)
  // ============================================================================
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptMembers, setDeptMembers] = useState<DepartmentMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);

  // Form novo setor
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  // Form convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteOrgRole, setInviteOrgRole] = useState<OrganizationRole>('member');
  const [inviteDeptId, setInviteDeptId] = useState<string>('');
  const [inviteDeptRole, setInviteDeptRole] = useState<DepartmentRole>('member');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Drawer de setores do membro
  const [selectedMemberForDepts, setSelectedMemberForDepts] = useState<OrganizationMember | null>(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignDeptRole, setAssignDeptRole] = useState<DepartmentRole>('member');

  const showFeedback = (success: string | null, error: string | null) => {
    setSuccessMessage(success);
    setErrorMessage(error);
    if (success) {
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const loadTeamData = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingTeam(true);
    try {
      const [membersData, deptsData, deptMembersData, invitesData, logsData] = await Promise.all([
        api.getOrganizationMembers(organization.id),
        api.getDepartments(organization.id),
        api.getAllDepartmentMembers(organization.id),
        api.getInvitations(organization.id),
        api.getAuditLogs(organization.id, 50),
      ]);

      setMembers(membersData);
      setDepartments(deptsData);
      setDeptMembers(deptMembersData);
      setInvitations(invitesData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error('Erro ao carregar governança de equipe:', err);
      showFeedback(null, err.message || 'Erro ao carregar dados de equipe.');
    } finally {
      setLoadingTeam(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (isOrgAdmin || isDepartmentManager) {
      loadTeamData();
    }
  }, [isOrgAdmin, isDepartmentManager, loadTeamData]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !newDeptName.trim()) return;
    setIsSubmittingDept(true);
    try {
      await api.createDepartment(organization.id, newDeptName.trim(), newDeptDescription.trim());
      showFeedback('Setor criado com sucesso!', null);
      setNewDeptName('');
      setNewDeptDescription('');
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao criar setor.');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleToggleDepartmentActive = async (dept: Department) => {
    try {
      await api.updateDepartment(dept.id, { active: !dept.active });
      showFeedback(`Setor ${dept.active ? 'desativado' : 'reativado'} com sucesso!`, null);
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao alterar status do setor.');
    }
  };

  const handleToggleMemberActive = async (member: OrganizationMember) => {
    if (member.role === 'owner' && member.active) {
      showFeedback(null, 'O Owner da organização não pode ser desativado.');
      return;
    }
    try {
      await api.toggleMemberActive(member.id, !member.active);
      showFeedback(`Membro ${member.active ? 'desativado' : 'reativado'} com sucesso!`, null);
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao alterar status do membro.');
    }
  };

  const handleUpdateMemberRole = async (member: OrganizationMember, newRole: OrganizationRole) => {
    if (member.role === newRole) return;
    try {
      await api.updateMemberRole(member.id, newRole);
      showFeedback(`Papel de ${member.profile?.fullName || 'membro'} atualizado para ${newRole}!`, null);
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao alterar papel do membro.');
    }
  };

  const handleAssignDeptMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForDepts || !assignDeptId) return;
    try {
      await api.assignDepartmentMember(assignDeptId, selectedMemberForDepts.userId, assignDeptRole);
      showFeedback('Membro vinculado ao setor com sucesso!', null);
      setAssignDeptId('');
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao vincular membro ao setor.');
    }
  };

  const handleRemoveDeptMember = async (deptMemberId: string) => {
    try {
      await api.removeDepartmentMember(deptMemberId);
      showFeedback('Vínculo setorial removido com sucesso!', null);
      await loadTeamData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao desvincular membro.');
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !inviteEmail.trim() || !inviteFullName.trim()) return;
    setIsSubmittingInvite(true);
    try {
      const res = await api.inviteOrAddMember({
        organizationId: organization.id,
        email: inviteEmail.trim(),
        fullName: inviteFullName.trim(),
        orgRole: inviteOrgRole,
        departmentId: inviteDeptId || undefined,
        deptRole: inviteDeptRole,
      });
      showFeedback(res.message || 'Convite enviado com sucesso!', null);
      setInviteEmail('');
      setInviteFullName('');
      setInviteOrgRole('member');
      setInviteDeptId('');
      setInviteDeptRole('member');
      await loadTeamData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao criar convite.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await api.revokeInvitation(inviteId);
      showFeedback('Convite revogado com sucesso!', null);
      await loadTeamData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao revogar convite.');
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (!showInactiveMembers && !m.active) return false;
      if (!memberSearchQuery.trim()) return true;
      const q = memberSearchQuery.toLowerCase();
      const name = m.profile?.fullName?.toLowerCase() || '';
      const email = m.profile?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [members, showInactiveMembers, memberSearchQuery]);

  // ============================================================================
  // ESTADOS E DADOS DE PRODUTIVIDADE OPERACIONAL (EQUIPE ERGON & SETORES)
  // ============================================================================
  type WorkloadFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'paused' | string;
  const [includeFuture, setIncludeFuture] = useState(false);
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');

  // Mapeia operadores conhecidos a partir dos membros cadastrados e seus setores
  const knownOperators = useMemo(() => {
    const list: { name: string; displayName?: string; roleTitle?: string; departmentName?: string; avatarUrl?: string }[] = [
      {
        name: 'Bea',
        displayName: 'Beatriz (Bea)',
        roleTitle: 'Operadora Contábil & Fiscal',
      },
      {
        name: 'Vini',
        displayName: 'Vinicius (Vini)',
        roleTitle: 'Operador Contábil & Fiscal',
      },
    ];

    const registeredKeys = new Set(['bea', 'vini']);
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    // Mapeia chefias e vínculos de setor por userId
    const userDeptRoles = new Map<string, { role: DepartmentRole; deptName: string }[]>();
    for (const dm of deptMembers) {
      const current = userDeptRoles.get(dm.userId) || [];
      const deptName = deptMap.get(dm.departmentId) || 'Setor';
      current.push({ role: dm.role, deptName });
      userDeptRoles.set(dm.userId, current);
    }

    for (const m of members) {
      if (!m.active) continue;
      const rawName = m.profile?.fullName?.trim() || m.profile?.email?.split('@')[0] || '';
      if (!rawName) continue;

      const lower = rawName.toLowerCase();
      if (lower === 'beatriz' || lower === 'bea' || lower === 'vinicius' || lower === 'vini') {
        continue;
      }

      if (!registeredKeys.has(lower)) {
        registeredKeys.add(lower);
        const deptRoles = userDeptRoles.get(m.userId) || [];
        const managerRole = deptRoles.find((r) => r.role === 'manager');
        let roleTitle = 'Membro da Equipe';
        let departmentName = '';

        if (m.role === 'owner') {
          roleTitle = 'Proprietário (Owner)';
        } else if (managerRole) {
          roleTitle = `Chefe de Setor (${managerRole.deptName})`;
          departmentName = managerRole.deptName;
        } else if (m.role === 'admin') {
          roleTitle = 'Administrador';
        } else if (deptRoles.length > 0) {
          departmentName = deptRoles.map((r) => r.deptName).join(', ');
          roleTitle = `Operador (${departmentName})`;
        }

        list.push({
          name: rawName,
          displayName: rawName,
          roleTitle,
          departmentName,
          avatarUrl: m.profile?.avatarUrl,
        });
      }
    }

    return list;
  }, [members, departments, deptMembers]);

  const workloadSummary = useMemo(() => {
    return getWorkloadSummary(tasks, {
      includeFuture,
      currentYear,
      currentMonth,
      knownOperators,
    });
  }, [tasks, includeFuture, currentYear, currentMonth, knownOperators]);

  const filteredWorkloadTasks = useMemo(() => {
    const baseTasks = includeFuture
      ? tasks
      : tasks.filter((t) => {
          if (!t.dueDate) return true;
          if (t.status === 'done' || t.status === 'in_progress') return true;
          const refYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const taskYm = typeof t.dueDate === 'string' ? t.dueDate.substring(0, 7) : '';
          return taskYm ? taskYm <= refYearMonth : true;
        });

    const activeList = baseTasks.filter((t) => t.status !== 'done');

    if (workloadFilter === 'all') {
      return activeList;
    }
    if (workloadFilter === 'overdue') {
      return workloadSummary.dueDates.overdue;
    }
    if (workloadFilter === 'today') {
      return workloadSummary.dueDates.today;
    }
    if (workloadFilter === 'tomorrow') {
      return workloadSummary.dueDates.tomorrow;
    }
    if (workloadFilter === 'this_week') {
      return workloadSummary.dueDates.thisWeek;
    }
    if (workloadFilter === 'paused') {
      return activeList.filter((t: Task) => Boolean(t.isPaused));
    }

    // Filtro por operador específico (Bea, Vini, ou qualquer novo usuário/chefe)
    return activeList.filter((t: Task) => {
      const assigned = (t.assignee?.trim() || 'Bea').toLowerCase();
      return assigned === workloadFilter.toLowerCase();
    });
  }, [includeFuture, tasks, workloadSummary, workloadFilter]);

  const handleQuickHandoff = (task: Task, newAssignee: string) => {
    if (!onUpdateTask || (task.assignee || 'Bea') === newAssignee) return;
    const nowIso = new Date().toISOString();
    const updatedHistory = createHandoffTransition(task, newAssignee, nowIso);
    onUpdateTask({
      ...task,
      assignee: newAssignee,
      assigneeHistory: updatedHistory,
      updatedAt: nowIso,
    });
  };

  const handleQuickTogglePause = (task: Task) => {
    if (!onUpdateTask) return;
    const isPaused = !task.isPaused;
    const nowIso = new Date().toISOString();
    onUpdateTask({
      ...task,
      isPaused,
      pausedAt: isPaused ? nowIso : undefined,
      updatedAt: nowIso,
    });
  };

  // ============================================================================
  // ESTADOS E DADOS DE MÉTRICAS & SLA OPERACIONAL
  // ============================================================================
  const [slaCompanyFilter, setSlaCompanyFilter] = useState('all');
  const [slaStatusFilter, setSlaStatusFilter] = useState('all');
  const [selectedTaskForAudit, setSelectedTaskForAudit] = useState<Task | null>(null);

  const slaFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (slaCompanyFilter !== 'all' && t.company !== slaCompanyFilter) return false;
      if (slaStatusFilter !== 'all' && t.status !== slaStatusFilter) return false;
      return true;
    });
  }, [tasks, slaCompanyFilter, slaStatusFilter]);

  const slaMetrics = useMemo(() => {
    const doneTasks = slaFilteredTasks.filter((t) => t.status === 'done');
    const inProgressTasks = slaFilteredTasks.filter((t) => t.status === 'in_progress');
    const delayedTasks = slaFilteredTasks.filter((t) => {
      if (t.status === 'done') return false;
      const today = new Date().toISOString().split('T')[0];
      return Boolean(t.dueDate && t.dueDate < today);
    });

    let totalDoneBusinessSec = 0;
    doneTasks.forEach((t) => {
      totalDoneBusinessSec += calculateBusinessSeconds(t.createdAt, t.completedAt || new Date().toISOString());
    });
    const avgDoneBusinessSec = doneTasks.length > 0 ? Math.round(totalDoneBusinessSec / doneTasks.length) : 0;

    let onTimeCount = 0;
    doneTasks.forEach((t) => {
      if (t.completedAt && t.dueDate) {
        const compDate = t.completedAt.split('T')[0];
        if (compDate <= t.dueDate) onTimeCount++;
      }
    });
    const onTimeRate = doneTasks.length > 0 ? Math.round((onTimeCount / doneTasks.length) * 100) : 100;

    return {
      total: slaFilteredTasks.length,
      doneCount: doneTasks.length,
      inProgressCount: inProgressTasks.length,
      delayedCount: delayedTasks.length,
      avgDoneBusinessSec,
      onTimeRate,
    };
  }, [slaFilteredTasks]);

  // ============================================================================
  // ESTADOS E DADOS DE PERFIL & SEGURANÇA
  // ============================================================================
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ success?: string; error?: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ error: 'As senhas não coincidem.' });
      return;
    }

    setIsUpdatingPassword(true);
    const { error, success } = await updateUserPassword(newPassword);
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordFeedback({ error });
    } else if (success) {
      setPasswordFeedback({ success: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordFeedback(null), 4000);
    }
  };

  const userInitial = user?.fullName?.charAt(0).toUpperCase() || 'O';
  const roleDisplay = isOrgOwner ? 'Owner' : isOrgAdmin ? 'Administrador' : isDepartmentManager ? 'Chefe de Setor' : 'Membro';

  return (
    <div className="h-screen w-full flex bg-slate-100 overflow-hidden font-['Inter',sans-serif] text-slate-800 select-none">
      
      {/* ==================================================================== */}
      {/* 1. BARRA FIXA NA ESQUERDA (SIDEBAR CORPORATIVA ERGON)                */}
      {/* ==================================================================== */}
      <aside className="w-64 sm:w-72 h-screen flex flex-col bg-[#0d345e] text-white shrink-0 border-r border-blue-900/80 shadow-xl z-20">
        
        {/* Topo da Sidebar: Identidade Ergon & Botão Voltar */}
        <div className="p-5 border-b border-blue-900/80 bg-[#0a294a] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0d345e] font-black text-base flex items-center justify-center shadow-xs border border-amber-300 shrink-0">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white leading-tight">
                ERGON CONTABILIDADE
              </span>
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                Painel Administrativo
              </span>
            </div>
          </div>

          {/* Botão de retorno ao Workspace */}
          <button
            onClick={onBackToWorkspace}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-[#08223f] hover:bg-blue-900 border border-blue-700/80 hover:border-amber-400 text-amber-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 group shadow-xs"
            title="Retornar ao quadro Kanban e Calendário (ESC)"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar ao Workspace</span>
          </button>
        </div>

        {/* Menu de Navegação Vertical (Itens de Governança e Operação) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          
          {/* GRUPO 1: GOVERNANÇA & ACESSOS (Owner, Admin e Chefes) */}
          {(isOrgAdmin || isDepartmentManager) && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
                Governança & Acessos
              </span>

              <button
                onClick={() => setActiveSection('membros')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeSection === 'membros'
                    ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Membros & Vínculos</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  activeSection === 'membros' ? 'bg-[#0d345e] text-amber-300' : 'bg-blue-950 text-blue-200'
                }`}>
                  {members.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('setores')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeSection === 'setores'
                    ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4" />
                  <span>Setores</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  activeSection === 'setores' ? 'bg-[#0d345e] text-amber-300' : 'bg-blue-950 text-blue-200'
                }`}>
                  {departments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('convites')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeSection === 'convites'
                    ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Convidar / Pendentes</span>
                </div>
                {invitations.filter((i) => i.status === 'pending').length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    activeSection === 'convites' ? 'bg-[#0d345e] text-amber-300' : 'bg-amber-400 text-[#0d345e]'
                  }`}>
                    {invitations.filter((i) => i.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('auditoria')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeSection === 'auditoria'
                    ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4" />
                  <span>Trilha de Auditoria</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          )}

          {/* GRUPO 2: OPERAÇÃO & PRODUTIVIDADE */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
              Operação & Métricas
            </span>

            <button
              onClick={() => setActiveSection('workload')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSection === 'workload'
                  ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                  : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Carga de Trabalho da Equipe</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {(isOrgAdmin || isDepartmentManager) && (
              <button
                onClick={() => setActiveSection('sla_metrics')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeSection === 'sla_metrics'
                    ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4" />
                  <span>Métricas & SLA</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
          </div>

          {/* GRUPO 3: MINHA CONTA & SEGURANÇA */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">
              Conta do Usuário
            </span>

            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-amber-400 text-[#0d345e] shadow-sm'
                  : 'text-blue-100 hover:text-white hover:bg-blue-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" />
                <span>Meu Perfil & Segurança</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

        </nav>

        {/* Rodapé da Sidebar: Usuário Autenticado (Sóbrio, Sem Emojis) */}
        <div className="p-4 border-t border-blue-900/80 bg-[#0a294a] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0d345e] font-black text-xs flex items-center justify-center shadow-xs border border-amber-300 shrink-0">
              {userInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate leading-tight">
                {user?.fullName || 'Operador'}
              </span>
              <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase leading-tight">
                {roleDisplay}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg bg-[#08223f] hover:bg-rose-950/80 border border-blue-800 hover:border-rose-400 text-blue-200 hover:text-rose-300 transition cursor-pointer shrink-0"
            title="Encerrar sessão (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </aside>

      {/* ==================================================================== */}
      {/* 2. ÁREA CENTRAL (CONTEÚDO DINÂMICO AMPLO E TOTALMENTE ROLÁVEL)       */}
      {/* ==================================================================== */}
      <div className="flex-1 h-screen flex flex-col overflow-y-auto bg-slate-50">
        
        {/* Top Header da Área Central */}
        <header className="bg-white border-b border-slate-200 px-6 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0">
              {activeSection === 'membros' && 'Gestão de Membros & Vínculos'}
              {activeSection === 'setores' && 'Setores & Departamentos'}
              {activeSection === 'convites' && 'Convites Corporativos & Pendentes'}
              {activeSection === 'auditoria' && 'Trilha de Auditoria Forense'}
              {activeSection === 'workload' && 'Produtividade da Equipe Ergon (Bea & Vini)'}
              {activeSection === 'sla_metrics' && 'Métricas de Tempo Comercial & SLA'}
              {activeSection === 'profile' && 'Meu Perfil & Segurança de Acesso'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSection === 'membros' && 'Controle de papéis, ativação de usuários e vínculos aos setores da organização.'}
              {activeSection === 'setores' && 'Estruturação dos departamentos contábeis e gestão de chefias setoriais.'}
              {activeSection === 'convites' && 'Admissão de novos operadores e histórico de convites emitidos.'}
              {activeSection === 'auditoria' && 'Registro imutável de alterações de segurança, papéis e permissões.'}
              {activeSection === 'workload' && 'Acompanhamento de carga, passagem de bastão e prazos operacionais.'}
              {activeSection === 'sla_metrics' && 'Relatório analítico de lead time comercial (08h às 17h, Seg-Sex).'}
              {activeSection === 'profile' && 'Dados cadastrais, setor de atuação e alteração de credencial.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(activeSection === 'membros' || activeSection === 'setores' || activeSection === 'convites' || activeSection === 'auditoria') && (
              <button
                onClick={loadTeamData}
                disabled={loadingTeam}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTeam ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>DEV / Supabase</span>
            </div>
          </div>
        </header>

        {/* Feedback Alerts Globais da Área Central */}
        <div className="px-6 sm:px-10 pt-4">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-xs mb-4">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Conteúdo Principal Rolável */}
        <main className="p-6 sm:px-10 sm:pb-12 flex-1 space-y-6">

          {/* ================================================================ */}
          {/* SEÇÃO 1: MEMBROS & VÍNCULOS                                      */}
          {/* ================================================================ */}
          {activeSection === 'membros' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
                <div className="flex-1 min-w-[240px] max-w-md relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactiveMembers}
                    onChange={(e) => setShowInactiveMembers(e.target.checked)}
                    className="rounded border-slate-300 text-[#0d345e] focus:ring-[#0d345e]"
                  />
                  <span>Exibir membros desativados</span>
                </label>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs font-medium">
                  Nenhum membro encontrado com os filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5">Operador / Membro</th>
                        <th className="py-3 px-4">Papel na Organização</th>
                        <th className="py-3 px-4">Setores Vinculados</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações de Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.map((m) => {
                        const mDepts = deptMembers.filter((dm) => dm.userId === m.userId && dm.active);
                        const isSelf = m.userId === user?.id;

                        return (
                          <tr key={m.id} className={`hover:bg-slate-50/70 transition ${!m.active ? 'opacity-60 bg-slate-50' : ''}`}>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-[#0d345e] font-bold flex items-center justify-center text-xs shrink-0 border border-slate-300">
                                  {m.profile?.fullName?.charAt(0).toUpperCase() || 'M'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    {m.profile?.fullName || 'Nome não definido'}
                                    {m.role === 'owner' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                        Owner
                                      </span>
                                    )}
                                    {isSelf && (
                                      <span className="text-[10px] text-blue-700 font-bold">(Você)</span>
                                    )}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    {m.profile?.email || 'Sem e-mail'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {isOrgOwner && !isSelf ? (
                                <select
                                  value={m.role}
                                  onChange={(e) => handleUpdateMemberRole(m, e.target.value as OrganizationRole)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0d345e]"
                                >
                                  <option value="member">Membro</option>
                                  <option value="admin">Administrador</option>
                                  <option value="owner">Owner</option>
                                </select>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] inline-block">
                                  {m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Administrador' : 'Membro'}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {mDepts.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">Nenhum setor</span>
                                ) : (
                                  mDepts.map((dm) => (
                                    <span
                                      key={dm.id}
                                      className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[10.5px] font-semibold flex items-center gap-1"
                                    >
                                      <span>{dm.department?.name || 'Setor'}</span>
                                      {dm.role === 'manager' && (
                                        <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                      )}
                                    </span>
                                  ))
                                )}
                                {isOrgAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMemberForDepts(m)}
                                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold ml-1 hover:underline cursor-pointer"
                                  >
                                    + Gerenciar
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {m.active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <X className="w-3 h-3 text-rose-600" />
                                  Inativo
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isOrgAdmin && !isSelf && m.role !== 'owner' && (
                                <button
                                  onClick={() => handleToggleMemberActive(m)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer inline-flex items-center gap-1 ${
                                    m.active
                                      ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  {m.active ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Desativar</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Reativar</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 2: SETORES                                                 */}
          {/* ================================================================ */}
          {activeSection === 'setores' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Criação de Setor */}
              {isOrgAdmin && (
                <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-[#0d345e] flex items-center justify-center font-bold text-xs">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900">Novo Setor</h2>
                  </div>

                  <form onSubmit={handleCreateDepartment} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Nome do Setor *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="ex: Departamento Pessoal, Fiscal..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Descrição / Atividades
                      </label>
                      <textarea
                        rows={3}
                        value={newDeptDescription}
                        onChange={(e) => setNewDeptDescription(e.target.value)}
                        placeholder="Descrição opcional..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingDept}
                      className="w-full py-2.5 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSubmittingDept ? 'Cadastrando...' : 'Cadastrar Setor'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Lista de Setores */}
              <div className={`${isOrgAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
                {departments.length === 0 ? (
                  <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                    Nenhum setor cadastrado na organização.
                  </div>
                ) : (
                  departments.map((dept) => {
                    const countMembers = deptMembers.filter((dm) => dm.departmentId === dept.id && dm.active).length;
                    const countManagers = deptMembers.filter((dm) => dm.departmentId === dept.id && dm.active && dm.role === 'manager').length;

                    return (
                      <div
                        key={dept.id}
                        className={`p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4 transition ${
                          !dept.active ? 'opacity-60 bg-slate-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#0d345e] flex items-center justify-center font-bold shrink-0 mt-0.5">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{dept.name}</span>
                              {dept.active ? (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                                  Ativo
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {dept.description || 'Sem descrição cadastrada.'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                              <span>👥 {countMembers} membros ativos</span>
                              <span>⭐ {countManagers} chefes de setor</span>
                            </div>
                          </div>
                        </div>

                        {isOrgAdmin && (
                          <button
                            onClick={() => handleToggleDepartmentActive(dept)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                              dept.active
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {dept.active ? 'Desativar Setor' : 'Reativar Setor'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 3: CONVIDAR / PENDENTES                                    */}
          {/* ================================================================ */}
          {activeSection === 'convites' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form de Envio de Convite */}
              {isOrgAdmin && (
                <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-[#0d345e] flex items-center justify-center font-bold text-xs">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900">Novo Convite</h2>
                  </div>

                  <form onSubmit={handleCreateInvite} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteFullName}
                        onChange={(e) => setInviteFullName(e.target.value)}
                        placeholder="ex: Beatriz Alcantara"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        E-mail Corporativo *
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="ex: beatriz@ergon.com.br"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Papel na Organização
                      </label>
                      <select
                        value={inviteOrgRole}
                        onChange={(e) => setInviteOrgRole(e.target.value as OrganizationRole)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Setor Inicial (Opcional)
                      </label>
                      <select
                        value={inviteDeptId}
                        onChange={(e) => setInviteDeptId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                      >
                        <option value="">Nenhum setor inicial</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {inviteDeptId && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Função no Setor
                        </label>
                        <select
                          value={inviteDeptRole}
                          onChange={(e) => setInviteDeptRole(e.target.value as DepartmentRole)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                        >
                          <option value="member">Membro</option>
                          <option value="manager">Chefe de Setor ⭐</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingInvite}
                      className="w-full py-2.5 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isSubmittingInvite ? 'Gerando convite...' : 'Gerar Convite'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Lista de Convites */}
              <div className={`${isOrgAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800">
                  Histórico de Convites Emitidos
                </div>

                {invitations.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 text-xs font-medium">
                    Nenhum convite emitido até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Convidado</th>
                          <th className="py-3 px-4">Papel Previsto</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Expiração</th>
                          <th className="py-3 px-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{inv.fullName}</span>
                                <span className="text-[11px] text-slate-500">{inv.email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {inv.orgRole === 'admin' ? 'Administrador' : 'Membro'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'revoked'
                                  ? 'bg-rose-100 text-rose-800'
                                  : inv.status === 'expired'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {inv.status === 'accepted' ? 'Aceito' : inv.status === 'revoked' ? 'Revogado' : inv.status === 'expired' ? 'Expirado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isOrgAdmin && inv.status === 'pending' && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] transition cursor-pointer"
                                >
                                  Revogar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 4: TRILHA DE AUDITORIA FORENSE                             */}
          {/* ================================================================ */}
          {activeSection === 'auditoria' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>Registro Forense de Segurança e Permissões</span>
                <span className="text-[11px] text-slate-500 font-normal">Histórico cronológico de ações</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs font-medium">
                  Nenhum log de auditoria registrado no período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Entidade</th>
                        <th className="py-3 px-4">Ação</th>
                        <th className="py-3 px-4">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                              {log.entityType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'created'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.action === 'deactivated' || log.action === 'revoked'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 font-mono">
                            {log.newData ? JSON.stringify(log.newData) : log.oldData ? JSON.stringify(log.oldData) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 5: PRODUTIVIDADE OPERACIONAL (BEA & VINI)                  */}
          {/* ================================================================ */}
          {activeSection === 'workload' && (
            <div className="space-y-6">
              {/* Resumo de Indicadores da Equipe */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Tarefas Ativas</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{workloadSummary.totalActive}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Concluídas</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{workloadSummary.totalCompleted}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Em Atraso</span>
                  <p className="text-2xl font-black text-rose-900 mt-1">{workloadSummary.dueDates.overdue.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Vencem Hoje</span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{workloadSummary.dueDates.today.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs">
                  <span className="text-[11px] font-bold text-blue-600 uppercase">Esta Semana</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">{workloadSummary.dueDates.thisWeek.length}</p>
                </div>
              </div>

              {/* Painel de Produtividade & Carga por Operador / Chefe de Setor */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workloadSummary.operators.map((op) => {
                  const theme = getThemeClasses(op.colorTheme);
                  const isManager = op.roleTitle?.includes('Chefe de Setor');
                  const isOwner = op.roleTitle?.includes('Proprietário') || op.roleTitle?.includes('Owner');

                  return (
                    <div
                      key={op.operator}
                      className={`p-6 rounded-2xl bg-gradient-to-br ${theme.cardBg} border ${theme.cardBorder} shadow-xs space-y-4 relative overflow-hidden`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl ${theme.avatarBg} text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0`}>
                            {op.displayName ? op.displayName.charAt(0).toUpperCase() : op.operator.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className={`text-base font-black ${theme.titleColor}`}>
                                {op.displayName || op.operator}
                              </h3>
                              {isManager && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0d345e] text-amber-300 border border-blue-900 shadow-2xs">
                                  Chefe de Setor
                                </span>
                              )}
                              {isOwner && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-900 shadow-2xs">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${theme.subColor} font-medium mt-0.5`}>
                              {op.roleTitle || 'Membro da Equipe'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-2xl font-black ${theme.numColor}`}>{op.totalActive}</span>
                          <span className={`text-xs ${theme.subColor} block font-semibold`}>ativas</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className={`flex justify-between text-xs font-bold ${theme.titleColor}`}>
                          <span>Carga Relativa ({op.percentageOfActive}%)</span>
                          <span>{op.completedCount} concluídas</span>
                        </div>
                        <div className={`w-full h-2.5 rounded-full ${theme.barBg} overflow-hidden`}>
                          <div
                            className={`h-full ${theme.barFill} rounded-full transition-all duration-500`}
                            style={{ width: `${op.percentageOfActive}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="p-2 rounded-xl bg-white/80 border border-slate-100/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Em Andamento</span>
                          <p className={`text-sm font-black ${theme.titleColor}`}>{op.inProgressCount}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/80 border border-slate-100/80">
                          <span className="text-[10px] font-bold text-rose-500 uppercase">Atrasadas</span>
                          <p className="text-sm font-black text-rose-600">{op.delayedCount}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/80 border border-slate-100/80">
                          <span className="text-[10px] font-bold text-amber-500 uppercase">Pausadas</span>
                          <p className="text-sm font-black text-amber-600">{op.pausedCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filtros Operacionais */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setWorkloadFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      workloadFilter === 'all' ? 'bg-[#0d345e] text-amber-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({workloadSummary.totalActive})
                  </button>

                  {workloadSummary.operators.map((op) => {
                    const isSelected = workloadFilter.toLowerCase() === op.operator.toLowerCase();
                    const theme = getThemeClasses(op.colorTheme);
                    return (
                      <button
                        key={op.operator}
                        onClick={() => setWorkloadFilter(op.operator)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected ? theme.filterBg : theme.filterInactive
                        }`}
                      >
                        <span>{op.displayName || op.operator}</span>
                        <span className="opacity-80 font-normal">({op.totalActive})</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setWorkloadFilter('today')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      workloadFilter === 'today' ? 'bg-amber-500 text-slate-900' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Vencem Hoje ({workloadSummary.dueDates.today.length})
                  </button>
                  <button
                    onClick={() => setWorkloadFilter('overdue')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      workloadFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                    }`}
                  >
                    Em Atraso ({workloadSummary.dueDates.overdue.length})
                  </button>
                  <button
                    onClick={() => setWorkloadFilter('paused')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      workloadFilter === 'paused' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Pausadas
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFuture}
                    onChange={(e) => setIncludeFuture(e.target.checked)}
                    className="rounded border-slate-300 text-[#0d345e] focus:ring-[#0d345e]"
                  />
                  <span>Incluir meses futuros</span>
                </label>
              </div>

              {/* Lista de Tarefas da Equipe */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Tarefas Operacionais ({filteredWorkloadTasks.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Ações rápidas de bastão e pausa</span>
                </div>

                {filteredWorkloadTasks.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 text-xs font-medium">
                    Nenhuma tarefa encontrada para este filtro.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredWorkloadTasks.map((task) => (
                      <div key={task.id} className="p-4 hover:bg-slate-50/80 transition flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-[280px] max-w-xl">
                          <div className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ${
                            task.status === 'done' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                          }`} />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">{task.title}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">🏢 {task.company}</span>
                              <span>📅 Prazo: {task.dueDate || 'Sem data'}</span>
                              {task.isPaused && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  ⏸️ Pausada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações Rápidas de Operação */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            (task.assignee || 'Bea') === 'Bea'
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : (task.assignee === 'Vini')
                              ? 'bg-sky-100 text-sky-900 border-sky-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {task.assignee || 'Bea'}
                          </span>

                          {/* Seletor rápido de passagem de bastão */}
                          <div className="relative inline-flex items-center">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/50 text-slate-700 transition">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleQuickHandoff(task, e.target.value);
                                  }
                                }}
                                className="bg-transparent text-xs font-bold text-slate-700 hover:text-amber-900 cursor-pointer focus:outline-hidden"
                                title="Passar bastão para outro membro ou chefe da equipe"
                              >
                                <option value="" disabled>Passar bastão...</option>
                                {workloadSummary.operators
                                  .filter((op) => op.operator !== (task.assignee || 'Bea'))
                                  .map((op) => (
                                    <option key={op.operator} value={op.operator}>
                                      Passar para {op.displayName || op.operator}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={() => handleQuickTogglePause(task)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              task.isPaused
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                            }`}
                            title={task.isPaused ? 'Retomar tarefa' : 'Pausar tarefa'}
                          >
                            <PauseCircle className="w-4 h-4" />
                          </button>

                          {onSelectTask && (
                            <button
                              onClick={() => onSelectTask(task)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-500 hover:text-[#0d345e] transition cursor-pointer"
                              title="Abrir detalhes no modal completo"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 6: MÉTRICAS & SLA                                          */}
          {/* ================================================================ */}
          {activeSection === 'sla_metrics' && (
            <div className="space-y-6">
              {/* Cards de SLA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Tempo Médio Conclusão</span>
                  <p className="text-2xl font-black text-[#0d345e]">
                    {formatBusinessDuration(slaMetrics.avgDoneBusinessSec)}
                  </p>
                  <span className="text-[11px] text-slate-400">Janela útil comercial (08h-17h Seg-Sex)</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Aderência ao Prazo</span>
                  <p className="text-2xl font-black text-emerald-900">{slaMetrics.onTimeRate}%</p>
                  <span className="text-[11px] text-emerald-700">Tarefas entregues até a data de vencimento</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-blue-600 uppercase">Tarefas em Execução</span>
                  <p className="text-2xl font-black text-blue-900">{slaMetrics.inProgressCount}</p>
                  <span className="text-[11px] text-blue-700">Carga ativa nos setores</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-rose-600 uppercase">Gargalos / Em Atraso</span>
                  <p className="text-2xl font-black text-rose-900">{slaMetrics.delayedCount}</p>
                  <span className="text-[11px] text-rose-700">Vencimento ultrapassado</span>
                </div>
              </div>

              {/* Filtros de Empresa e Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Filtros de Análise:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={slaCompanyFilter}
                    onChange={(e) => setSlaCompanyFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0d345e]"
                  >
                    <option value="all">Todas as Empresas ({companies.length})</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={slaStatusFilter}
                    onChange={(e) => setSlaStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0d345e]"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="todo">A Fazer</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="done">Concluídas</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Métricas Detalhadas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Relatório Consolidado de Execução</span>
                  <span className="text-[11px] text-slate-500 font-normal">Auditoria de tempo útil e corridas</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tarefa / Cliente</th>
                        <th className="py-3 px-4">Responsável</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Tempo Útil (08h-17h)</th>
                        <th className="py-3 px-4">Tempo Corrido (24h)</th>
                        <th className="py-3 px-4 text-right">Auditoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slaFilteredTasks.slice(0, 30).map((t) => {
                        const businessSec = calculateBusinessSeconds(t.createdAt, t.completedAt || new Date().toISOString());
                        const elapsedSec = getLiveKanbanDurationSeconds(t);

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{t.title}</span>
                                <span className="text-[11px] text-slate-500">{t.company}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {t.assignee || 'Bea'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'done' ? 'bg-emerald-100 text-emerald-800' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {t.status === 'done' ? 'Concluída' : t.status === 'in_progress' ? 'Em Andamento' : 'A Fazer'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#0d345e]">
                              {formatBusinessDuration(businessSec)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {formatDuration(elapsedSec)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedTaskForAudit(t)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-300 text-[11px] font-semibold transition cursor-pointer"
                              >
                                Ver Bastão
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal de Auditoria da Tarefa Selecionada */}
              {selectedTaskForAudit && (
                <TaskAuditModal
                  isOpen={Boolean(selectedTaskForAudit)}
                  onClose={() => setSelectedTaskForAudit(null)}
                  task={selectedTaskForAudit}
                />
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* SEÇÃO 7: MEU PERFIL & SEGURANÇA                                  */}
          {/* ================================================================ */}
          {activeSection === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Dados do Usuário */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-[#0d345e] font-black text-2xl flex items-center justify-center shadow-xs border border-amber-300">
                    {userInitial}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{user?.fullName || 'Operador Ergon'}</h3>
                    <p className="text-xs text-slate-500">{user?.email || 'Sem e-mail cadastrado'}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0d345e] text-amber-300 border border-blue-900">
                      {roleDisplay}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-semibold text-slate-500">Organização:</span>
                    <span className="font-bold text-slate-900">{organization?.name || 'Ergon Contabilidade'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-semibold text-slate-500">Setores Vinculados:</span>
                    <span className="font-bold text-slate-900">
                      {userDepartments.length > 0 ? userDepartments.map((d) => d.name).join(', ') : 'Acesso Geral'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-semibold text-slate-500">URL Dedicada:</span>
                    <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">/admin-panel</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="font-semibold text-slate-500">Ambiente:</span>
                    <span className="font-bold text-emerald-700">✓ Supabase DEV Conectado</span>
                  </div>
                </div>
              </div>

              {/* Formulário de Alteração de Senha */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0d345e] text-amber-300 flex items-center justify-center font-bold text-sm">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Redefinir Senha de Acesso</h3>
                    <p className="text-xs text-slate-500">Atualize sua credencial pessoal com segurança</p>
                  </div>
                </div>

                {passwordFeedback?.success && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passwordFeedback.success}</span>
                  </div>
                )}

                {passwordFeedback?.error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{passwordFeedback.error}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nova Senha (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full py-3 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isUpdatingPassword ? 'Atualizando...' : 'Salvar Nova Senha'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================================================================== */}
      {/* MODAL / DRAWER: GERENCIAR SETORES DE UM MEMBRO ESPECÍFICO            */}
      {/* ==================================================================== */}
      {selectedMemberForDepts && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-[#0d345e] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Vínculos Setoriais</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  {selectedMemberForDepts.profile?.fullName || selectedMemberForDepts.profile?.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberForDepts(null)}
                className="p-1.5 rounded-lg hover:bg-blue-900 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Setores Atualmente Atribuídos</h4>
                {deptMembers.filter((dm) => dm.userId === selectedMemberForDepts.userId && dm.active).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum setor atribuído.</p>
                ) : (
                  <div className="space-y-2">
                    {deptMembers
                      .filter((dm) => dm.userId === selectedMemberForDepts.userId && dm.active)
                      .map((dm) => (
                        <div key={dm.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{dm.department?.name}</span>
                            {dm.role === 'manager' && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                Chefe
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveDeptMember(dm.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAssignDeptMember} className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Vincular a Novo Setor</h4>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    required
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]"
                  >
                    <option value="">Selecione o setor...</option>
                    {departments
                      .filter((d) => d.active)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>

                  <select
                    value={assignDeptRole}
                    onChange={(e) => setAssignDeptRole(e.target.value as DepartmentRole)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0d345e]"
                  >
                    <option value="member">Membro</option>
                    <option value="manager">Chefe de Setor ⭐</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!assignDeptId}
                  className="w-full py-2.5 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Vincular ao Setor
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementPortal;
