/**
-- Matriz de Permissões e Regras de Acesso da ERGON
-- Branch: release-login-nov
-- Baseada estritamente na Seção 6 de Prompt_AGY_ERGON.md
*/

import type { OrganizationRole, DepartmentRole } from '../types/auth';

export interface UserContext {
  userId: string;
  organizationId: string;
  organizationRole: OrganizationRole;
  isOrgActive: boolean;
  departmentMemberships: Array<{
    departmentId: string;
    role: DepartmentRole;
    active: boolean;
  }>;
}

export interface TaskContext {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
}

/**
 * Verifica se o usuário tem permissão para visualizar tarefas de um setor
 */
export function canViewDepartmentTasks(user: UserContext, departmentId: string): boolean {
  if (!user.isOrgActive) return false;
  // Admin ou Owner da organização tem visibilidade completa dos setores
  if (user.organizationRole === 'owner' || user.organizationRole === 'admin') {
    return true;
  }
  // Funcionário ou Chefe vê tarefas apenas dos setores dos quais participa ativamente
  return user.departmentMemberships.some(
    (m) => m.departmentId === departmentId && m.active
  );
}

/**
 * Verifica se o usuário tem permissão para criar tarefa em um setor
 */
export function canCreateTaskInDepartment(user: UserContext, departmentId: string): boolean {
  if (!user.isOrgActive) return false;
  if (user.organizationRole === 'owner' || user.organizationRole === 'admin') {
    return true;
  }
  return user.departmentMemberships.some(
    (m) => m.departmentId === departmentId && m.active
  );
}

/**
 * Verifica se o usuário pode atualizar campos operacionais (status, checklists, pausas)
 * de uma tarefa atribuída a si mesmo ou gerenciada por ele
 */
export function canUpdateTaskExecution(user: UserContext, task: TaskContext): boolean {
  if (!user.isOrgActive) return false;
  if (task.organizationId !== user.organizationId) return false;

  // Admin / Owner sempre pode
  if (user.organizationRole === 'owner' || user.organizationRole === 'admin') {
    return true;
  }

  // Atribuída a si próprio
  if (task.assignedTo && task.assignedTo === user.userId) {
    return true;
  }

  // Chefe do setor onde a tarefa está alocada
  if (task.departmentId) {
    const isManager = user.departmentMemberships.some(
      (m) => m.departmentId === task.departmentId && m.role === 'manager' && m.active
    );
    if (isManager) return true;
  }

  return false;
}

/**
 * Verifica se o usuário pode editar qualquer campo de gestão (prazo, prioridade, título, etc.)
 */
export function canEditTaskDetails(user: UserContext, task: TaskContext): boolean {
  if (!user.isOrgActive) return false;
  if (task.organizationId !== user.organizationId) return false;

  if (user.organizationRole === 'owner' || user.organizationRole === 'admin') {
    return true;
  }

  // Chefe do setor que gerencia
  if (task.departmentId) {
    return user.departmentMemberships.some(
      (m) => m.departmentId === task.departmentId && m.role === 'manager' && m.active
    );
  }

  return false;
}

/**
 * Verifica se o usuário pode distribuir ou reatribuir tarefas a terceiros
 */
export function canAssignTask(user: UserContext, task: TaskContext): boolean {
  return canEditTaskDetails(user, task);
}

/**
 * Verifica se o usuário pode excluir ou arquivar a tarefa
 */
export function canDeleteTask(user: UserContext, task: TaskContext): boolean {
  if (!user.isOrgActive) return false;
  if (task.organizationId !== user.organizationId) return false;

  if (user.organizationRole === 'owner' || user.organizationRole === 'admin') {
    return true;
  }

  if (task.departmentId) {
    return user.departmentMemberships.some(
      (m) => m.departmentId === task.departmentId && m.role === 'manager' && m.active
    );
  }

  return false;
}

/**
 * Verifica se o usuário pode administrar setores (criar, editar, desativar)
 */
export function canManageDepartments(user: UserContext): boolean {
  if (!user.isOrgActive) return false;
  return user.organizationRole === 'owner' || user.organizationRole === 'admin';
}

/**
 * Verifica se o usuário pode convidar pessoas e administrar vínculos na organização
 */
export function canManageMembers(user: UserContext): boolean {
  if (!user.isOrgActive) return false;
  return user.organizationRole === 'owner' || user.organizationRole === 'admin';
}

/**
 * Verifica se o usuário pode transferir a propriedade da organização (exclusivo do Owner)
 */
export function canTransferOwnership(user: UserContext): boolean {
  if (!user.isOrgActive) return false;
  return user.organizationRole === 'owner';
}

/**
 * Verifica se o usuário pode alterar a organização ou o setor de uma tarefa (apenas Admin/Owner inicialmente)
 */
export function canChangeTaskSector(user: UserContext, task: TaskContext): boolean {
  if (!user.isOrgActive) return false;
  if (task.organizationId !== user.organizationId) return false;
  return user.organizationRole === 'owner' || user.organizationRole === 'admin';
}
