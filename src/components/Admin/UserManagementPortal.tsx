import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Briefcase, 
  Crown, 
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
  Lock
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

export type PortalSleeve = 'team_access' | 'workload' | 'sla_metrics' | 'profile';

interface UserManagementPortalProps {
  onBackToWorkspace: () => void;
  initialSleeve?: PortalSleeve;
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
  initialSleeve = 'team_access',
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

  // Sleeve ativa (Aba principal da página)
  const [activeSleeve, setActiveSleeve] = useState<PortalSleeve>(() => {
    if (!isOrgAdmin && !isDepartmentManager && initialSleeve === 'team_access') {
      return 'workload';
    }
    return initialSleeve;
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
  // SLEEVE 1: ESTADOS E FUNÇÕES DE "EQUIPE & ACESSOS"
  // ============================================================================
  type GovernanceTab = 'membros' | 'setores' | 'convites' | 'auditoria';
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>('membros');
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
    if (activeSleeve === 'team_access') {
      loadTeamData();
    }
  }, [activeSleeve, loadTeamData]);

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
  // SLEEVE 2: ESTADOS E FUNÇÕES DE "PRODUTIVIDADE DA EQUIPE ERGON" (BEA & VINI)
  // ============================================================================
  type WorkloadFilter = 'all' | 'bea' | 'vini' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'paused';
  const [includeFuture, setIncludeFuture] = useState(false);
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');

  const workloadSummary = useMemo(() => {
    return getWorkloadSummary(tasks, {
      includeFuture,
      currentYear,
      currentMonth,
    });
  }, [tasks, includeFuture, currentYear, currentMonth]);

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

    if (workloadFilter === 'bea') {
      return activeList.filter((t: Task) => (t.assignee || 'Bea') === 'Bea');
    }
    if (workloadFilter === 'vini') {
      return activeList.filter((t: Task) => t.assignee === 'Vini');
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

    return activeList;
  }, [includeFuture, tasks, workloadSummary, workloadFilter]);

  const handleQuickHandoff = (task: Task, newAssignee: 'Bea' | 'Vini') => {
    if (!onUpdateTask || task.assignee === newAssignee) return;
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
  // SLEEVE 3: ESTADOS E FUNÇÕES DE "MÉTRICAS & SLA OPERACIONAL"
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
  // SLEEVE 4: ESTADOS E FUNÇÕES DE "MEU PERFIL & SEGURANÇA"
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

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col font-['Inter',sans-serif] text-slate-800">
      
      {/* ==================================================================== */}
      {/* TOP HEADER: PORTAL DE GESTÃO DA ORGANIZAÇÃO (NAVY & GOLD ERGON)     */}
      {/* ==================================================================== */}
      <header className="bg-[#0d345e] text-white border-b-2 border-amber-400 shadow-md sticky top-0 z-30">
        <div className="w-full px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Esquerda: Botão Voltar ao Workspace + Identidade */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToWorkspace}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#08223f] hover:bg-blue-900 border border-blue-700/80 hover:border-amber-400 text-amber-300 font-bold text-xs transition cursor-pointer shadow-xs group"
              title="Voltar ao quadro Kanban e Calendário (ESC)"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar ao Workspace</span>
            </button>

            <div className="h-6 w-px bg-blue-900/80 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0d345e] font-black text-base flex items-center justify-center shadow-xs border border-amber-300">
                E
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white m-0">
                    ERGON CONTABILIDADE
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900">
                    Área de Gestão
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/90 font-medium leading-none">
                  Controle de Equipe, Acessos e Governança Operacional
                </p>
              </div>
            </div>
          </div>

          {/* Direita: Perfil do Operador e Sair */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#08223f] border border-blue-800">
              <div className="w-7 h-7 rounded-full bg-amber-400 text-[#0d345e] font-black text-xs flex items-center justify-center shadow-xs border border-amber-300">
                {user?.fullName?.charAt(0).toUpperCase() || 'O'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {user?.fullName || 'Operador'}
                </span>
                <span className="text-[10px] font-semibold text-amber-300 leading-tight">
                  {isOrgOwner ? '👑 Owner' : isOrgAdmin ? '🛡️ Admin' : isDepartmentManager ? '⭐ Chefe Setor' : '👤 Membro'}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-white font-bold text-xs transition cursor-pointer"
              title="Encerrar sessão com segurança"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>

        {/* BARRA DE NAVEGAÇÃO DE SLEEVES (ABAS PRINCIPAIS) */}
        <div className="w-full px-4 sm:px-8 bg-[#0a294a] flex items-center gap-1 border-t border-blue-950 overflow-x-auto">
          {(isOrgAdmin || isDepartmentManager) && (
            <button
              onClick={() => setActiveSleeve('team_access')}
              className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
                activeSleeve === 'team_access'
                  ? 'border-amber-400 text-amber-300 bg-blue-950/60'
                  : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-950/30'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Equipe & Acessos</span>
            </button>
          )}

          <button
            onClick={() => setActiveSleeve('workload')}
            className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeSleeve === 'workload'
                ? 'border-amber-400 text-amber-300 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-950/30'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Produtividade Equipe Ergon (Bea & Vini)</span>
          </button>

          {(isOrgAdmin || isDepartmentManager) && (
            <button
              onClick={() => setActiveSleeve('sla_metrics')}
              className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
                activeSleeve === 'sla_metrics'
                  ? 'border-amber-400 text-amber-300 bg-blue-950/60'
                  : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-950/30'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Métricas & SLA Operacional</span>
            </button>
          )}

          <button
            onClick={() => setActiveSleeve('profile')}
            className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeSleeve === 'profile'
                ? 'border-amber-400 text-amber-300 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-950/30'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Minha Conta & Segurança</span>
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* CONTEÚDO PRINCIPAL (TELA COMPLETA E ESPAÇOSA)                       */}
      {/* ==================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8">
        
        {/* ================================================================== */}
        {/* SLEEVE 1: EQUIPE & ACESSOS (GOVERNANÇA COMPLETA)                   */}
        {/* ================================================================== */}
        {activeSleeve === 'team_access' && (
          <div className="space-y-6">
            
            {/* Feedback Alerts */}
            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Sub-abas de Governança */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setGovernanceTab('membros')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    governanceTab === 'membros'
                      ? 'bg-[#0d345e] text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Membros & Vínculos ({members.length})</span>
                </button>

                <button
                  onClick={() => setGovernanceTab('setores')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    governanceTab === 'setores'
                      ? 'bg-[#0d345e] text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Setores ({departments.length})</span>
                </button>

                <button
                  onClick={() => setGovernanceTab('convites')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    governanceTab === 'convites'
                      ? 'bg-[#0d345e] text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Convidar / Pendentes ({invitations.filter((i) => i.status === 'pending').length})</span>
                </button>

                <button
                  onClick={() => setGovernanceTab('auditoria')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    governanceTab === 'auditoria'
                      ? 'bg-[#0d345e] text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Trilha de Auditoria</span>
                </button>
              </div>

              <button
                onClick={loadTeamData}
                disabled={loadingTeam}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
                title="Recarregar dados de governança"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTeam ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {/* ABA 1.1: MEMBROS & VÍNCULOS */}
            {governanceTab === 'membros' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
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
                  <div className="p-12 text-center text-slate-400 text-xs font-medium">
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
                                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                          <Crown className="w-2.5 h-2.5 text-amber-700" />
                                          OWNER
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
                                    <option value="owner">Owner (Proprietário)</option>
                                  </select>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] inline-block">
                                    {m.role === 'owner' ? 'Proprietário (Owner)' : m.role === 'admin' ? 'Administrador' : 'Membro'}
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

            {/* ABA 1.2: SETORES */}
            {governanceTab === 'setores' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Criação de Setor */}
                {isOrgAdmin && (
                  <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-400 text-[#0d345e] flex items-center justify-center font-bold text-xs">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-black text-slate-900">Novo Setor / Departamento</h2>
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
                          Descrição / Escopo
                        </label>
                        <textarea
                          rows={3}
                          value={newDeptDescription}
                          onChange={(e) => setNewDeptDescription(e.target.value)}
                          placeholder="Descrição opcional das rotinas..."
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
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
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

            {/* ABA 1.3: CONVIDAR / PENDENTES */}
            {governanceTab === 'convites' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form de Envio de Convite */}
                {isOrgAdmin && (
                  <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-400 text-[#0d345e] flex items-center justify-center font-bold text-xs">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-black text-slate-900">Convidar Novo Operador</h2>
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
                          <option value="member">Membro Operacional</option>
                          <option value="admin">Administrador Corporativo</option>
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
                            <option value="member">Operador / Membro</option>
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
                    <div className="p-12 text-center text-slate-400 text-xs font-medium">
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

            {/* ABA 1.4: TRILHA DE AUDITORIA FORENSE */}
            {governanceTab === 'auditoria' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Registro Forense de Ações e Alterações de Segurança</span>
                  <span className="text-[11px] text-slate-500 font-normal">Últimos eventos registrados</span>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-medium">
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

            {/* MODAL / DRAWER: GERENCIAR SETORES DE UM MEMBRO ESPECÍFICO */}
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
                    {/* Setores Atuais */}
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

                    {/* Adicionar a novo setor */}
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
        )}

        {/* ================================================================== */}
        {/* SLEEVE 2: PRODUTIVIDADE DA EQUIPE ERGON (BEA & VINI)               */}
        {/* ================================================================== */}
        {activeSleeve === 'workload' && (
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

            {/* Painel de Comparativo: Beatriz (Bea) vs. Vinicius (Vini) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Beatriz */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50/30 border border-purple-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                      B
                    </div>
                    <div>
                      <h3 className="text-base font-black text-purple-950">Beatriz (Bea)</h3>
                      <p className="text-xs text-purple-700 font-medium">Operadora Contábil & Fiscal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-purple-950">{workloadSummary.bea.totalActive}</span>
                    <span className="text-xs text-purple-700 block font-semibold">ativas</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-purple-900">
                    <span>Carga Relativa ({workloadSummary.bea.percentageOfActive}%)</span>
                    <span>{workloadSummary.bea.completedCount} concluídas</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-purple-100 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${workloadSummary.bea.percentageOfActive}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-100 text-center">
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Em Andamento</span>
                    <p className="text-sm font-black text-purple-900">{workloadSummary.bea.inProgressCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Atrasadas</span>
                    <p className="text-sm font-black text-rose-600">{workloadSummary.bea.delayedCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Pausadas</span>
                    <p className="text-sm font-black text-amber-600">{workloadSummary.bea.pausedCount}</p>
                  </div>
                </div>
              </div>

              {/* Card Vinicius */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-sky-50/30 border border-sky-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                      V
                    </div>
                    <div>
                      <h3 className="text-base font-black text-sky-950">Vinicius (Vini)</h3>
                      <p className="text-xs text-sky-700 font-medium">Operador Contábil & Fiscal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-sky-950">{workloadSummary.vini.totalActive}</span>
                    <span className="text-xs text-sky-700 block font-semibold">ativas</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-sky-900">
                    <span>Carga Relativa ({workloadSummary.vini.percentageOfActive}%)</span>
                    <span>{workloadSummary.vini.completedCount} concluídas</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-sky-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all duration-500"
                      style={{ width: `${workloadSummary.vini.percentageOfActive}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sky-100 text-center">
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Em Andamento</span>
                    <p className="text-sm font-black text-sky-900">{workloadSummary.vini.inProgressCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Atrasadas</span>
                    <p className="text-sm font-black text-rose-600">{workloadSummary.vini.delayedCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Pausadas</span>
                    <p className="text-sm font-black text-amber-600">{workloadSummary.vini.pausedCount}</p>
                  </div>
                </div>
              </div>
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
                <button
                  onClick={() => setWorkloadFilter('bea')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    workloadFilter === 'bea' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  Bea ({workloadSummary.bea.totalActive})
                </button>
                <button
                  onClick={() => setWorkloadFilter('vini')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    workloadFilter === 'vini' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  Vini ({workloadSummary.vini.totalActive})
                </button>
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

            {/* Lista de Tarefas da Equipe com Passagem de Bastão */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/60 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>Lista Operacional de Tarefas ({filteredWorkloadTasks.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Ações rápidas de bastão e pausa</span>
              </div>

              {filteredWorkloadTasks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
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
                        {/* Indicador de Responsável Atual */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          (task.assignee || 'Bea') === 'Bea'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-sky-100 text-sky-900 border border-sky-200'
                        }`}>
                          {(task.assignee || 'Bea') === 'Bea' ? '👤 Bea' : '👤 Vini'}
                        </span>

                        {/* Botão de Passagem de Bastão Rápido */}
                        <button
                          onClick={() => handleQuickHandoff(task, (task.assignee || 'Bea') === 'Bea' ? 'Vini' : 'Bea')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title={`Passar bastão para ${(task.assignee || 'Bea') === 'Bea' ? 'Vini' : 'Bea'}`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Passar para {(task.assignee || 'Bea') === 'Bea' ? 'Vini' : 'Bea'}</span>
                        </button>

                        {/* Botão de Pausa */}
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

                        {/* Detalhes / Abrir no Kanban */}
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

        {/* ================================================================== */}
        {/* SLEEVE 3: MÉTRICAS & SLA OPERACIONAL                               */}
        {/* ================================================================== */}
        {activeSleeve === 'sla_metrics' && (
          <div className="space-y-6">
            
            {/* Cards de SLA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Tempo Médio Conclusão</span>
                <p className="text-2xl font-black text-[#0d345e]">
                  {formatBusinessDuration(slaMetrics.avgDoneBusinessSec)}
                </p>
                <span className="text-[11px] text-slate-400">Janela útil (08h às 17h Seg-Sex)</span>
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

        {/* ================================================================== */}
        {/* SLEEVE 4: MINHA CONTA & SEGURANÇA                                  */}
        {/* ================================================================== */}
        {activeSleeve === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Dados do Usuário */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400 text-[#0d345e] font-black text-2xl flex items-center justify-center shadow-xs border border-amber-300">
                  {user?.fullName?.charAt(0).toUpperCase() || 'O'}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{user?.fullName || 'Operador Ergon'}</h3>
                  <p className="text-xs text-slate-500">{user?.email || 'Sem e-mail cadastrado'}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0d345e] text-amber-300">
                    {isOrgOwner ? '👑 Proprietário da Organização' : isOrgAdmin ? '🛡️ Administrador' : isDepartmentManager ? '⭐ Chefe de Setor' : '👤 Membro Operacional'}
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
                    {userDepartments.length > 0 ? userDepartments.map((d) => d.name).join(', ') : 'Todos os setores (Admin)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Ambiente de Dados:</span>
                  <span className="font-bold text-emerald-700">✓ Supabase DEV Conectado</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-500">Meta de Lançamento:</span>
                  <span className="font-bold text-[#0d345e]">Novembro de 2026</span>
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
                  <p className="text-xs text-slate-500">Atualize sua credencial com segurança</p>
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
  );
};

export default UserManagementPortal;
