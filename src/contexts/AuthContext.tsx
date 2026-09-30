import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import type { 
  UserProfile, 
  Organization, 
  OrganizationMember, 
  Department, 
  DepartmentMember, 
  OrganizationRole, 
  DepartmentRole 
} from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'deactivated' | 'no_membership';

export type AuthViewMode = 'login' | 'forgot_password' | 'update_password' | 'accept_invite';

interface AuthContextType {
  session: Session | null;
  status: AuthStatus;
  user: UserProfile | null;
  organization: Organization | null;
  organizationMember: OrganizationMember | null;
  organizationRole: OrganizationRole | null;
  departments: Department[];
  activeDepartment: Department | null;
  departmentRole: DepartmentRole | null;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  isGlobalAdmin: boolean;
  isDepartmentManager: boolean;
  viewMode: AuthViewMode;
  setViewMode: (mode: AuthViewMode) => void;
  setActiveDepartmentId: (deptId: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: string; success?: boolean }>;
  updateUserPassword: (newPassword: string) => Promise<{ error?: string; success?: boolean }>;
  refreshSessionData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationMember, setOrganizationMember] = useState<OrganizationMember | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [activeDepartmentId, setActiveDepartmentIdState] = useState<string | null>(() => {
    return localStorage.getItem('ergon_active_department_id');
  });
  const [viewMode, setViewModeState] = useState<AuthViewMode>('login');

  // Sincroniza viewMode e mantém a URL do navegador limpa e consistente
  const setViewMode = useCallback((mode: AuthViewMode) => {
    setViewModeState(mode);
    try {
      if (mode === 'login') {
        if (window.location.pathname !== '/' || window.location.hash) {
          window.history.replaceState(null, '', '/');
        }
      } else if (mode === 'forgot_password') {
        window.history.replaceState(null, '', '/esqueci-senha');
      } else if (mode === 'update_password') {
        window.history.replaceState(null, '', '/redefinir-senha');
      } else if (mode === 'accept_invite') {
        window.history.replaceState(null, '', '/aceitar-convite');
      }
    } catch {
      // Ignora restrições de sandbox em tempo de execução
    }
  }, []);

  // Detecta se a URL contém token legítimo de recuperação ou convite do Supabase
  useEffect(() => {
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';

    // Apenas entra em redefinição se houver token de recuperação na hash do Supabase
    if (hash.includes('type=recovery') || (pathname.includes('/redefinir-senha') && hash.includes('access_token'))) {
      setViewModeState('update_password');
    } else if (hash.includes('type=invite') || (pathname.includes('/aceitar-convite') && hash.includes('access_token'))) {
      setViewModeState('accept_invite');
    } else if (pathname.includes('/esqueci-senha')) {
      setViewModeState('forgot_password');
    } else {
      // Caso contrário, garante que o usuário esteja na tela de login e limpa qualquer rota fantasma
      setViewModeState('login');
      if (pathname.includes('/redefinir-senha') || pathname.includes('/aceitar-convite')) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      if (!isSupabaseConfigured()) {
        setStatus('unauthenticated');
        return;
      }

      // 1. Carrega Perfil do Usuário
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('Aviso ao consultar perfil:', profileErr.message);
      }

      const activeProfile: UserProfile = profileData ? {
        id: profileData.id,
        fullName: profileData.full_name,
        email: profileData.email,
        avatarUrl: profileData.avatar_url,
        active: Boolean(profileData.active),
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      } : {
        id: userId,
        fullName: 'Operador Ergon',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(activeProfile);

      // Se a conta de usuário estiver desativada
      if (profileData && profileData.active === false) {
        setStatus('deactivated');
        return;
      }

      // 2. Carrega vínculo com a Organização (ERGON)
      const { data: orgMemberData, error: orgMemberErr } = await supabase
        .from('organization_members')
        .select('*, organization:organizations(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (orgMemberErr) {
        console.warn('Aviso ao consultar organização:', orgMemberErr.message);
      }

      if (!orgMemberData) {
        // Usuário existe no Auth mas ainda não tem vínculo com a organização ERGON
        setStatus('no_membership');
        return;
      }

      if (orgMemberData.active === false) {
        setStatus('deactivated');
        return;
      }

      const member: OrganizationMember = {
        id: orgMemberData.id,
        organizationId: orgMemberData.organization_id,
        userId: orgMemberData.user_id,
        role: orgMemberData.role,
        active: Boolean(orgMemberData.active),
        createdAt: orgMemberData.created_at,
        updatedAt: orgMemberData.updated_at,
        organization: orgMemberData.organization ? {
          id: orgMemberData.organization.id,
          name: orgMemberData.organization.name,
          createdAt: orgMemberData.organization.created_at,
          updatedAt: orgMemberData.organization.updated_at,
        } : undefined,
      };

      setOrganizationMember(member);
      if (member.organization) {
        setOrganization(member.organization);
        localStorage.setItem('ergon_active_org_id', member.organization.id);
      }

      const isOrgAdminOrOwner = member.role === 'owner' || member.role === 'admin';

      // 3. Carrega Setores Autorizados
      let availableDepartments: Department[] = [];
      let userDeptMemberships: DepartmentMember[] = [];

      if (isOrgAdminOrOwner) {
        // Admin e Owner têm acesso a todos os setores ativos da organização
        const { data: allDepts } = await supabase
          .from('departments')
          .select('*')
          .eq('organization_id', member.organizationId)
          .eq('active', true)
          .order('name');

        if (allDepts) {
          availableDepartments = allDepts.map((d) => ({
            id: d.id,
            organizationId: d.organization_id,
            name: d.name,
            description: d.description,
            active: Boolean(d.active),
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }

        // Busca se possui chefias específicas registradas
        const { data: myDeptMembers } = await supabase
          .from('department_members')
          .select('*')
          .eq('user_id', userId);

        if (myDeptMembers) {
          userDeptMemberships = myDeptMembers.map((m) => ({
            id: m.id,
            departmentId: m.department_id,
            userId: m.user_id,
            role: m.role,
            active: Boolean(m.active),
            joinedAt: m.joined_at,
            updatedAt: m.updated_at,
          }));
        }
      } else {
        // Funcionário comum: apenas setores nos quais possui vínculo ativo
        const { data: myDeptMembers } = await supabase
          .from('department_members')
          .select('*, department:departments(*)')
          .eq('user_id', userId)
          .eq('active', true);

        if (myDeptMembers) {
          userDeptMemberships = myDeptMembers.map((m) => ({
            id: m.id,
            departmentId: m.department_id,
            userId: m.user_id,
            role: m.role,
            active: Boolean(m.active),
            joinedAt: m.joined_at,
            updatedAt: m.updated_at,
            department: m.department ? {
              id: m.department.id,
              organizationId: m.department.organization_id,
              name: m.department.name,
              description: m.department.description,
              active: Boolean(m.department.active),
              createdAt: m.department.created_at,
              updatedAt: m.department.updated_at,
            } : undefined,
          }));

          availableDepartments = userDeptMemberships
            .filter((m) => m.department && m.department.active)
            .map((m) => m.department!);
        }
      }

      setDepartments(availableDepartments);
      setDepartmentMembers(userDeptMemberships);

      // Define setor ativo inicial
      if (availableDepartments.length > 0) {
        const storedDeptId = localStorage.getItem('ergon_active_department_id');
        const validStored = availableDepartments.find((d) => d.id === storedDeptId);
        if (validStored) {
          setActiveDepartmentIdState(validStored.id);
        } else {
          setActiveDepartmentIdState(availableDepartments[0].id);
          localStorage.setItem('ergon_active_department_id', availableDepartments[0].id);
        }
      } else {
        setActiveDepartmentIdState(null);
      }

      setStatus('authenticated');
    } catch (err) {
      console.error('Erro ao carregar dados da sessão do usuário:', err);
      setStatus('authenticated'); // Permite prosseguir sem crash
    }
  }, []);

  // Monitora alterações de sessão do Supabase Auth
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('unauthenticated');
      return;
    }

    let isMounted = true;

    // Carrega sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession?.user) {
        loadUserData(currentSession.user.id);
      } else {
        setStatus('unauthenticated');
      }
    });

    // Escuta eventos em tempo real do Auth (login, logout, refresh, recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      if (event === 'PASSWORD_RECOVERY') {
        setViewMode('update_password');
        setStatus('unauthenticated');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          await loadUserData(newSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOrganization(null);
        setOrganizationMember(null);
        setDepartments([]);
        setDepartmentMembers([]);
        setActiveDepartmentIdState(null);
        localStorage.removeItem('ergon_active_department_id');
        setViewMode('login');
        setStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const setActiveDepartmentId = useCallback((deptId: string) => {
    setActiveDepartmentIdState(deptId);
    localStorage.setItem('ergon_active_department_id', deptId);
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'E-mail ou senha incorretos. Verifique suas credenciais.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'E-mail ainda não confirmado. Verifique sua caixa de entrada.' };
        }
        return { error: error.message };
      }

      // Limpa qualquer hash ou rota residual de recuperação/convite da URL
      if (window.location.hash || window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }

      if (data.user) {
        await loadUserData(data.user.id);
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Falha ao realizar login. Tente novamente.' };
    }
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Aviso no logout:', err);
    } finally {
      setSession(null);
      setUser(null);
      setOrganization(null);
      setOrganizationMember(null);
      setDepartments([]);
      setDepartmentMembers([]);
      setActiveDepartmentIdState(null);
      localStorage.removeItem('ergon_active_department_id');
      localStorage.removeItem('ergon_active_org_id');
      if (window.location.hash || window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
      setViewMode('login');
      setStatus('unauthenticated');
    }
  }, [setViewMode]);

  const requestPasswordReset = useCallback(async (email: string): Promise<{ error?: string; success?: boolean }> => {
    try {
      const redirectUrl = `${window.location.origin}/redefinir-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Falha ao solicitar recuperação de senha.' };
    }
  }, []);

  const updateUserPassword = useCallback(async (newPassword: string): Promise<{ error?: string; success?: boolean }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      if (window.location.hash || window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
      setViewMode('login');
      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Falha ao atualizar a senha.' };
    }
  }, [setViewMode]);

  const refreshSessionData = useCallback(async () => {
    if (session?.user) {
      await loadUserData(session.user.id);
    }
  }, [session, loadUserData]);

  const activeDepartment = useMemo(() => {
    if (activeDepartmentId === 'all') return null;
    if (!activeDepartmentId) return departments[0] || null;
    return departments.find((d) => d.id === activeDepartmentId) || departments[0] || null;
  }, [departments, activeDepartmentId]);

  const organizationRole = organizationMember?.role || null;
  const isOrgAdmin = organizationRole === 'owner' || organizationRole === 'admin';
  const isOrgOwner = organizationRole === 'owner';

  const departmentRole = useMemo((): DepartmentRole | null => {
    if (!activeDepartment) return null;
    const match = departmentMembers.find((m) => m.departmentId === activeDepartment.id && m.active);
    return match?.role || (isOrgAdmin ? 'manager' : 'member');
  }, [activeDepartment, departmentMembers, isOrgAdmin]);

  const isDepartmentManager = isOrgAdmin || departmentRole === 'manager';

  const value = useMemo(
    () => ({
      session,
      status,
      user,
      organization,
      organizationMember,
      organizationRole,
      departments,
      activeDepartment,
      departmentRole,
      isOrgAdmin,
      isOrgOwner,
      isGlobalAdmin: isOrgAdmin || isOrgOwner,
      isDepartmentManager,
      viewMode,
      setViewMode,
      setActiveDepartmentId,
      signInWithPassword,
      signOut,
      requestPasswordReset,
      updateUserPassword,
      refreshSessionData,
    }),
    [
      session,
      status,
      user,
      organization,
      organizationMember,
      organizationRole,
      departments,
      activeDepartment,
      departmentRole,
      isOrgAdmin,
      isOrgOwner,
      isDepartmentManager,
      viewMode,
      setActiveDepartmentId,
      signInWithPassword,
      signOut,
      requestPasswordReset,
      updateUserPassword,
      refreshSessionData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
