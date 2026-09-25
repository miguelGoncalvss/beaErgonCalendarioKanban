import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  initDatabase,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAllNotes,
  createNote,
  updateNote,
  toggleNoteComplete,
  deleteNote,
  getAllCompanies,
  createCompany,
  findUserByEmail,
  findUserById,
  createUser,
} from './database.ts';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ergon_contabil_secret_key_2026_jwt';

app.use(cors());
app.use(express.json());

// Inicializa o banco de dados SQL e as tabelas
initDatabase();

// Middleware direto - sem barreiras de autenticação para equipe de 2 usuários
function authenticateToken(req: any, _res: any, next: any) {
  req.user = {
    id: 'user-admin-default',
    name: 'Equipe Ergon',
    email: 'contato@ergon.com.br',
    role: 'admin',
  };
  next();
}

// ==================== ROTAS DE HEALTH / STATUS ====================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: 'SQLite WAL (SQL)', time: new Date().toISOString() });
});

// ==================== ROTAS DE AUTENTICAÇÃO E USUÁRIOS ====================

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = createUser(name, email, passwordHash, role || 'contabilidade');
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ user, token });
  } catch (err: any) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao processar login.' });
  }
});

app.get('/api/auth/me', (_req, res) => {
  const user = findUserById('user-admin-default') || {
    id: 'user-admin-default',
    name: 'Equipe Ergon',
    email: 'contato@ergon.com.br',
    role: 'admin',
  };
  res.json({ user });
});

// ==================== ROTAS DE TAREFAS (KANBAN) ====================

app.get('/api/tasks', (_req, res) => {
  try {
    const tasks = getAllTasks();
    res.json(tasks);
  } catch (err: any) {
    console.error('Erro ao buscar tarefas:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefas do banco SQL.' });
  }
});

app.post('/api/tasks', authenticateToken, (req: any, res) => {
  try {
    const taskData = req.body;
    const userId = req.user?.id || 'user-admin-default';

    const isWeekly = taskData.recurrence === 'weekly' || taskData.recurringGroupId?.startsWith('recur-week-');
    const isMonthly = taskData.recurrence === 'monthly' || (!isWeekly && (Boolean(taskData.isMonthlyRecurring) || Boolean(taskData.recurringGroupId)));
    const isRecurring = isWeekly || isMonthly;

    if (isRecurring && taskData.dueDate) {
      // Cria ocorrências para 12 semanas ou meses
      const baseDate = new Date(taskData.dueDate + 'T00:00:00');
      const targetDay = baseDate.getDate();
      const recurringGroupId = taskData.recurringGroupId || (isWeekly ? `recur-week-${Date.now()}` : `recur-month-${Date.now()}`);
      const createdTasks: any[] = [];

      for (let i = 0; i < 12; i++) {
        let occurrenceDate: Date;
        if (isWeekly) {
          occurrenceDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + (i * 7));
        } else {
          const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
          const targetMonth = (baseDate.getMonth() + i) % 12;
          const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
          const validDay = Math.min(targetDay, maxDays);
          occurrenceDate = new Date(targetYear, targetMonth, validDay);
        }
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateKeyStr = `${occurrenceDate.getFullYear()}-${pad(occurrenceDate.getMonth() + 1)}-${pad(occurrenceDate.getDate())}`;

        const taskId = `task-${Date.now()}-${i}`;
        const noteId = `note-${Date.now()}-${i}`;

        const t = {
          ...taskData,
          id: taskId,
          dueDate: dateKeyStr,
          recurrence: isWeekly ? 'weekly' : 'monthly',
          isMonthlyRecurring: !isWeekly,
          recurringGroupId,
          createdAt: new Date().toISOString(),
        };
        createTask(t, userId);
        createdTasks.push(t);

        // Cria anotação de calendário correspondente
        createNote(
          {
            id: noteId,
            taskId,
            date: dateKeyStr,
            title: taskData.title,
            content: taskData.description,
            category: 'geral',
            company: taskData.company,
            color: taskData.color || null,
            recurrence: isWeekly ? 'weekly' : 'monthly',
            isMonthlyRecurring: !isWeekly,
            recurringGroupId,
            createdAt: new Date().toISOString(),
          },
          userId
        );
      }

      if (taskData.company) {
        createCompany(taskData.company, null, userId);
      }

      return res.status(201).json(createdTasks);
    }

    const newTask = {
      ...taskData,
      id: taskData.id || `task-${Date.now()}`,
      createdAt: taskData.createdAt || new Date().toISOString(),
    };

    createTask(newTask, userId);

    if (newTask.company) {
      createCompany(newTask.company, null, userId);
    }

    res.status(201).json(newTask);
  } catch (err: any) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: 'Erro ao criar tarefa no SQL.' });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const taskData = { ...req.body, id };
    updateTask(taskData);
    if (taskData.company) {
      createCompany(taskData.company);
    }
    const updated = getTaskById(id);
    res.json(updated || taskData);
  } catch (err: any) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

app.patch('/api/tasks/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedTask = updateTaskStatus(id, status);
    res.json({ success: true, id, status, task: updatedTask });
  } catch (err: any) {
    console.error('Erro ao mover status:', err);
    res.status(500).json({ error: 'Erro ao mover tarefa.' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleteFuture = req.query.future === 'true';
    deleteTask(id, deleteFuture);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Erro ao deletar tarefa:', err);
    res.status(500).json({ error: 'Erro ao deletar tarefa.' });
  }
});

// ==================== ROTAS DE ANOTAÇÕES (CALENDÁRIO) ====================

app.get('/api/notes', (_req, res) => {
  try {
    const notes = getAllNotes();
    res.json(notes);
  } catch (err: any) {
    console.error('Erro ao buscar anotações:', err);
    res.status(500).json({ error: 'Erro ao buscar anotações do banco SQL.' });
  }
});

app.post('/api/notes', authenticateToken, (req: any, res) => {
  try {
    const noteData = req.body;
    const userId = req.user?.id || 'user-admin-default';

    // Prioridade baseada na categoria
    let priority = 'medium';
    if (noteData.category === 'urgente') priority = 'urgent';
    else if (noteData.category === 'ideia') priority = 'low';

    const categoryTag = noteData.category
      ? noteData.category.charAt(0).toUpperCase() + noteData.category.slice(1)
      : 'Calendário';

    const shouldCreateTask = noteData.sendToKanban !== false;

    const isWeekly = noteData.recurrence === 'weekly' || noteData.recurringGroupId?.startsWith('recur-week-');
    const isMonthly = noteData.recurrence === 'monthly' || (!isWeekly && (Boolean(noteData.isMonthlyRecurring) || Boolean(noteData.recurringGroupId)));
    const isRecurring = isWeekly || isMonthly;

    if (isRecurring) {
      const baseDate = new Date(noteData.date + 'T00:00:00');
      const targetDay = baseDate.getDate();
      const recurringGroupId = noteData.recurringGroupId || (isWeekly ? `recur-week-${Date.now()}` : `recur-month-${Date.now()}`);
      const createdNotes: any[] = [];

      for (let i = 0; i < 12; i++) {
        let occurrenceDate: Date;
        if (isWeekly) {
          occurrenceDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + (i * 7));
        } else {
          const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
          const targetMonth = (baseDate.getMonth() + i) % 12;
          const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
          const validDay = Math.min(targetDay, maxDays);
          occurrenceDate = new Date(targetYear, targetMonth, validDay);
        }
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateKeyStr = `${occurrenceDate.getFullYear()}-${pad(occurrenceDate.getMonth() + 1)}-${pad(occurrenceDate.getDate())}`;

        const taskId = shouldCreateTask ? `task-${Date.now()}-${i}` : undefined;
        const noteId = `note-${Date.now()}-${i}`;

        if (shouldCreateTask && taskId) {
          createTask(
            {
              id: taskId,
              title: noteData.title,
              description: noteData.content,
              company: noteData.company,
              color: noteData.color || null,
              status: 'todo',
              priority,
              dueDate: dateKeyStr,
              dueTime: noteData.time || null,
              tags: [categoryTag, isWeekly ? 'Semanal' : 'Mensal'],
              recurrence: isWeekly ? 'weekly' : 'monthly',
              isMonthlyRecurring: !isWeekly,
              recurringGroupId,
              createdAt: new Date().toISOString(),
            },
            userId
          );
        }

        const n = {
          ...noteData,
          id: noteId,
          taskId: taskId || null,
          date: dateKeyStr,
          recurrence: isWeekly ? 'weekly' : 'monthly',
          isMonthlyRecurring: !isWeekly,
          recurringGroupId,
          createdAt: new Date().toISOString(),
        };
        createNote(n, userId);
        createdNotes.push(n);
      }

      if (noteData.company) {
        createCompany(noteData.company, null, userId);
      }

      return res.status(201).json(createdNotes);
    }

    const taskId = shouldCreateTask ? `task-${Date.now()}` : undefined;
    if (shouldCreateTask && taskId) {
      createTask(
        {
          id: taskId,
          title: noteData.title,
          description: noteData.content,
          company: noteData.company,
          color: noteData.color || null,
          status: 'todo',
          priority,
          dueDate: noteData.date,
          dueTime: noteData.time || null,
          tags: [categoryTag],
          createdAt: new Date().toISOString(),
        },
        userId
      );
    }

    const newNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      taskId: taskId || null,
      createdAt: new Date().toISOString(),
    };
    createNote(newNote, userId);

    if (noteData.company) {
      createCompany(noteData.company, null, userId);
    }

    res.status(201).json(newNote);
  } catch (err: any) {
    console.error('Erro ao adicionar anotação:', err);
    res.status(500).json({ error: 'Erro ao adicionar anotação no SQL.' });
  }
});

app.put('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const noteData = { ...req.body, id };
    const updated = updateNote(noteData);
    if (noteData.company) {
      createCompany(noteData.company);
    }
    res.json(updated || noteData);
  } catch (err: any) {
    console.error('Erro ao atualizar anotação:', err);
    res.status(500).json({ error: 'Erro ao atualizar anotação no SQL.' });
  }
});

app.patch('/api/notes/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    toggleNoteComplete(id);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Erro ao alternar status da nota:', err);
    res.status(500).json({ error: 'Erro ao alternar anotação.' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleteFuture = req.query.future === 'true';
    deleteNote(id, deleteFuture);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Erro ao deletar anotação:', err);
    res.status(500).json({ error: 'Erro ao excluir anotação.' });
  }
});

// ==================== ROTAS DE EMPRESAS ====================

app.get('/api/companies', (_req, res) => {
  try {
    const companies = getAllCompanies();
    res.json(companies);
  } catch (err: any) {
    console.error('Erro ao listar empresas:', err);
    res.status(500).json({ error: 'Erro ao buscar empresas do SQL.' });
  }
});

app.post('/api/companies', authenticateToken, (req: any, res) => {
  try {
    const { name, cnpj } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório.' });
    }
    const userId = req.user?.id || 'user-admin-default';
    const comp = createCompany(name.trim(), cnpj || null, userId);
    res.status(201).json(comp);
  } catch (err: any) {
    console.error('Erro ao cadastrar empresa:', err);
    res.status(500).json({ error: 'Erro ao cadastrar empresa no SQL.' });
  }
});

// ==================== MIGRAÇÃO AUTOMÁTICA DE LOCALSTORAGE ====================
app.post('/api/sync/migrate-localstorage', (req, res) => {
  try {
    const { tasks, notes, companies } = req.body;

    if (Array.isArray(companies)) {
      for (const c of companies) {
        if (typeof c === 'string' && c.trim()) {
          createCompany(c.trim());
        }
      }
    }

    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        try {
          createTask(t);
        } catch {
          // Ignora duplicatas
        }
      }
    }

    if (Array.isArray(notes)) {
      for (const n of notes) {
        try {
          createNote(n);
        } catch {
          // Ignora duplicatas
        }
      }
    }

    res.json({ success: true, message: 'Dados do localStorage migrados com sucesso para o banco SQL!' });
  } catch (err: any) {
    console.error('Erro na migração:', err);
    res.status(500).json({ error: 'Erro na migração.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [Servidor SQL Ergon] Rodando em http://localhost:${PORT}`);
  console.log(`📊 [Banco de Dados] SQLite WAL ativo: ergon.db`);
});
