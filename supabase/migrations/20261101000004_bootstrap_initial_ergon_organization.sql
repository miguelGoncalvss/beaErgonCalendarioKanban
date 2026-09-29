-- ==============================================================================
-- MIGRAÇÃO 04: BOOTSTRAP CONTROLADO DA ORGANIZAÇÃO ERGON
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- 1. PROVISIONAMENTO CONTROLADO DA ORGANIZAÇÃO ERGON (IDEMPOTENTE)
INSERT INTO public.organizations (name)
VALUES ('ERGON')
ON CONFLICT (name) DO NOTHING;

-- 2. CADASTRO DO PRIMEIRO SETOR REFERÊNCIA (CONTÁBIL)
INSERT INTO public.departments (organization_id, name, description, active)
SELECT id, 'Contábil', 'Setor Operacional Contábil e Gestão de Entregas', true
FROM public.organizations
WHERE name = 'ERGON'
ON CONFLICT (organization_id, name) DO NOTHING;

-- 3. PROCEDIMENTO ADMINISTRATIVO CONTROLADO: VINCULAR PRIMEIRO OWNER
-- Esta função pode ser executada por um administrador no SQL Editor do Supabase 
-- passando o e-mail do usuário que acabou de ser criado no Supabase Auth.
CREATE OR REPLACE FUNCTION public.bootstrap_assign_first_owner(target_email TEXT)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    target_org_id UUID;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = lower(trim(target_email))
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado no Supabase Auth. Crie a conta no painel Auth primeiro.', target_email;
    END IF;

    SELECT id INTO target_org_id 
    FROM public.organizations 
    WHERE name = 'ERGON' 
    LIMIT 1;

    IF target_org_id IS NULL THEN
        RAISE EXCEPTION 'Organização ERGON não encontrada.';
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role, active)
    VALUES (target_org_id, target_user_id, 'owner', true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'owner', active = true, updated_at = now();

    RETURN json_build_object(
        'status', 'success',
        'organization_id', target_org_id,
        'user_id', target_user_id,
        'role', 'owner',
        'assigned_at', now()
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
