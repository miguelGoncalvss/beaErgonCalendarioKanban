import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
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
  Trash2, 
  Shield,
  Star,
  RefreshCw,
  Mail,
  History
} from 'lucide-react';
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

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'membros' | 'setores' | 'convites' | 'auditoria';

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const { user, organization, isOrgAdmin, isOrgOwner, refreshSessionData } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('membros');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dados carregados
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptMembers, setDeptMembers] = useState<DepartmentMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);

  // Form de Novo Setor
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  // Form de Convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteOrgRole, setInviteOrgRole] = useState<OrganizationRole>('member');
  const [inviteDeptId, setInviteDeptId] = useState<string>('');
  const [inviteDeptRole, setInviteDeptRole] = useState<DepartmentRole>('member');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Modal / Gaveta para Gerenciar Setores de um Membro
  const [selectedMemberForDepts, setSelectedMemberForDepts] = useState<OrganizationMember | null>(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignDeptRole, setAssignDeptRole] = useState<DepartmentRole>('member');

  // Limpa mensagens após alguns segundos
  const showFeedback = (success: string | null, error: string | null) => {
    setSuccessMessage(success);
    setErrorMessage(error);
    if (success) {
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const [membersData, deptsData, deptMembersData, invitesData, logsData] = await Promise.all([
        api.getOrganizationMembers(organization.id),
        api.getDepartments(organization.id),
        api.getAllDepartmentMembers(organization.id),
        api.getInvitations(organization.id),
        api.getAuditLogs(organization.id, 40),
      ]);

      setMembers(membersData);
      setDepartments(deptsData);
      setDeptMembers(deptMembersData);
      setInvitations(invitesData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error('Erro ao carregar dados de equipe:', err);
      showFeedback(null, err.message || 'Erro ao carregar dados de equipe.');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  // Handlers de Setores
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !organization?.id) return;
    setIsSubmittingDept(true);
    try {
      await api.createDepartment(organization.id, newDeptName.trim(), newDeptDescription.trim() || undefined);
      setNewDeptName('');
      setNewDeptDescription('');
      showFeedback('Setor criado com sucesso!', null);
      await loadData();
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
      showFeedback(`Setor ${dept.name} ${dept.active ? 'desativado' : 'reativado'} com sucesso!`, null);
      await loadData();
      await refreshSessionData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao alterar status do setor.');
    }
  };

  // Handlers de Membros
  const handleToggleMemberActive = async (member: OrganizationMember) => {
    if (member.role === 'owner' && member.active) {
      const activeOwners = members.filter((m) => m.role === 'owner' && m.active);
      if (activeOwners.length <= 1) {
        showFeedback(null, 'Não é permitido desativar o único Owner da organização.');
        return;
      }
    }

    try {
      await api.toggleMemberActive(member.id, !member.active);
      showFeedback(`Membro ${member.profile?.fullName || ''} ${member.active ? 'desativado' : 'reativado'} com sucesso!`, null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao alterar status do membro.');
    }
  };

  const handleChangeMemberRole = async (member: OrganizationMember, newRole: OrganizationRole) => {
    if (member.role === newRole) return;
    if (newRole === 'owner' && !isOrgOwner) {
      showFeedback(null, 'Apenas o Owner atual pode transferir a propriedade.');
      return;
    }

    try {
      await api.updateMemberRole(member.id, newRole);
      showFeedback(`Papel de ${member.profile?.fullName || ''} atualizado para ${newRole.toUpperCase()}!`, null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao atualizar papel do membro.');
    }
  };

  // Handlers de Vínculo com Setores
  const handleAssignToDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForDepts || !assignDeptId) return;

    try {
      await api.assignDepartmentMember(assignDeptId, selectedMemberForDepts.userId, assignDeptRole);
      setAssignDeptId('');
      setAssignDeptRole('member');
      showFeedback('Membro vinculado ao setor com sucesso!', null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao vincular membro ao setor.');
    }
  };

  const handleRemoveFromDept = async (deptMemberId: string) => {
    try {
      await api.removeDepartmentMember(deptMemberId);
      showFeedback('Membro desvinculado do setor.', null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao desvincular do setor.');
    }
  };

  // Handlers de Convites
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteFullName.trim() || !organization?.id) return;
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

      setInviteEmail('');
      setInviteFullName('');
      setInviteDeptId('');
      setInviteOrgRole('member');
      setInviteDeptRole('member');
      showFeedback(res.message || 'Operação realizada com sucesso!', null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao enviar convite.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await api.revokeInvitation(inviteId);
      showFeedback('Convite revogado com sucesso.', null);
      await loadData();
    } catch (err: any) {
      showFeedback(null, err.message || 'Falha ao revogar convite.');
    }
  };

  // Membros filtrados
  const filteredMembers = members.filter((m) => {
    if (!showInactiveMembers && !m.active) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = m.profile?.fullName?.toLowerCase().includes(query);
    const emailMatch = m.profile?.email?.toLowerCase().includes(query);
    return Boolean(nameMatch || emailMatch);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-['Inter',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp">
        
        {/* Header Corporativo Ergon */}
        <div className="bg-[#0d345e] px-6 py-4 flex items-center justify-between text-white border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0d345e] flex items-center justify-center font-black shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white m-0">
                  Equipe & Acessos
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900">
                  {organization?.name || 'ERGON'}
                </span>
              </div>
              <p className="text-xs text-blue-200/90 m-0">
                Gestão de pessoas, setores, vínculos e trilha de auditoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-[#08223f] hover:bg-blue-900 text-amber-300 transition cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#08223f] hover:bg-rose-950 text-slate-300 hover:text-white transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-slate-50 px-6 pt-3 border-b border-slate-200 flex items-center justify-between overflow-x-auto">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('membros')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                activeTab === 'membros'
                  ? 'bg-white border-amber-400 text-[#0d345e] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Membros & Vínculos ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('setores')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                activeTab === 'setores'
                  ? 'bg-white border-amber-400 text-[#0d345e] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-500" />
              <span>Setores ({departments.length})</span>
            </button>

            {isOrgAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('convites')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'convites'
                    ? 'bg-white border-amber-400 text-[#0d345e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
                }`}
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Convidar / Pendentes ({invitations.filter((i) => i.status === 'pending').length})</span>
              </button>
            )}

            {isOrgAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('auditoria')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'auditoria'
                    ? 'bg-white border-amber-400 text-[#0d345e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4 text-purple-600" />
                <span>Trilha de Auditoria</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback visual (Sucesso / Erro) */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ============================================================ */}
          {/* TAB 1: MEMBROS & VÍNCULOS                                   */}
          {/* ============================================================ */}
          {activeTab === 'membros' && (
            <div className="space-y-4">
              {/* Barra de Filtros e Busca */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactiveMembers}
                    onChange={(e) => setShowInactiveMembers(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Exibir membros desativados</span>
                </label>
              </div>

              {/* Lista de Membros */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {filteredMembers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum membro encontrado com os critérios de busca.
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const memberDepts = deptMembers.filter((dm) => dm.userId === member.userId && dm.active);
                    const isCaller = member.userId === user?.id;

                    return (
                      <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition">
                        
                        {/* Info Pessoal */}
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            member.active 
                              ? 'bg-amber-400 text-[#0d345e] shadow-xs' 
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {member.profile?.fullName ? member.profile.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {member.profile?.fullName || 'Usuário Sem Nome'}
                              </span>
                              {isCaller && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                  Você
                                </span>
                              )}

                              {/* Badge de Papel na Organização */}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                                member.role === 'owner' 
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                  : member.role === 'admin'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {member.role === 'owner' && <Crown className="w-2.5 h-2.5 text-purple-600" />}
                                {member.role === 'admin' && <Shield className="w-2.5 h-2.5 text-blue-600" />}
                                <span>{member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Membro'}</span>
                              </span>

                              {/* Status Ativo/Inativo */}
                              {!member.active && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                  Inativo
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 m-0">
                              {member.profile?.email || 'Sem e-mail cadastrado'}
                            </p>

                            {/* Setores Vinculados */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="text-[10.5px] text-slate-400 font-medium">Setores:</span>
                              {memberDepts.length === 0 ? (
                                <span className="text-[10.5px] text-amber-600 font-semibold italic">
                                  Nenhum setor vinculado
                                </span>
                              ) : (
                                memberDepts.map((dm) => (
                                  <span
                                    key={dm.id}
                                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                      dm.role === 'manager'
                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <Briefcase className="w-2.5 h-2.5 text-slate-500" />
                                    <span>{dm.department?.name || 'Setor'}</span>
                                    {dm.role === 'manager' && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-200/80 px-1 rounded flex items-center gap-0.5" title="Chefe deste setor">
                                        <Star className="w-2 h-2 fill-amber-700" /> Chefe
                                      </span>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações Administrativas */}
                        {isOrgAdmin && (
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Botão Gerenciar Setores */}
                            <button
                              type="button"
                              onClick={() => setSelectedMemberForDepts(member)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-blue-200"
                              title="Gerenciar setores deste membro"
                            >
                              <Briefcase className="w-3 h-3 text-blue-600" />
                              <span>Vínculos</span>
                            </button>

                            {/* Dropdown de Papel na Organização */}
                            <select
                              value={member.role}
                              disabled={member.role === 'owner' && !isOrgOwner}
                              onChange={(e) => handleChangeMemberRole(member, e.target.value as OrganizationRole)}
                              className="text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                              title="Alterar papel na organização"
                            >
                              {isOrgOwner && <option value="owner">Owner (Dono)</option>}
                              <option value="admin">Admin</option>
                              <option value="member">Membro</option>
                            </select>

                            {/* Ativar / Desativar */}
                            <button
                              type="button"
                              onClick={() => handleToggleMemberActive(member)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                member.active
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                              title={member.active ? 'Desativar acesso do membro' : 'Reativar acesso do membro'}
                            >
                              {member.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: SETORES / DEPARTAMENTOS                              */}
          {/* ============================================================ */}
          {activeTab === 'setores' && (
            <div className="space-y-6">
              {/* Formulário de Novo Setor (Apenas Admins) */}
              {isOrgAdmin && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-500" />
                    <span>Cadastrar Novo Setor</span>
                  </h3>

                  <form onSubmit={handleCreateDepartment} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nome do Setor *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="Ex: Fiscal, DP, Jurídico..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Descrição (Opcional)
                      </label>
                      <input
                        type="text"
                        value={newDeptDescription}
                        onChange={(e) => setNewDeptDescription(e.target.value)}
                        placeholder="Ex: Responsável por obrigações fiscais"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="submit"
                        disabled={isSubmittingDept || !newDeptName.trim()}
                        className="w-full py-1.5 px-4 bg-[#0d345e] hover:bg-blue-900 disabled:opacity-50 text-amber-300 font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isSubmittingDept ? 'Criando...' : 'Adicionar Setor'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Grid de Setores Cadastrados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((dept) => {
                  const assignedMembers = deptMembers.filter((dm) => dm.departmentId === dept.id && dm.active);
                  const managers = assignedMembers.filter((dm) => dm.role === 'manager');

                  return (
                    <div 
                      key={dept.id} 
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                        dept.active 
                          ? 'bg-white border-slate-200 shadow-xs hover:border-amber-400/80' 
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#0d345e] flex items-center justify-center font-bold">
                              <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 m-0">
                              {dept.name}
                            </h4>
                          </div>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            dept.active 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}>
                            {dept.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        {dept.description && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {dept.description}
                          </p>
                        )}

                        {/* Estatísticas e Membros */}
                        <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="font-medium">Total de Membros:</span>
                            <span className="font-bold text-slate-900">{assignedMembers.length}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="font-medium">Chefes de Setor:</span>
                            <span className="font-bold text-amber-700">
                              {managers.length > 0 
                                ? managers.map((m) => m.profile?.fullName || 'Usuário').join(', ')
                                : 'Nenhum definido'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ação de Ativar / Desativar Setor */}
                      {isOrgAdmin && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleDepartmentActive(dept)}
                            className={`text-xs font-bold px-3 py-1 rounded-lg transition cursor-pointer border ${
                              dept.active 
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {dept.active ? 'Desativar Setor' : 'Reativar Setor'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: CONVIDAR / PENDENTES                                 */}
          {/* ============================================================ */}
          {activeTab === 'convites' && isOrgAdmin && (
            <div className="space-y-6">
              {/* Formulário de Envio de Convite */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Convidar Novo Operador / Membro da Equipe</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  O operador receberá o acesso seguro para definir sua senha pessoal e ingressar imediatamente nas rotinas e Kanban.
                </p>

                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteFullName}
                        onChange={(e) => setInviteFullName(e.target.value)}
                        placeholder="Ex: Beatriz Silva ou Vinicius Santos"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail Corporativo *
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="exemplo@ergon.com.br"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Papel na Organização
                      </label>
                      <select
                        value={inviteOrgRole}
                        onChange={(e) => setInviteOrgRole(e.target.value as OrganizationRole)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                      >
                        <option value="member">Membro (Operacional)</option>
                        <option value="admin">Administrador (Gestão Global)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Setor Inicial (Opcional)
                      </label>
                      <select
                        value={inviteDeptId}
                        onChange={(e) => setInviteDeptId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                      >
                        <option value="">Nenhum setor (atribuir depois)</option>
                        {departments.filter((d) => d.active).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Papel no Setor
                      </label>
                      <select
                        disabled={!inviteDeptId}
                        value={inviteDeptRole}
                        onChange={(e) => setInviteDeptRole(e.target.value as DepartmentRole)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium disabled:opacity-50"
                      >
                        <option value="member">Integrante Comum</option>
                        <option value="manager">Chefe de Setor (Manager)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingInvite || !inviteEmail.trim() || !inviteFullName.trim()}
                      className="px-5 py-2 rounded-lg bg-[#0d345e] hover:bg-blue-900 disabled:opacity-50 text-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs"
                    >
                      <Mail className="w-4 h-4 text-amber-300" />
                      <span>{isSubmittingInvite ? 'Processando Convite...' : 'Enviar Convite & Vincular'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Convites Gerados */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                  Convites Recentes & Pendentes ({invitations.length})
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {invitations.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Nenhum convite registrado até o momento.
                    </div>
                  ) : (
                    invitations.map((inv) => (
                      <div key={inv.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{inv.fullName}</span>
                            <span className="text-xs text-slate-500">({inv.email})</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              inv.status === 'pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : inv.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {inv.status === 'pending' ? 'Pendente' : inv.status === 'accepted' ? 'Aceito' : 'Revogado'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>Papel: <strong className="text-slate-700 uppercase">{inv.orgRole}</strong></span>
                            <span>Criado em: {new Date(inv.createdAt).toLocaleDateString('pt-BR')}</span>
                            {inv.status === 'pending' && (
                              <span className="text-amber-700">Expira em: {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>

                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 cursor-pointer"
                            title="Revogar convite pendente"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: AUDITORIA ADMINISTRATIVA                              */}
          {/* ============================================================ */}
          {activeTab === 'auditoria' && isOrgAdmin && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Últimos eventos registrados no banco de dados</span>
                <span className="text-slate-400">Rastreabilidade forense de membros e convites</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum registro de auditoria disponível no momento.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                              {log.entityType.replace('_', ' ')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {log.action}
                            </span>
                          </div>
                          {log.newData && (
                            <p className="text-[11px] text-slate-500 m-0 mt-0.5 font-mono truncate max-w-lg">
                              {JSON.stringify(log.newData)}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10.5px] text-slate-400 shrink-0 font-medium">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Secundário: Gerenciar Setores de um Membro */}
        {selectedMemberForDepts && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden font-['Inter',sans-serif]">
              
              <div className="bg-[#0d345e] px-4 py-3 text-white flex items-center justify-between border-b-2 border-amber-400">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white">
                    Setores de: {selectedMemberForDepts.profile?.fullName || 'Usuário'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForDepts(null)}
                  className="text-slate-300 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Setores Atuais do Membro */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Setores Vinculados
                  </label>
                  <div className="space-y-1.5">
                    {deptMembers.filter((dm) => dm.userId === selectedMemberForDepts.userId && dm.active).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum setor vinculado a este membro.</p>
                    ) : (
                      deptMembers
                        .filter((dm) => dm.userId === selectedMemberForDepts.userId && dm.active)
                        .map((dm) => (
                          <div key={dm.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-800">{dm.department?.name || 'Setor'}</span>
                              <span className="text-[10px] text-slate-500 ml-2">
                                ({dm.role === 'manager' ? 'Chefe de Setor' : 'Integrante'})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromDept(dm.id)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-bold p-1 rounded cursor-pointer"
                              title="Remover deste setor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Formulário para Vincular a Outro Setor */}
                <form onSubmit={handleAssignToDept} className="pt-3 border-t border-slate-100 space-y-2.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Adicionar a um Setor
                  </label>

                  <select
                    required
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="member">Integrante Comum</option>
                    <option value="manager">Chefe de Setor (Manager)</option>
                  </select>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberForDepts(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Concluir
                    </button>
                    <button
                      type="submit"
                      disabled={!assignDeptId}
                      className="px-4 py-1.5 rounded-lg bg-[#0d345e] hover:bg-blue-900 disabled:opacity-50 text-amber-300 text-xs font-bold transition cursor-pointer"
                    >
                      Vincular
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
