-- ==============================================================================
-- MIGRAÇÃO 02: POLÍTICAS RLS E FUNÇÕES DE AUTORIZAÇÃO (ROW LEVEL SECURITY)
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- ==================== FUNÇÕES AUXILIARES DE SEGURANÇA ====================
-- Utilizam SECURITY DEFINER com search_path fixo e SELECT ... INTO var para compatibilidade universal

-- 1. Verifica se o usuário autenticado é membro ativo da organização
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    found_member BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND active = true
    ) INTO found_member;

    RETURN found_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Verifica se o usuário autenticado é Admin ou Owner da organização
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    found_admin BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND active = true
    ) INTO found_admin;

    RETURN found_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Verifica se o usuário autenticado é Owner da organização
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    found_owner BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role = 'owner'
          AND active = true
    ) INTO found_owner;

    RETURN found_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Verifica se o usuário autenticado é membro ativo do setor (ou admin da organização)
CREATE OR REPLACE FUNCTION public.is_department_member(dept_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    dept_org_id UUID;
    found_member BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT organization_id INTO dept_org_id
    FROM public.departments
    WHERE id = dept_id;

    IF dept_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.is_org_admin(dept_org_id) THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.department_members
        WHERE department_id = dept_id
          AND user_id = auth.uid()
          AND active = true
    ) INTO found_member;

    RETURN found_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Verifica se o usuário autenticado é Chefe (Manager) do setor (ou admin da organização)
CREATE OR REPLACE FUNCTION public.is_department_manager(dept_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    dept_org_id UUID;
    found_manager BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT organization_id INTO dept_org_id
    FROM public.departments
    WHERE id = dept_id;

    IF dept_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.is_org_admin(dept_org_id) THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.department_members
        WHERE department_id = dept_id
          AND user_id = auth.uid()
          AND role = 'manager'
          AND active = true
    ) INTO found_manager;

    RETURN found_manager;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Verifica se dois usuários compartilham ao menos uma organização ativa
CREATE OR REPLACE FUNCTION public.shares_organization(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    shared BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    IF auth.uid() = target_user_id THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members my_org
        JOIN public.organization_members other_org 
          ON my_org.organization_id = other_org.organization_id
        WHERE my_org.user_id = auth.uid()
          AND other_org.user_id = target_user_id
          AND my_org.active = true
          AND other_org.active = true
    ) INTO shared;

    RETURN shared;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==================== APLICAÇÃO DE ROW LEVEL SECURITY ====================

-- 1. TABELA: ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros visualizam sua organização" ON public.organizations;
CREATE POLICY "Membros visualizam sua organização"
ON public.organizations FOR SELECT
USING (public.is_org_member(id));

DROP POLICY IF EXISTS "Admins atualizam dados da organização" ON public.organizations;
CREATE POLICY "Admins atualizam dados da organização"
ON public.organizations FOR UPDATE
USING (public.is_org_admin(id))
WITH CHECK (public.is_org_admin(id));

-- 2. TABELA: DEPARTMENTS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros da organização visualizam setores" ON public.departments;
CREATE POLICY "Membros da organização visualizam setores"
ON public.departments FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins criam setores na organização" ON public.departments;
CREATE POLICY "Admins criam setores na organização"
ON public.departments FOR INSERT
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins atualizam setores na organização" ON public.departments;
CREATE POLICY "Admins atualizam setores na organização"
ON public.departments FOR UPDATE
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

-- 3. TABELA: PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários visualizam colegas da mesma organização" ON public.profiles;
CREATE POLICY "Usuários visualizam colegas da mesma organização"
ON public.profiles FOR SELECT
USING (public.shares_organization(id));

DROP POLICY IF EXISTS "Usuários editam apenas seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários editam apenas seu próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. TABELA: ORGANIZATION_MEMBERS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros visualizam vínculos de sua organização" ON public.organization_members;
CREATE POLICY "Membros visualizam vínculos de sua organização"
ON public.organization_members FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins inserem novos vínculos na organização" ON public.organization_members;
CREATE POLICY "Admins inserem novos vínculos na organização"
ON public.organization_members FOR INSERT
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins alteram vínculos na organização" ON public.organization_members;
CREATE POLICY "Admins alteram vínculos na organização"
ON public.organization_members FOR UPDATE
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins removem vínculos na organização" ON public.organization_members;
CREATE POLICY "Admins removem vínculos na organização"
ON public.organization_members FOR DELETE
USING (public.is_org_admin(organization_id));

-- 5. TABELA: DEPARTMENT_MEMBERS
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros visualizam vínculos de setores da organização" ON public.department_members;
CREATE POLICY "Membros visualizam vínculos de setores da organização"
ON public.department_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = department_id
          AND public.is_org_member(d.organization_id)
    )
);

DROP POLICY IF EXISTS "Admins e Chefes vinculam membros aos setores" ON public.department_members;
CREATE POLICY "Admins e Chefes vinculam membros aos setores"
ON public.department_members FOR INSERT
WITH CHECK (public.is_department_manager(department_id));

DROP POLICY IF EXISTS "Admins e Chefes alteram vínculos dos setores" ON public.department_members;
CREATE POLICY "Admins e Chefes alteram vínculos dos setores"
ON public.department_members FOR UPDATE
USING (public.is_department_manager(department_id))
WITH CHECK (public.is_department_manager(department_id));

DROP POLICY IF EXISTS "Admins e Chefes removem vínculos dos setores" ON public.department_members;
CREATE POLICY "Admins e Chefes removem vínculos dos setores"
ON public.department_members FOR DELETE
USING (public.is_department_manager(department_id));
