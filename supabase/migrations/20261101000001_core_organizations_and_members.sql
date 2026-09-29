-- ==============================================================================
-- MIGRAÇÃO 01: NÚCLEO ORGANIZACIONAL, SETORES, PERFIS E MEMBROS
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- Habilita extensão para geração de UUID caso não esteja ativa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABELA: ORGANIZATIONS (A organização ERGON)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TABELA: DEPARTMENTS (Setores da organização, ex: Contábil, Fiscal, DP, etc.)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_departments_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(active);

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. TABELA: PROFILES (Perfis dos usuários vinculados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. TABELA: ORGANIZATION_MEMBERS (Vínculo do usuário com a organização)
-- Papéis: 'owner' (dono), 'admin' (administrador), 'member' (funcionário comum)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_members_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON public.organization_members(active);

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_org_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. TABELA: DEPARTMENT_MEMBERS (Vínculo do usuário com um ou mais setores)
-- Papéis no setor: 'manager' (chefe do setor), 'member' (integrante operacional)
CREATE TABLE IF NOT EXISTS public.department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'member')),
    active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_dept_members_user UNIQUE (department_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON public.department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON public.department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_active ON public.department_members(active);

DROP TRIGGER IF EXISTS trg_dept_members_updated_at ON public.department_members;
CREATE TRIGGER trg_dept_members_updated_at
BEFORE UPDATE ON public.department_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. VALIDAÇÃO DE INTEGRIDADE: Membro do setor DEVE pertencer à organização do setor
CREATE OR REPLACE FUNCTION public.check_department_member_organization()
RETURNS TRIGGER AS $$
DECLARE
    dept_org_id UUID;
    is_member_of_org BOOLEAN;
BEGIN
    IF NEW.active = true THEN
        SELECT organization_id INTO dept_org_id
        FROM public.departments
        WHERE id = NEW.department_id;

        IF dept_org_id IS NULL THEN
            RAISE EXCEPTION 'Setor não encontrado.';
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_id = dept_org_id
              AND user_id = NEW.user_id
              AND active = true
        ) INTO is_member_of_org;

        IF NOT is_member_of_org THEN
            RAISE EXCEPTION 'O usuário deve pertencer à organização do setor antes de ser vinculado.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_dept_member_org ON public.department_members;
CREATE TRIGGER trg_check_dept_member_org
BEFORE INSERT OR UPDATE OF department_id, user_id, active ON public.department_members
FOR EACH ROW EXECUTE FUNCTION public.check_department_member_organization();

-- 7. PROTEÇÃO DE CONTINUIDADE: Não permitir remover ou desativar o último Owner ativo
CREATE OR REPLACE FUNCTION public.check_last_owner_protection()
RETURNS TRIGGER AS $$
DECLARE
    active_owners_count INTEGER;
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner' AND OLD.active = true) OR
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND OLD.active = true AND (NEW.active = false OR NEW.role <> 'owner')) THEN
        
        SELECT COUNT(*) INTO active_owners_count
        FROM public.organization_members
        WHERE organization_id = OLD.organization_id
          AND role = 'owner'
          AND active = true
          AND id <> OLD.id;

        IF active_owners_count < 1 THEN
            RAISE EXCEPTION 'Operação negada: A organização deve manter pelo menos um Owner ativo.';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_last_owner ON public.organization_members;
CREATE TRIGGER trg_protect_last_owner
BEFORE UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.check_last_owner_protection();

-- 8. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA DE PERFIL (auth.users -> public.profiles)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
