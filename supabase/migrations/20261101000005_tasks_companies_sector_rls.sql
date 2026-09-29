-- ==============================================================================
-- MIGRAÇÃO 05: SETORIZAÇÃO DE TAREFAS, CLIENTES E POLÍTICAS RLS ESTRITAS
-- Branch: release-login-nov
-- Meta de Lançamento: Novembro de 2026
-- ==============================================================================

-- 1. EVOLUÇÃO DAS TABELAS COM COLUNAS DE ESCOPO ORGANIZACIONAL E SETORIAL

-- 1.1 Tabela companies (Clientes da organização)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_companies_organization ON public.companies(organization_id);

-- 1.2 Tabela tasks (Demandas e Tarefas Operacionais)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_organization ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 1.3 Tabela day_notes (Compromissos e Notas do Calendário)
ALTER TABLE public.day_notes 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_day_notes_organization ON public.day_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_day_notes_department ON public.day_notes(department_id);

-- 2. BACKFILL CONTROLADO: VINCULAR DADOS EXISTENTES À ORGANIZAÇÃO ERGON E SETOR CONTÁBIL
DO $$
DECLARE
    default_org_id UUID;
    default_dept_id UUID;
BEGIN
    SELECT id INTO default_org_id 
    FROM public.organizations 
    WHERE name = 'ERGON' 
    LIMIT 1;

    IF default_org_id IS NOT NULL THEN
        SELECT id INTO default_dept_id 
        FROM public.departments 
        WHERE organization_id = default_org_id 
          AND name = 'Contábil' 
        LIMIT 1;

        -- 2.1 Vincular empresas legadas à organização ERGON
        UPDATE public.companies 
        SET organization_id = default_org_id 
        WHERE organization_id IS NULL;

        -- 2.2 Vincular tarefas legadas à organização ERGON e setor Contábil
        UPDATE public.tasks 
        SET organization_id = default_org_id 
        WHERE organization_id IS NULL;

        IF default_dept_id IS NOT NULL THEN
            UPDATE public.tasks 
            SET department_id = default_dept_id 
            WHERE department_id IS NULL;
        END IF;

        -- 2.3 Vincular notas legadas à organização ERGON e setor Contábil
        UPDATE public.day_notes 
        SET organization_id = default_org_id 
        WHERE organization_id IS NULL;

        IF default_dept_id IS NOT NULL THEN
            UPDATE public.day_notes 
            SET department_id = default_dept_id 
            WHERE department_id IS NULL;
        END IF;
    END IF;
END;
$$;

-- 3. TRIGGERS DE CONSISTÊNCIA, INFERÊNCIA E PROTEÇÃO SETORIAL (MATRIZ SEÇÃO 6)

-- 3.1 Trigger para tarefas (tasks)
CREATE OR REPLACE FUNCTION public.check_task_sector_consistency()
RETURNS TRIGGER AS $$
DECLARE
    dept_org_id UUID;
    is_admin BOOLEAN;
    is_manager BOOLEAN;
BEGIN
    -- Se organization_id for nulo mas department_id foi informado, infere automaticamente
    IF NEW.organization_id IS NULL AND NEW.department_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.departments
        WHERE id = NEW.department_id;
    END IF;

    -- Se organization_id ainda for nulo e o usuário estiver autenticado, infere da organização do usuário
    IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT om.organization_id INTO NEW.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.active = true
        ORDER BY om.created_at ASC
        LIMIT 1;
    END IF;

    -- Se department_id for nulo, tenta inferir do vínculo setorial do usuário
    IF NEW.department_id IS NULL AND NEW.organization_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
        SELECT dm.department_id INTO NEW.department_id
        FROM public.department_members dm
        JOIN public.departments d ON d.id = dm.department_id
        WHERE dm.user_id = auth.uid() 
          AND dm.active = true 
          AND d.organization_id = NEW.organization_id
        LIMIT 1;
    END IF;

    -- Validação de consistência: o setor deve obrigatoriamente pertencer à organização
    IF NEW.department_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
        SELECT organization_id INTO dept_org_id
        FROM public.departments
        WHERE id = NEW.department_id;

        IF dept_org_id IS NULL OR dept_org_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'Inconsistência de dados: O setor informado não pertence à organização da tarefa.';
        END IF;
    END IF;

    -- Validação do responsável (assigned_to): deve ser membro ativo da organização e do setor
    IF NEW.assigned_to IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = NEW.assigned_to
              AND om.organization_id = NEW.organization_id
              AND om.active = true
        ) THEN
            RAISE EXCEPTION 'Inconsistência de dados: O operador responsável não pertence à organização da tarefa.';
        END IF;

        IF NEW.department_id IS NOT NULL AND NOT public.is_org_admin(NEW.organization_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.department_members dm
                WHERE dm.user_id = NEW.assigned_to
                  AND dm.department_id = NEW.department_id
                  AND dm.active = true
            ) THEN
                RAISE EXCEPTION 'Inconsistência de dados: O operador responsável não pertence ao setor da tarefa.';
            END IF;
        END IF;
    END IF;

    -- Define created_by automaticamente com o autor autenticado
    IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;

    -- Restrições para UPDATE de tarefas (Matriz de Permissões Seção 6)
    IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
        is_admin := (NEW.organization_id IS NOT NULL AND public.is_org_admin(NEW.organization_id));
        
        IF NOT is_admin THEN
            is_manager := (NEW.department_id IS NOT NULL AND public.is_department_manager(NEW.department_id));

            IF NOT is_manager THEN
                -- Funcionário comum não altera setor nem organização
                IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
                    RAISE EXCEPTION 'Operação negada: Apenas administradores ou chefes de setor podem transferir tarefas entre setores.';
                END IF;

                IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
                    RAISE EXCEPTION 'Operação negada: A organização da tarefa não pode ser modificada.';
                END IF;

                -- Funcionário comum não pode reatribuir a tarefa a terceiros
                IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> auth.uid() THEN
                    RAISE EXCEPTION 'Operação negada: Funcionários não possuem permissão para reatribuir tarefas a outros operadores.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_task_sector ON public.tasks;
CREATE TRIGGER trg_check_task_sector
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.check_task_sector_consistency();

-- 3.2 Trigger para inferir organization_id em empresas (companies)
CREATE OR REPLACE FUNCTION public.check_company_org()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT om.organization_id INTO NEW.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.active = true
        ORDER BY om.created_at ASC
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_company_org ON public.companies;
CREATE TRIGGER trg_check_company_org
BEFORE INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.check_company_org();

-- 3.3 Trigger para inferir escopo em notas do calendário (day_notes)
CREATE OR REPLACE FUNCTION public.check_day_note_org_dept()
RETURNS TRIGGER AS $$
DECLARE
    dept_org_id UUID;
BEGIN
    IF NEW.organization_id IS NULL AND NEW.department_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.departments
        WHERE id = NEW.department_id;
    END IF;

    IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT om.organization_id INTO NEW.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.active = true
        ORDER BY om.created_at ASC
        LIMIT 1;
    END IF;

    IF NEW.department_id IS NULL AND NEW.organization_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
        SELECT dm.department_id INTO NEW.department_id
        FROM public.department_members dm
        JOIN public.departments d ON d.id = dm.department_id
        WHERE dm.user_id = auth.uid() 
          AND dm.active = true 
          AND d.organization_id = NEW.organization_id
        LIMIT 1;
    END IF;

    IF NEW.department_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
        SELECT organization_id INTO dept_org_id
        FROM public.departments
        WHERE id = NEW.department_id;

        IF dept_org_id IS NULL OR dept_org_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'Inconsistência de dados: O setor informado não pertence à organização da anotação.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_day_note_org_dept ON public.day_notes;
CREATE TRIGGER trg_check_day_note_org_dept
BEFORE INSERT OR UPDATE ON public.day_notes
FOR EACH ROW EXECUTE FUNCTION public.check_day_note_org_dept();

-- 4. APLICAÇÃO DE ROW LEVEL SECURITY (RLS) ESTRITO

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

-- 4.1 Limpeza de políticas públicas legadas e anteriores
DROP POLICY IF EXISTS "Permitir leitura de empresas" ON public.companies;
DROP POLICY IF EXISTS "Permitir inserção de empresas" ON public.companies;
DROP POLICY IF EXISTS "Permitir atualização de empresas" ON public.companies;
DROP POLICY IF EXISTS "Permitir exclusão de empresas" ON public.companies;
DROP POLICY IF EXISTS "Membros visualizam empresas da organização" ON public.companies;
DROP POLICY IF EXISTS "Membros cadastram empresas na organização" ON public.companies;
DROP POLICY IF EXISTS "Admins atualizam empresas da organização" ON public.companies;
DROP POLICY IF EXISTS "Admins excluem empresas da organização" ON public.companies;

DROP POLICY IF EXISTS "Permitir leitura de tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Permitir inserção de tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Permitir atualização de tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Permitir exclusão de tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros visualizam tarefas do setor ou org" ON public.tasks;
DROP POLICY IF EXISTS "Operadores criam tarefas no setor" ON public.tasks;
DROP POLICY IF EXISTS "Operadores atualizam tarefas autorizadas" ON public.tasks;
DROP POLICY IF EXISTS "Admins e Chefes excluem tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Permitir leitura de notas" ON day_notes;
DROP POLICY IF EXISTS "Permitir inserção de notas" ON day_notes;
DROP POLICY IF EXISTS "Permitir atualização de notas" ON day_notes;
DROP POLICY IF EXISTS "Permitir exclusão de notas" ON day_notes;
DROP POLICY IF EXISTS "Membros visualizam notas do setor ou org" ON public.day_notes;
DROP POLICY IF EXISTS "Operadores criam notas no setor" ON public.day_notes;
DROP POLICY IF EXISTS "Operadores atualizam notas do setor" ON public.day_notes;
DROP POLICY IF EXISTS "Admins e Chefes excluem notas" ON public.day_notes;

-- 4.2 Novas Políticas RLS para COMPANIES (Clientes)
CREATE POLICY "Membros visualizam empresas da organização"
ON public.companies FOR SELECT
USING (
    public.is_org_member(organization_id) OR
    organization_id IS NULL
);

CREATE POLICY "Membros cadastram empresas na organização"
ON public.companies FOR INSERT
WITH CHECK (
    public.is_org_member(organization_id)
);

CREATE POLICY "Admins atualizam empresas da organização"
ON public.companies FOR UPDATE
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins excluem empresas da organização"
ON public.companies FOR DELETE
USING (public.is_org_admin(organization_id));

-- 4.3 Novas Políticas RLS para TASKS (Tarefas)
CREATE POLICY "Membros visualizam tarefas do setor ou org"
ON public.tasks FOR SELECT
USING (
    -- Admin e Owner visualizam tudo da organização
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    -- Membro do setor visualiza as demandas do seu setor
    (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR
    -- Tarefas legadas sem setor visíveis aos membros da organização
    (department_id IS NULL AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "Operadores criam tarefas no setor"
ON public.tasks FOR INSERT
WITH CHECK (
    -- Admin cria em qualquer setor da organização
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    -- Membro cria nos setores em que possui vínculo ativo
    (department_id IS NOT NULL AND public.is_department_member(department_id))
);

CREATE POLICY "Operadores atualizam tarefas autorizadas"
ON public.tasks FOR UPDATE
USING (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_manager(department_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
)
WITH CHECK (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_manager(department_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
);

CREATE POLICY "Admins e Chefes excluem tarefas"
ON public.tasks FOR DELETE
USING (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_manager(department_id))
);

-- 4.4 Novas Políticas RLS para DAY_NOTES (Calendário)
CREATE POLICY "Membros visualizam notas do setor ou org"
ON public.day_notes FOR SELECT
USING (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR
    (department_id IS NULL AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "Operadores criam notas no setor"
ON public.day_notes FOR INSERT
WITH CHECK (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR
    (department_id IS NULL AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "Operadores atualizam notas do setor"
ON public.day_notes FOR UPDATE
USING (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR
    (department_id IS NULL AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
)
WITH CHECK (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR
    (department_id IS NULL AND organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "Admins e Chefes excluem notas"
ON public.day_notes FOR DELETE
USING (
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR
    (department_id IS NOT NULL AND public.is_department_manager(department_id))
);
