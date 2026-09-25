-- Ergon Contábil: Sistema de Calendário, Kanban e Gestão Contábil
-- Banco de Dados Relacional SQL (Compatível com SQLite, PostgreSQL e MySQL)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'contabilidade',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  due_time TEXT, -- Horário limite estabelecido ("Até quando deve ser feito?")
  tags TEXT,
  company TEXT,
  color TEXT, -- Faixa de cor / tag visual personalizada
  is_monthly_recurring INTEGER DEFAULT 0,
  recurring_group_id TEXT,
  user_id TEXT,
  completed_at TEXT, -- Data/hora de conclusão
  delayed_at TEXT, -- Data/hora em que entrou em atraso
  total_delayed_seconds INTEGER DEFAULT 0, -- Tempo acumulado em atraso
  completed_duration_seconds INTEGER, -- Tempo total no Kanban até ser concluída
  stage_entered_at TEXT, -- Data/hora em que entrou no status atual
  started_at TEXT, -- Data/hora em que iniciou "Fazendo"
  time_in_todo_seconds INTEGER DEFAULT 0, -- Tempo total que ficou em "A Fazer"
  time_in_progress_seconds INTEGER DEFAULT 0, -- Tempo total que ficou em "Fazendo"
  stage_history TEXT, -- Histórico de transições de status (JSON)
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS day_notes (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  company TEXT,
  color TEXT, -- Faixa de cor / tag visual personalizada
  time TEXT,
  is_completed INTEGER DEFAULT 0,
  is_monthly_recurring INTEGER DEFAULT 0,
  recurring_group_id TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);
CREATE INDEX IF NOT EXISTS idx_notes_date ON day_notes(date);
CREATE INDEX IF NOT EXISTS idx_notes_company ON day_notes(company);
