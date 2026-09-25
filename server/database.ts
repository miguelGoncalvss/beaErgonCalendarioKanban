import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'ergon.db');

export const db = new DatabaseSync(DB_PATH);

// Ativa WAL mode para performance e integridade
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);

  // Migrações incrementais de colunas para métricas de tempo
  try { db.exec('ALTER TABLE tasks ADD COLUMN completed_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN delayed_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN total_delayed_seconds INTEGER DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN completed_duration_seconds INTEGER;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN due_time TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN stage_entered_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN started_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN time_in_todo_seconds INTEGER DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN time_in_progress_seconds INTEGER DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN stage_history TEXT;'); } catch {}
  try { db.exec('ALTER TABLE tasks ADD COLUMN color TEXT;'); } catch {}
  try { db.exec('ALTER TABLE day_notes ADD COLUMN color TEXT;'); } catch {}

  // Garante inicialização de stage_entered_at nas tarefas que foram criadas antes
  try { db.exec("UPDATE tasks SET stage_entered_at = created_at WHERE stage_entered_at IS NULL;"); } catch {}

  seedInitialData();
}

function seedInitialData() {
  // 1. Seed Usuário Padrão
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  let defaultUserId = 'user-admin-default';

  if (userCheck.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      defaultUserId,
      'Equipe Contábil',
      'contato@ergon.com.br',
      passwordHash,
      'admin',
      new Date().toISOString()
    );
    console.log('[DB] Usuário padrão criado: contato@ergon.com.br / senha: admin123');
  } else {
    const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
    if (firstUser) defaultUserId = firstUser.id;
  }

  // 2. Seed Empresas
  const companyCheck = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (companyCheck.count === 0) {
    const insertCompany = db.prepare(`
      INSERT OR IGNORE INTO companies (id, name, cnpj, user_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultCompanies = [
      { name: 'Alfa Comércio de Alimentos Ltda', cnpj: '12.345.678/0001-90' },
      { name: 'Beta Tech Inovações ME', cnpj: '98.765.432/0001-10' },
      { name: 'Padaria Central ME', cnpj: '45.678.901/0001-23' },
      { name: 'Silva & Santos Advocacia', cnpj: '23.456.789/0001-45' },
      { name: 'Delta Logística & Transportes', cnpj: '67.890.123/0001-67' },
      { name: 'Uso Interno / Escritório', cnpj: null },
    ];

    for (let i = 0; i < defaultCompanies.length; i++) {
      insertCompany.run(
        `comp-${i + 1}`,
        defaultCompanies[i].name,
        defaultCompanies[i].cnpj,
        defaultUserId,
        new Date().toISOString()
      );
    }
    console.log('[DB] Empresas clientes iniciais cadastradas com sucesso!');
  }

  // 3. Seed Tarefas e Anotações
  const taskCheck = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (taskCheck.count === 0) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 2);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, due_date, tags, company, is_monthly_recurring, recurring_group_id, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialTasks = [
      {
        id: 'task-1',
        title: 'Fechamento da Folha de Pagamento',
        description: 'Lançamento de horas extras, benefícios e emissão dos holerites mensais.',
        status: 'todo',
        priority: 'high',
        dueDate: tomorrowStr,
        company: 'Alfa Comércio de Alimentos Ltda',
        tags: JSON.stringify(['DP', 'Folha']),
      },
      {
        id: 'task-2',
        title: 'Apuração e Emissão de DAS (Simples Nacional)',
        description: 'Conferir faturamento fiscal do mês anterior e emitir guia de arrecadação.',
        status: 'todo',
        priority: 'medium',
        dueDate: tomorrowStr,
        company: 'Padaria Central ME',
        tags: JSON.stringify(['Fiscal', 'Simples']),
      },
      {
        id: 'task-3',
        title: 'Conciliação Bancária e Extratos Financeiros',
        description: 'Cruzar extratos bancários com notas fiscais de entrada e saída.',
        status: 'in_progress',
        priority: 'high',
        dueDate: todayStr,
        company: 'Beta Tech Inovações ME',
        tags: JSON.stringify(['Contábil', 'Conciliação']),
      },
      {
        id: 'task-4',
        title: 'Apuração de ICMS e Envio do SPED Fiscal',
        description: 'Validar livros fiscais de entradas e saídas de transportes interestaduais.',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: todayStr,
        company: 'Delta Logística & Transportes',
        tags: JSON.stringify(['Fiscal', 'SPED']),
      },
      {
        id: 'task-5',
        title: 'Transmissão da DCTFWeb e Guia FGTS Digital',
        description: 'Transmissão realizada com sucesso após fechamento do eSocial.',
        status: 'done',
        priority: 'medium',
        dueDate: yesterdayStr,
        company: 'Silva & Santos Advocacia',
        tags: JSON.stringify(['DP', 'DCTFWeb']),
      },
      {
        id: 'task-6',
        title: 'Envio do Balancete Mensal e Relatório DRE',
        description: 'Prazo estipulado em contrato encerrou ontem; contatar cliente para assinar.',
        status: 'delayed',
        priority: 'urgent',
        dueDate: yesterdayStr,
        company: 'Alfa Comércio de Alimentos Ltda',
        tags: JSON.stringify(['Contábil', 'Urgente']),
      },
    ];

    for (const t of initialTasks) {
      insertTask.run(
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.dueDate,
        t.tags,
        t.company,
        0,
        null,
        defaultUserId,
        new Date().toISOString(),
        null
      );
    }

    const insertNote = db.prepare(`
      INSERT INTO day_notes (id, task_id, date, title, content, category, company, time, is_completed, is_monthly_recurring, recurring_group_id, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialNotes = [
      {
        id: 'note-1',
        taskId: 'task-3',
        date: todayStr,
        title: 'Conciliação Bancária e Extratos Financeiros',
        content: 'Cruzar extratos bancários com notas fiscais de entrada e saída.',
        category: 'reuniao',
        company: 'Beta Tech Inovações ME',
        time: '10:00',
        isCompleted: 0,
      },
      {
        id: 'note-2',
        taskId: 'task-4',
        date: todayStr,
        title: 'Apuração de ICMS e Envio do SPED Fiscal',
        content: 'Validar livros fiscais de entradas e saídas de transportes interestaduais.',
        category: 'urgente',
        company: 'Delta Logística & Transportes',
        time: '15:30',
        isCompleted: 0,
      },
      {
        id: 'note-3',
        taskId: 'task-1',
        date: tomorrowStr,
        title: 'Fechamento da Folha de Pagamento',
        content: 'Lançamento de horas extras, benefícios e emissão dos holerites mensais.',
        category: 'lembrete',
        company: 'Alfa Comércio de Alimentos Ltda',
        time: '14:00',
        isCompleted: 0,
      },
    ];

    for (const n of initialNotes) {
      insertNote.run(
        n.id,
        n.taskId,
        n.date,
        n.title,
        n.content,
        n.category,
        n.company,
        n.time,
        n.isCompleted,
        0,
        null,
        defaultUserId,
        new Date().toISOString()
      );
    }
    console.log('[DB] Tarefas e anotações iniciais inseridas no SQL!');
  }
}

// ==================== OPERAÇÕES DE TAREFAS ====================

function mapTaskRow(r: any) {
  let stageHistory: any[] = [];
  try {
    if (r.stage_history) {
      stageHistory = JSON.parse(r.stage_history);
    }
  } catch {}

  // Se não houver histórico de estágios registrado ainda, inicializa com o status inicial
  if (!stageHistory || stageHistory.length === 0) {
    stageHistory = [
      {
        toStatus: r.status,
        enteredAt: r.stage_entered_at || r.created_at,
      },
    ];
  }

  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date || undefined,
    dueTime: r.due_time || undefined,
    tags: r.tags ? JSON.parse(r.tags) : [],
    company: r.company || undefined,
    color: r.color || undefined,
    isMonthlyRecurring: Boolean(r.is_monthly_recurring),
    recurringGroupId: r.recurring_group_id || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at || undefined,
    completedAt: r.completed_at || undefined,
    delayedAt: r.delayed_at || undefined,
    totalDelayedSeconds: r.total_delayed_seconds || 0,
    completedDurationSeconds: r.completed_duration_seconds != null ? r.completed_duration_seconds : undefined,
    stageEnteredAt: r.stage_entered_at || r.created_at,
    startedAt: r.started_at || undefined,
    timeInTodoSeconds: r.time_in_todo_seconds || 0,
    timeInProgressSeconds: r.time_in_progress_seconds || 0,
    stageHistory,
  };
}

export function getAllTasks() {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];
  return rows.map(mapTaskRow);
}

export function getTaskById(id: string) {
  const r = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapTaskRow(r);
}

export function createTask(task: any, userId: string = 'user-admin-default') {
  const now = new Date().toISOString();
  const delayedAt = task.status === 'delayed' ? (task.delayedAt || now) : null;
  const completedAt = task.status === 'done' ? (task.completedAt || now) : null;
  const totalDelayedSeconds = task.totalDelayedSeconds || 0;
  const completedDurationSeconds = task.completedDurationSeconds || (task.status === 'done' ? 0 : null);
  const stageEnteredAt = task.stageEnteredAt || now;
  const startedAt = task.status === 'in_progress' ? (task.startedAt || now) : (task.startedAt || null);
  const timeInTodoSeconds = task.timeInTodoSeconds || 0;
  const timeInProgressSeconds = task.timeInProgressSeconds || 0;
  const initialHistory = task.stageHistory?.length
    ? task.stageHistory
    : [{ toStatus: task.status, enteredAt: stageEnteredAt }];

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, description, status, priority, due_date, due_time, tags, company, color,
      is_monthly_recurring, recurring_group_id, user_id, 
      delayed_at, total_delayed_seconds, completed_at, completed_duration_seconds,
      stage_entered_at, started_at, time_in_todo_seconds, time_in_progress_seconds, stage_history,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    task.id,
    task.title,
    task.description || null,
    task.status,
    task.priority,
    task.dueDate || null,
    task.dueTime || null,
    JSON.stringify(task.tags || []),
    task.company || null,
    task.color || null,
    task.isMonthlyRecurring ? 1 : 0,
    task.recurringGroupId || null,
    userId,
    delayedAt,
    totalDelayedSeconds,
    completedAt,
    completedDurationSeconds,
    stageEnteredAt,
    startedAt,
    timeInTodoSeconds,
    timeInProgressSeconds,
    JSON.stringify(initialHistory),
    task.createdAt || now
  );
}

export function updateTask(task: any) {
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) as any;
  if (current && current.status !== task.status) {
    updateTaskStatus(task.id, task.status);
  }

  const stmt = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, priority = ?, due_date = ?, due_time = ?, tags = ?, company = ?, color = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    task.title,
    task.description || null,
    task.priority,
    task.dueDate || null,
    task.dueTime || null,
    JSON.stringify(task.tags || []),
    task.company || null,
    task.color || null,
    new Date().toISOString(),
    task.id
  );

  // Sincroniza anotação de calendário correspondente
  const noteStmt = db.prepare(`
    UPDATE day_notes
    SET title = ?, content = ?, company = ?, color = ?, time = ?, date = COALESCE(?, date)
    WHERE task_id = ?
  `);
  noteStmt.run(
    task.title,
    task.description || null,
    task.company || null,
    task.color || null,
    task.dueTime || null,
    task.dueDate || null,
    task.id
  );
}

export function updateTaskStatus(id: string, newStatus: string) {
  const current = db.prepare(`
    SELECT *
    FROM tasks WHERE id = ?
  `).get(id) as any;

  if (!current) return null;
  if (current.status === newStatus) return getTaskById(id);

  const now = new Date();
  const nowIso = now.toISOString();

  // Calcular tempo que passou no status anterior
  const stageStart = current.stage_entered_at
    ? new Date(current.stage_entered_at).getTime()
    : (current.created_at ? new Date(current.created_at).getTime() : now.getTime());
  const elapsed = Math.max(0, Math.floor((now.getTime() - stageStart) / 1000));

  let timeInTodoSeconds = current.time_in_todo_seconds || 0;
  let timeInProgressSeconds = current.time_in_progress_seconds || 0;
  let totalDelayedSeconds = current.total_delayed_seconds || 0;
  let delayedAt = current.delayed_at;
  let completedAt = current.completed_at;
  let completedDurationSeconds = current.completed_duration_seconds;
  let startedAt = current.started_at;

  // 1. Acumular tempo no estágio anterior
  if (current.status === 'todo') {
    timeInTodoSeconds += elapsed;
  } else if (current.status === 'in_progress') {
    timeInProgressSeconds += elapsed;
  } else if (current.status === 'delayed') {
    totalDelayedSeconds += elapsed;
    delayedAt = null;
  }

  // 2. Se está entrando em 'in_progress' pela primeira vez
  if (newStatus === 'in_progress' && !startedAt) {
    startedAt = nowIso;
  }

  // 3. Se está entrando em 'delayed'
  if (newStatus === 'delayed') {
    delayedAt = nowIso;
  }

  // 4. Se está sendo concluída ('done')
  if (newStatus === 'done') {
    completedAt = nowIso;
    const createdTime = current.created_at ? new Date(current.created_at).getTime() : now.getTime();
    completedDurationSeconds = Math.max(0, Math.floor((now.getTime() - createdTime) / 1000));
  } else if (current.status === 'done') {
    // Reabriu tarefa
    completedAt = null;
    completedDurationSeconds = null;
  }

  // 5. Histórico detalhado de transições
  let history: any[] = [];
  try {
    if (current.stage_history) {
      history = JSON.parse(current.stage_history);
    }
  } catch {}

  if (history.length > 0) {
    const lastItem = history[history.length - 1];
    if (!lastItem.leftAt) {
      lastItem.leftAt = nowIso;
      lastItem.durationSeconds = elapsed;
    }
  } else {
    // Se não havia histórico prévio, registra o estágio de onde partiu
    history.push({
      toStatus: current.status,
      enteredAt: current.stage_entered_at || current.created_at,
      leftAt: nowIso,
      durationSeconds: elapsed,
    });
  }

  // Adiciona novo estágio
  history.push({
    fromStatus: current.status,
    toStatus: newStatus,
    enteredAt: nowIso,
  });

  const stmt = db.prepare(`
    UPDATE tasks
    SET status = ?,
        updated_at = ?,
        delayed_at = ?,
        total_delayed_seconds = ?,
        completed_at = ?,
        completed_duration_seconds = ?,
        stage_entered_at = ?,
        started_at = ?,
        time_in_todo_seconds = ?,
        time_in_progress_seconds = ?,
        stage_history = ?
    WHERE id = ?
  `);

  stmt.run(
    newStatus,
    nowIso,
    delayedAt,
    totalDelayedSeconds,
    completedAt,
    completedDurationSeconds,
    nowIso,
    startedAt,
    timeInTodoSeconds,
    timeInProgressSeconds,
    JSON.stringify(history),
    id
  );

  // Sincroniza nota correspondente no calendário
  const syncNote = db.prepare(`
    UPDATE day_notes
    SET is_completed = ?
    WHERE task_id = ?
  `);
  syncNote.run(newStatus === 'done' ? 1 : 0, id);

  return getTaskById(id);
}

export function deleteTask(id: string, deleteFutureRecurring: boolean = false) {
  if (deleteFutureRecurring) {
    const task = db.prepare('SELECT recurring_group_id, due_date FROM tasks WHERE id = ?').get(id) as any;
    if (task && task.recurring_group_id) {
      db.prepare(`
        DELETE FROM tasks
        WHERE recurring_group_id = ? AND (due_date >= ? OR due_date IS NULL)
      `).run(task.recurring_group_id, task.due_date || '');

      db.prepare(`
        DELETE FROM day_notes
        WHERE recurring_group_id = ? AND date >= ?
      `).run(task.recurring_group_id, task.due_date || '');
      return;
    }
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  db.prepare('DELETE FROM day_notes WHERE task_id = ?').run(id);
}

// ==================== OPERAÇÕES DE ANOTAÇÕES ====================

export function getAllNotes() {
  const rows = db.prepare('SELECT * FROM day_notes ORDER BY date ASC, time ASC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id || undefined,
    date: r.date,
    title: r.title,
    content: r.content || undefined,
    category: r.category,
    company: r.company || undefined,
    color: r.color || undefined,
    time: r.time || undefined,
    isCompleted: Boolean(r.is_completed),
    isMonthlyRecurring: Boolean(r.is_monthly_recurring),
    recurringGroupId: r.recurring_group_id || undefined,
    createdAt: r.created_at,
  }));
}

export function createNote(note: any, userId: string = 'user-admin-default') {
  const insertNote = db.prepare(`
    INSERT INTO day_notes (id, task_id, date, title, content, category, company, color, time, is_completed, is_monthly_recurring, recurring_group_id, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNote.run(
    note.id,
    note.taskId || null,
    note.date,
    note.title,
    note.content || null,
    note.category || 'geral',
    note.company || null,
    note.color || null,
    note.time || null,
    note.isCompleted ? 1 : 0,
    note.isMonthlyRecurring ? 1 : 0,
    note.recurringGroupId || null,
    userId,
    note.createdAt || new Date().toISOString()
  );
}

export function getNoteById(id: string) {
  const r = db.prepare('SELECT * FROM day_notes WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    taskId: r.task_id || undefined,
    date: r.date,
    title: r.title,
    content: r.content || undefined,
    category: r.category,
    company: r.company || undefined,
    color: r.color || undefined,
    time: r.time || undefined,
    isCompleted: Boolean(r.is_completed),
    isMonthlyRecurring: Boolean(r.is_monthly_recurring),
    recurringGroupId: r.recurring_group_id || undefined,
    createdAt: r.created_at,
  };
}

export function updateNote(note: any) {
  const current = db.prepare('SELECT * FROM day_notes WHERE id = ?').get(note.id) as any;
  if (!current) return null;

  const stmt = db.prepare(`
    UPDATE day_notes
    SET title = ?, content = ?, category = ?, company = ?, color = ?, time = ?, date = ?
    WHERE id = ?
  `);

  stmt.run(
    note.title,
    note.content || null,
    note.category || 'geral',
    note.company || null,
    note.color || null,
    note.time || null,
    note.date,
    note.id
  );

  // Se a anotação/reunião estiver vinculada a uma tarefa do Kanban, sincroniza a tarefa também
  if (current.task_id) {
    let priority = 'medium';
    if (note.category === 'urgente') priority = 'urgent';
    else if (note.category === 'ideia') priority = 'low';

    const categoryTag = note.category
      ? note.category.charAt(0).toUpperCase() + note.category.slice(1)
      : 'Calendário';

    const taskStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, company = ?, color = ?, due_date = ?, due_time = ?, priority = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `);

    taskStmt.run(
      note.title,
      note.content || null,
      note.company || null,
      note.color || null,
      note.date,
      note.time || null,
      priority,
      JSON.stringify([categoryTag]),
      new Date().toISOString(),
      current.task_id
    );
  }

  return getNoteById(note.id);
}

export function toggleNoteComplete(id: string) {
  const note = db.prepare('SELECT is_completed, task_id FROM day_notes WHERE id = ?').get(id) as any;
  if (!note) return;

  const nextVal = note.is_completed ? 0 : 1;
  db.prepare('UPDATE day_notes SET is_completed = ? WHERE id = ?').run(nextVal, id);

  if (note.task_id) {
    db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(
      nextVal ? 'done' : 'todo',
      new Date().toISOString(),
      note.task_id
    );
  }
}

export function deleteNote(id: string, deleteFutureRecurring: boolean = false) {
  if (deleteFutureRecurring) {
    const note = db.prepare('SELECT recurring_group_id, date FROM day_notes WHERE id = ?').get(id) as any;
    if (note && note.recurring_group_id) {
      db.prepare(`
        DELETE FROM day_notes
        WHERE recurring_group_id = ? AND date >= ?
      `).run(note.recurring_group_id, note.date);

      db.prepare(`
        DELETE FROM tasks
        WHERE recurring_group_id = ? AND due_date >= ?
      `).run(note.recurring_group_id, note.date);
      return;
    }
  }

  const note = db.prepare('SELECT task_id FROM day_notes WHERE id = ?').get(id) as any;
  if (note?.task_id) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(note.task_id);
  }
  db.prepare('DELETE FROM day_notes WHERE id = ?').run(id);
}

// ==================== OPERAÇÕES DE EMPRESAS ====================

export function getAllCompanies(): string[] {
  const rows = db.prepare('SELECT name FROM companies ORDER BY name ASC').all() as any[];
  return rows.map((r) => r.name);
}

export function createCompany(name: string, cnpj: string | null = null, userId: string = 'user-admin-default') {
  const id = `comp-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO companies (id, name, cnpj, user_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, cnpj, userId, new Date().toISOString());
  return { id, name, cnpj };
}

// ==================== OPERAÇÕES DE USUÁRIO / AUTH ====================

export function findUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
}

export function findUserById(id: string) {
  return db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id) as any;
}

export function createUser(name: string, email: string, passwordHash: string, role: string = 'contabilidade') {
  const id = `user-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, email.toLowerCase().trim(), passwordHash, role, new Date().toISOString());
  return { id, name, email: email.toLowerCase().trim(), role };
}
