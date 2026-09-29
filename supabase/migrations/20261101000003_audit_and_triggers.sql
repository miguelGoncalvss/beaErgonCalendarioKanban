-- ==============================================================================
-- MIGRAÇÃO 03: TABELA DE AUDITORIA FORENSE E TRIGGERS DE RASTREABILIDADE
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- 1. TABELA: AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- 'task', 'organization_member', 'department_member', 'department'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,      -- 'created', 'updated', 'transferred', 'role_changed', 'deactivated', 'deleted'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_dept ON public.audit_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 2. RLS PARA AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins da organização visualizam logs de auditoria" ON public.audit_logs;
CREATE POLICY "Admins da organização visualizam logs de auditoria"
ON public.audit_logs FOR SELECT
USING (public.is_org_admin(organization_id));

-- Usuários comuns não inserem nem alteram logs diretamente (somente triggers ou backend confiável)

-- 3. TRIGGER AUTOMÁTICO DE AUDITORIA DE MEMBROS DA ORGANIZAÇÃO
CREATE OR REPLACE FUNCTION public.audit_org_members_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            organization_id, actor_user_id, entity_type, entity_id, action, new_data
        ) VALUES (
            NEW.organization_id,
            auth.uid(),
            'organization_member',
            NEW.id::text,
            'created',
            jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role, 'active', NEW.active)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            organization_id, actor_user_id, entity_type, entity_id, action, old_data, new_data
        ) VALUES (
            NEW.organization_id,
            auth.uid(),
            'organization_member',
            NEW.id::text,
            CASE 
                WHEN OLD.role <> NEW.role THEN 'role_changed'
                WHEN OLD.active <> NEW.active AND NEW.active = false THEN 'deactivated'
                WHEN OLD.active <> NEW.active AND NEW.active = true THEN 'reactivated'
                ELSE 'updated'
            END,
            jsonb_build_object('role', OLD.role, 'active', OLD.active),
            jsonb_build_object('role', NEW.role, 'active', NEW.active)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            organization_id, actor_user_id, entity_type, entity_id, action, old_data
        ) VALUES (
            OLD.organization_id,
            auth.uid(),
            'organization_member',
            OLD.id::text,
            'deleted',
            jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_org_members ON public.organization_members;
CREATE TRIGGER trg_audit_org_members
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_org_members_changes();

-- 4. TRIGGER AUTOMÁTICO DE AUDITORIA DE MEMBROS DE SETORES
CREATE OR REPLACE FUNCTION public.audit_dept_members_changes()
RETURNS TRIGGER AS $$
DECLARE
    dept_org_id UUID;
BEGIN
    SELECT organization_id INTO dept_org_id
    FROM public.departments
    WHERE id = COALESCE(NEW.department_id, OLD.department_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, new_data
        ) VALUES (
            dept_org_id,
            NEW.department_id,
            auth.uid(),
            'department_member',
            NEW.id::text,
            'created',
            jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role, 'active', NEW.active)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, old_data, new_data
        ) VALUES (
            dept_org_id,
            NEW.department_id,
            auth.uid(),
            'department_member',
            NEW.id::text,
            CASE 
                WHEN OLD.role <> NEW.role THEN 'role_changed'
                WHEN OLD.active <> NEW.active AND NEW.active = false THEN 'deactivated'
                WHEN OLD.active <> NEW.active AND NEW.active = true THEN 'reactivated'
                ELSE 'updated'
            END,
            jsonb_build_object('role', OLD.role, 'active', OLD.active),
            jsonb_build_object('role', NEW.role, 'active', NEW.active)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, old_data
        ) VALUES (
            dept_org_id,
            OLD.department_id,
            auth.uid(),
            'department_member',
            OLD.id::text,
            'deleted',
            jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_dept_members ON public.department_members;
CREATE TRIGGER trg_audit_dept_members
AFTER INSERT OR UPDATE OR DELETE ON public.department_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_dept_members_changes();
