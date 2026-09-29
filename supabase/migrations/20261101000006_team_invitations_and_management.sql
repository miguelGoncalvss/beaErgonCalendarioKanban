-- ==============================================================================
-- MIGRAÇÃO 06: GESTÃO DE EQUIPE, CONVITES E CONTROLE DE ACESSOS ADMINISTRATIVOS
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- 1. TABELA: ORGANIZATION_INVITATIONS (Convites para a Organização e Setores)
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    org_role TEXT NOT NULL DEFAULT 'member' CHECK (org_role IN ('admin', 'member')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    dept_role TEXT NOT NULL DEFAULT 'member' CHECK (dept_role IN ('manager', 'member')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);

DROP TRIGGER IF EXISTS trg_org_invitations_updated_at ON public.organization_invitations;
CREATE TRIGGER trg_org_invitations_updated_at
BEFORE UPDATE ON public.organization_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS PARA ORGANIZATION_INVITATIONS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins visualizam convites da organização" ON public.organization_invitations;
CREATE POLICY "Admins visualizam convites da organização"
ON public.organization_invitations FOR SELECT
USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins criam convites na organização" ON public.organization_invitations;
CREATE POLICY "Admins criam convites na organização"
ON public.organization_invitations FOR INSERT
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins atualizam convites da organização" ON public.organization_invitations;
CREATE POLICY "Admins atualizam convites da organização"
ON public.organization_invitations FOR UPDATE
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins excluem convites da organização" ON public.organization_invitations;
CREATE POLICY "Admins excluem convites da organização"
ON public.organization_invitations FOR DELETE
USING (public.is_org_admin(organization_id));

-- 3. AUDITORIA FORENSE DE CONVITES
CREATE OR REPLACE FUNCTION public.audit_invitations_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, new_data
        ) VALUES (
            NEW.organization_id,
            NEW.department_id,
            auth.uid(),
            'organization_invitation',
            NEW.id::text,
            'created',
            jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name, 'org_role', NEW.org_role, 'status', NEW.status)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, old_data, new_data
        ) VALUES (
            NEW.organization_id,
            NEW.department_id,
            auth.uid(),
            'organization_invitation',
            NEW.id::text,
            CASE 
                WHEN NEW.status = 'revoked' THEN 'revoked'
                WHEN NEW.status = 'accepted' THEN 'accepted'
                ELSE 'updated'
            END,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_invitations ON public.organization_invitations;
CREATE TRIGGER trg_audit_invitations
AFTER INSERT OR UPDATE ON public.organization_invitations
FOR EACH ROW EXECUTE FUNCTION public.audit_invitations_changes();

-- 4. FUNÇÕES SEGURAS PARA ADMINISTRAÇÃO DE MEMBROS E VÍNCULOS

-- 4.1 Desativação/Reativação de Membro da Organização com proteção ao último Owner
CREATE OR REPLACE FUNCTION public.admin_toggle_member_active(p_member_id UUID, p_active BOOLEAN)
RETURNS VOID AS $$
DECLARE
    target_org_id UUID;
BEGIN
    SELECT organization_id INTO target_org_id
    FROM public.organization_members
    WHERE id = p_member_id;

    IF target_org_id IS NULL THEN
        RAISE EXCEPTION 'Membro não encontrado.';
    END IF;

    IF NOT public.is_org_admin(target_org_id) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores ou owners da organização podem alterar o status de membros.';
    END IF;

    UPDATE public.organization_members
    SET active = p_active,
        updated_at = now()
    WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.2 Alteração de Papel de Membro na Organização
CREATE OR REPLACE FUNCTION public.admin_update_member_role(p_member_id UUID, p_new_role TEXT)
RETURNS VOID AS $$
DECLARE
    target_org_id UUID;
    is_owner BOOLEAN;
BEGIN
    IF p_new_role NOT IN ('owner', 'admin', 'member') THEN
        RAISE EXCEPTION 'Papel inválido. Deve ser owner, admin ou member.';
    END IF;

    SELECT organization_id INTO target_org_id
    FROM public.organization_members
    WHERE id = p_member_id;

    IF target_org_id IS NULL THEN
        RAISE EXCEPTION 'Membro não encontrado.';
    END IF;

    -- Apenas o Owner pode promover a Owner ou alterar outros Owners
    IF p_new_role = 'owner' THEN
        IF NOT public.is_org_owner(target_org_id) THEN
            RAISE EXCEPTION 'Acesso negado: Apenas o Owner da organização pode nomear novos Owners.';
        END IF;
    ELSE
        IF NOT public.is_org_admin(target_org_id) THEN
            RAISE EXCEPTION 'Acesso negado: Apenas administradores ou owners podem alterar papéis.';
        END IF;
    END IF;

    UPDATE public.organization_members
    SET role = p_new_role,
        updated_at = now()
    WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 Criação e Vinculação de Convite ou Adição Direta
CREATE OR REPLACE FUNCTION public.admin_invite_or_add_member(
    p_org_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_org_role TEXT,
    p_dept_id UUID DEFAULT NULL,
    p_dept_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
    norm_email TEXT;
    existing_user_id UUID;
    existing_member_id UUID;
    invitation_id UUID;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem convidar membros.';
    END IF;

    norm_email := lower(trim(p_email));
    IF norm_email = '' OR norm_email NOT LIKE '%@%' THEN
        RAISE EXCEPTION 'E-mail inválido.';
    END IF;

    -- Verifica se já existe um usuário com esse e-mail no profiles
    SELECT id INTO existing_user_id
    FROM public.profiles
    WHERE lower(email) = norm_email
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        -- Verifica se já é membro da organização
        SELECT id INTO existing_member_id
        FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = existing_user_id;

        IF existing_member_id IS NOT NULL THEN
            -- Reativa o membro se estiver inativo
            UPDATE public.organization_members
            SET active = true, role = p_org_role, updated_at = now()
            WHERE id = existing_member_id;
        ELSE
            -- Insere vínculo de membro
            INSERT INTO public.organization_members (organization_id, user_id, role, active)
            VALUES (p_org_id, existing_user_id, p_org_role, true)
            RETURNING id INTO existing_member_id;
        END IF;

        -- Se foi especificado setor, vincula no setor
        IF p_dept_id IS NOT NULL THEN
            INSERT INTO public.department_members (department_id, user_id, role, active)
            VALUES (p_dept_id, existing_user_id, p_dept_role, true)
            ON CONFLICT (department_id, user_id) 
            DO UPDATE SET role = p_dept_role, active = true, updated_at = now();
        END IF;

        RETURN jsonb_build_object(
            'status', 'added_directly',
            'user_id', existing_user_id,
            'member_id', existing_member_id,
            'message', 'Usuário existente vinculado com sucesso à organização!'
        );
    END IF;

    -- Usuário ainda não cadastrado: cria registro de convite
    INSERT INTO public.organization_invitations (
        organization_id, email, full_name, org_role, department_id, dept_role, invited_by, status
    ) VALUES (
        p_org_id, norm_email, trim(p_full_name), p_org_role, p_dept_id, p_dept_role, auth.uid(), 'pending'
    )
    RETURNING id INTO invitation_id;

    RETURN jsonb_build_object(
        'status', 'invitation_created',
        'invitation_id', invitation_id,
        'email', norm_email,
        'message', 'Convite gerado com sucesso para ativação pelo operador!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
