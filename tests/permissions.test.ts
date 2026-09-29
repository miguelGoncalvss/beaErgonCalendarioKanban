import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canViewDepartmentTasks,
  canCreateTaskInDepartment,
  canUpdateTaskExecution,
  canEditTaskDetails,
  canAssignTask,
  canDeleteTask,
  canManageDepartments,
  canManageMembers,
  canTransferOwnership,
  canChangeTaskSector,
  type UserContext,
  type TaskContext,
} from '../src/utils/permissionUtils.ts';

describe('Matriz de Permissões e Controle de Acesso por Setor (Prompt Seção 6)', () => {
  const orgId = 'org-ergon-1';

  const memberContabilOnly: UserContext = {
    userId: 'user-emp-1',
    organizationId: orgId,
    organizationRole: 'member',
    isOrgActive: true,
    departmentMemberships: [
      { departmentId: 'dept-contabil', role: 'member', active: true },
    ],
  };

  const memberMultiSector: UserContext = {
    userId: 'user-emp-multi',
    organizationId: orgId,
    organizationRole: 'member',
    isOrgActive: true,
    departmentMemberships: [
      { departmentId: 'dept-contabil', role: 'member', active: true },
      { departmentId: 'dept-fiscal', role: 'member', active: true },
    ],
  };

  const managerFiscal: UserContext = {
    userId: 'user-boss-fiscal',
    organizationId: orgId,
    organizationRole: 'member',
    isOrgActive: true,
    departmentMemberships: [
      { departmentId: 'dept-fiscal', role: 'manager', active: true },
      { departmentId: 'dept-contabil', role: 'member', active: true },
    ],
  };

  const orgAdmin: UserContext = {
    userId: 'user-admin',
    organizationId: orgId,
    organizationRole: 'admin',
    isOrgActive: true,
    departmentMemberships: [],
  };

  const orgOwner: UserContext = {
    userId: 'user-owner',
    organizationId: orgId,
    organizationRole: 'owner',
    isOrgActive: true,
    departmentMemberships: [],
  };

  const inactiveUser: UserContext = {
    ...memberContabilOnly,
    userId: 'user-inactive',
    isOrgActive: false,
  };

  it('Usuário desativado não deve acessar nenhum recurso', () => {
    assert.equal(canViewDepartmentTasks(inactiveUser, 'dept-contabil'), false);
    assert.equal(canCreateTaskInDepartment(inactiveUser, 'dept-contabil'), false);
    assert.equal(canManageDepartments(inactiveUser), false);
  });

  it('Funcionário do Setor A não pode visualizar nem criar tarefas no Setor B', () => {
    // Pode no Contábil
    assert.equal(canViewDepartmentTasks(memberContabilOnly, 'dept-contabil'), true);
    assert.equal(canCreateTaskInDepartment(memberContabilOnly, 'dept-contabil'), true);

    // Bloqueado no Fiscal e no DP
    assert.equal(canViewDepartmentTasks(memberContabilOnly, 'dept-fiscal'), false);
    assert.equal(canCreateTaskInDepartment(memberContabilOnly, 'dept-fiscal'), false);
    assert.equal(canViewDepartmentTasks(memberContabilOnly, 'dept-dp'), false);
  });

  it('Participante de múltiplos setores acessa os autorizados, sem acesso ao terceiro', () => {
    // Acessa Contábil e Fiscal
    assert.equal(canViewDepartmentTasks(memberMultiSector, 'dept-contabil'), true);
    assert.equal(canViewDepartmentTasks(memberMultiSector, 'dept-fiscal'), true);

    // Não acessa DP
    assert.equal(canViewDepartmentTasks(memberMultiSector, 'dept-dp'), false);
    assert.equal(canCreateTaskInDepartment(memberMultiSector, 'dept-dp'), false);
  });

  it('Funcionário atualiza execução de tarefa atribuída a si, mas não reatribui a outros', () => {
    const myTask: TaskContext = {
      id: 'task-1',
      organizationId: orgId,
      departmentId: 'dept-contabil',
      assignedTo: memberContabilOnly.userId,
    };

    const otherTask: TaskContext = {
      id: 'task-2',
      organizationId: orgId,
      departmentId: 'dept-contabil',
      assignedTo: 'user-other',
    };

    // Pode atualizar execução da sua própria tarefa
    assert.equal(canUpdateTaskExecution(memberContabilOnly, myTask), true);

    // Não pode editar detalhes nem reatribuir sua própria tarefa a outros
    assert.equal(canEditTaskDetails(memberContabilOnly, myTask), false);
    assert.equal(canAssignTask(memberContabilOnly, myTask), false);

    // Não pode atualizar execução da tarefa de colega
    assert.equal(canUpdateTaskExecution(memberContabilOnly, otherTask), false);
  });

  it('Chefe do setor gerencia e reatribui no seu setor, mas não onde é membro comum', () => {
    const fiscalTask: TaskContext = {
      id: 'task-fiscal-1',
      organizationId: orgId,
      departmentId: 'dept-fiscal',
      assignedTo: 'user-someone',
    };

    const contabilTask: TaskContext = {
      id: 'task-contabil-1',
      organizationId: orgId,
      departmentId: 'dept-contabil',
      assignedTo: 'user-someone',
    };

    // No Fiscal (onde é manager): pode editar, reatribuir e excluir
    assert.equal(canEditTaskDetails(managerFiscal, fiscalTask), true);
    assert.equal(canAssignTask(managerFiscal, fiscalTask), true);
    assert.equal(canDeleteTask(managerFiscal, fiscalTask), true);

    // No Contábil (onde é apenas member comum): não pode editar nem reatribuir de terceiros
    assert.equal(canEditTaskDetails(managerFiscal, contabilTask), false);
    assert.equal(canAssignTask(managerFiscal, contabilTask), false);
  });

  it('Admin e Owner têm acesso pleno operacional e gerencial em qualquer setor da organização', () => {
    const anyTask: TaskContext = {
      id: 'task-dp-1',
      organizationId: orgId,
      departmentId: 'dept-dp',
      assignedTo: 'user-dp-staff',
    };

    assert.equal(canViewDepartmentTasks(orgAdmin, 'dept-dp'), true);
    assert.equal(canCreateTaskInDepartment(orgAdmin, 'dept-dp'), true);
    assert.equal(canEditTaskDetails(orgAdmin, anyTask), true);
    assert.equal(canAssignTask(orgAdmin, anyTask), true);
    assert.equal(canDeleteTask(orgAdmin, anyTask), true);
    assert.equal(canManageDepartments(orgAdmin), true);
    assert.equal(canManageMembers(orgAdmin), true);
  });

  it('Somente o Owner pode transferir a propriedade da organização', () => {
    assert.equal(canTransferOwnership(memberContabilOnly), false);
    assert.equal(canTransferOwnership(managerFiscal), false);
    assert.equal(canTransferOwnership(orgAdmin), false);
    assert.equal(canTransferOwnership(orgOwner), true);
  });

  it('Funcionário e Chefe não podem transferir tarefas entre setores; apenas Admin/Owner podem', () => {
    const taskContabil: TaskContext = {
      id: 'task-c-1',
      organizationId: orgId,
      departmentId: 'dept-contabil',
      assignedTo: memberContabilOnly.userId,
    };

    assert.equal(canChangeTaskSector(memberContabilOnly, taskContabil), false);
    assert.equal(canChangeTaskSector(managerFiscal, taskContabil), false);
    assert.equal(canChangeTaskSector(orgAdmin, taskContabil), true);
    assert.equal(canChangeTaskSector(orgOwner, taskContabil), true);
  });
});
