-- ==============================================================================
-- MIGRAÇÃO 07: ACEITE DE CONVITES, AUTO-VINCULAÇÃO E PROVISIONAMENTO DE MEMBROS
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- 1. CONSULTA PÚBLICA DE METADADOS DO CONVITE (Para exibição personalizada na tela de ativação)
CREATE OR REPLACE FUNCTION public.get_invitation_public_details(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
    inv RECORD;
BEGIN
    SELECT 
        i.id,
        i.email,
        i.full_name,
        i.org_role,
        i.dept_role,
        i.status,
        i.expires_at,
        i.organization_id,
        i.department_id,
        o.name AS organization_name,
        d.name AS department_name
    INTO inv
    FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    LEFT JOIN public.departments d ON d.id = i.department_id
    WHERE i.id = p_invitation_id;

    IF inv.id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'message', 'Convite não localizado no sistema.'
        );
    END IF;

    IF inv.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', inv.status,
            'email', inv.email,
            'full_name', inv.full_name,
            'message', CASE 
                WHEN inv.status = 'accepted' THEN 'Este convite já foi aceito e ativado anteriormente.'
                WHEN inv.status = 'revoked' THEN 'Este convite foi revogado pela administração.'
                WHEN inv.status = 'expired' THEN 'O prazo deste convite expirou.'
                ELSE 'Convite indisponível.'
            END
        );
    END IF;

    IF inv.expires_at < now() THEN
        UPDATE public.organization_invitations 
        SET status = 'expired', updated_at = now() 
        WHERE id = inv.id;

        RETURN jsonb_build_object(
            'valid', false, 
            'status', 'expired', 
            'email', inv.email,
            'full_name', inv.full_name,
            'message', 'O prazo de validade deste convite expirou.'
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'id', inv.id,
        'email', inv.email,
        'full_name', inv.full_name,
        'org_id', inv.organization_id,
        'org_name', inv.organization_name,
        'org_role', inv.org_role,
        'department_id', inv.department_id,
        'department_name', COALESCE(inv.department_name, 'Geral'),
        'dept_role', inv.dept_role,
        'expires_at', inv.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_invitation_public_details(UUID) TO anon, authenticated, service_role;


-- 2. FUNÇÃO DE ACEITE DE CONVITE AUTENTICADO
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
    inv RECORD;
    curr_user_id UUID;
    curr_user_email TEXT;
BEGIN
    curr_user_id := auth.uid();
    IF curr_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT email INTO curr_user_email
    FROM auth.users
    WHERE id = curr_user_id;

    SELECT * INTO inv
    FROM public.organization_invitations
    WHERE id = p_invitation_id;

    IF inv.id IS NULL THEN
        RAISE EXCEPTION 'Convite não encontrado.';
    END IF;

    IF inv.status = 'accepted' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Convite já foi ativado previamente.',
            'organization_id', inv.organization_id
        );
    END IF;

    IF inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Este convite não está ativo (Status atual: %)', inv.status;
    END IF;

    IF inv.expires_at < now() THEN
        UPDATE public.organization_invitations 
        SET status = 'expired', updated_at = now() 
        WHERE id = inv.id;
        RAISE EXCEPTION 'Este convite expirou.';
    END IF;

    -- Vincula ou reativa na organização
    INSERT INTO public.organization_members (organization_id, user_id, role, active)
    VALUES (inv.organization_id, curr_user_id, inv.org_role, true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, active = true, updated_at = now();

    -- Vincula ou reativa no departamento especificado
    IF inv.department_id IS NOT NULL THEN
        INSERT INTO public.department_members (department_id, user_id, role, active)
        VALUES (inv.department_id, curr_user_id, inv.dept_role, true)
        ON CONFLICT (department_id, user_id)
        DO UPDATE SET role = EXCLUDED.role, active = true, updated_at = now();
    END IF;

    -- Marca o convite como aceito
    UPDATE public.organization_invitations
    SET status = 'accepted', updated_at = now()
    WHERE id = inv.id;

    -- Registra auditoria forense do aceite
    INSERT INTO public.audit_logs (
        organization_id, department_id, actor_user_id, entity_type, entity_id, action, new_data
    ) VALUES (
        inv.organization_id,
        inv.department_id,
        curr_user_id,
        'organization_invitation',
        inv.id::text,
        'accepted',
        jsonb_build_object(
            'email', inv.email,
            'user_id', curr_user_id,
            'org_role', inv.org_role,
            'department_id', inv.department_id,
            'dept_role', inv.dept_role
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Convite aceito com sucesso! Bem-vindo à equipe.',
        'organization_id', inv.organization_id,
        'department_id', inv.department_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID) TO authenticated, service_role;


-- 3. TRIGGER ATUALIZADO: SINCRONIZAÇÃO E AUTO-VINCULAÇÃO NO SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    pending_inv RECORD;
BEGIN
    -- 1. Cria ou atualiza o perfil em public.profiles
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

    -- 2. Vinculação automática com convite pendente emitido previamente para este e-mail
    SELECT * INTO pending_inv
    FROM public.organization_invitations
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pending'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF pending_inv.id IS NOT NULL THEN
        -- Vincula o novo usuário à organização
        INSERT INTO public.organization_members (organization_id, user_id, role, active)
        VALUES (pending_inv.organization_id, NEW.id, pending_inv.org_role, true)
        ON CONFLICT (organization_id, user_id)
        DO UPDATE SET role = EXCLUDED.role, active = true, updated_at = now();

        -- Vincula ao departamento indicado no convite
        IF pending_inv.department_id IS NOT NULL THEN
            INSERT INTO public.department_members (department_id, user_id, role, active)
            VALUES (pending_inv.department_id, NEW.id, pending_inv.dept_role, true)
            ON CONFLICT (department_id, user_id)
            DO UPDATE SET role = EXCLUDED.role, active = true, updated_at = now();
        END IF;

        -- Atualiza o convite para aceito
        UPDATE public.organization_invitations
        SET status = 'accepted', updated_at = now()
        WHERE id = pending_inv.id;

        -- Registra auditoria
        INSERT INTO public.audit_logs (
            organization_id, department_id, actor_user_id, entity_type, entity_id, action, new_data
        ) VALUES (
            pending_inv.organization_id,
            pending_inv.department_id,
            NEW.id,
            'organization_invitation',
            pending_inv.id::text,
            'accepted_auto_signup',
            jsonb_build_object(
                'email', NEW.email,
                'user_id', NEW.id,
                'org_role', pending_inv.org_role,
                'department_id', pending_inv.department_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
