/**
-- Tipos Oficiais de Organização, Setores, Perfis e Permissões
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
*/

export type OrganizationRole = 'owner' | 'admin' | 'member';

export type DepartmentRole = 'manager' | 'member';

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string; // Referência a auth.users.id
  fullName: string;
  email?: string;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos preenchidos via JOIN para conveniência na interface
  profile?: UserProfile;
  organization?: Organization;
}

export interface DepartmentMember {
  id: string;
  departmentId: string;
  userId: string;
  role: DepartmentRole;
  active: boolean;
  joinedAt: string;
  updatedAt: string;
  // Campos preenchidos via JOIN para conveniência na interface
  profile?: UserProfile;
  department?: Department;
}

export interface UserSessionContext {
  user: UserProfile | null;
  organization: Organization | null;
  organizationRole: OrganizationRole | null;
  departments: Department[];
  activeDepartmentId: string | null;
  departmentRole: DepartmentRole | null;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  isDepartmentManager: boolean;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  orgRole: OrganizationRole;
  departmentId?: string | null;
  deptRole: DepartmentRole;
  invitedBy?: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}
