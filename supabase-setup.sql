-- ==============================================================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS SUPABASE (PROJETO BEA ERGON)
-- ==============================================================================
-- Execute este script completo no painel do Supabase:
-- Acesse: "SQL Editor" -> "New Query" -> Cole o conteúdo abaixo -> Clique em "Run"
-- ==============================================================================

-- 1. LIMPAR TABELAS ANTIGAS (SE EXISTIREM)
DROP TABLE IF EXISTS day_notes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 2. TABELA DE TAREFAS (KANBAN)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    due_time TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    company TEXT,
    color TEXT,
    is_monthly_recurring BOOLEAN DEFAULT FALSE,
    recurring_group_id TEXT,
    delayed_at TEXT,
    total_delayed_seconds INTEGER DEFAULT 0,
    completed_at TEXT,
    completed_duration_seconds INTEGER,
    stage_entered_at TEXT,
    started_at TEXT,
    time_in_todo_seconds INTEGER DEFAULT 0,
    time_in_progress_seconds INTEGER DEFAULT 0,
    stage_history JSONB DEFAULT '[]'::jsonb,
    created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    updated_at TEXT
);

-- 3. TABELA DE ANOTAÇÕES E COMPROMISSOS (CALENDÁRIO)
CREATE TABLE day_notes (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL DEFAULT 'geral',
    company TEXT,
    color TEXT,
    time TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    is_monthly_recurring BOOLEAN DEFAULT FALSE,
    recurring_group_id TEXT,
    created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- 4. TABELA DE EMPRESAS / CLIENTES
CREATE TABLE companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT UNIQUE NOT NULL,
    cnpj TEXT,
    created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS) COM ACESSO TOTAL PARA CHAVE PÚBLICA (ANON)
-- Como o sistema não possui tela de login e é usado diretamente pela equipe,
-- liberamos as permissões totais para leitura e escrita pela API do Supabase.

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para tasks
CREATE POLICY "Permitir leitura de tarefas" ON tasks FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de tarefas" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de tarefas" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de tarefas" ON tasks FOR DELETE USING (true);

-- Políticas de acesso público para day_notes
CREATE POLICY "Permitir leitura de notas" ON day_notes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de notas" ON day_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de notas" ON day_notes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de notas" ON day_notes FOR DELETE USING (true);

-- Políticas de acesso público para companies
CREATE POLICY "Permitir leitura de empresas" ON companies FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de empresas" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de empresas" ON companies FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de empresas" ON companies FOR DELETE USING (true);

-- ==============================================================================
-- FIM DO SCRIPT - BANCO ZERADO E PRONTO PARA O FRONT-END!
-- ==============================================================================
