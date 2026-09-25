import type { Task, DayNote, TaskStatus } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const API_BASE = '/api';

const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

// ==================== MAPEADORES SUPABASE (Postgres <-> JS) ====================

function mapTaskFromSupabase(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date || undefined,
    dueTime: r.due_time || undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    company: r.company || undefined,
    color: r.color || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at || undefined,
    completedAt: r.completed_at || undefined,
    delayedAt: r.delayed_at || undefined,
    totalDelayedSeconds: r.total_delayed_seconds || 0,
    completedDurationSeconds: r.completed_duration_seconds || undefined,
    isMonthlyRecurring: Boolean(r.is_monthly_recurring),
    recurringGroupId: r.recurring_group_id || undefined,
    stageEnteredAt: r.stage_entered_at || undefined,
    startedAt: r.started_at || undefined,
    timeInTodoSeconds: r.time_in_todo_seconds || 0,
    timeInProgressSeconds: r.time_in_progress_seconds || 0,
    stageHistory: Array.isArray(r.stage_history) ? r.stage_history : [],
  };
}

function mapTaskToSupabase(task: any) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate || null,
    due_time: task.dueTime || null,
    tags: task.tags || [],
    company: task.company || null,
    color: task.color || null,
    is_monthly_recurring: Boolean(task.isMonthlyRecurring),
    recurring_group_id: task.recurringGroupId || null,
    delayed_at: task.delayedAt || null,
    total_delayed_seconds: task.totalDelayedSeconds || 0,
    completed_at: task.completedAt || null,
    completed_duration_seconds: task.completedDurationSeconds || null,
    stage_entered_at: task.stageEnteredAt || task.createdAt || new Date().toISOString(),
    started_at: task.startedAt || null,
    time_in_todo_seconds: task.timeInTodoSeconds || 0,
    time_in_progress_seconds: task.timeInProgressSeconds || 0,
    stage_history: task.stageHistory || [],
    created_at: task.createdAt || new Date().toISOString(),
    updated_at: task.updatedAt || new Date().toISOString(),
  };
}

function mapNoteFromSupabase(r: any): DayNote {
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
    createdAt: r.created_at,
    isMonthlyRecurring: Boolean(r.is_monthly_recurring),
    recurringGroupId: r.recurring_group_id || undefined,
  };
}

function mapNoteToSupabase(note: any) {
  return {
    id: note.id,
    task_id: note.taskId || null,
    date: note.date,
    title: note.title,
    content: note.content || null,
    category: note.category || 'geral',
    company: note.company || null,
    color: note.color || null,
    time: note.time || null,
    is_completed: Boolean(note.isCompleted),
    is_monthly_recurring: Boolean(note.isMonthlyRecurring),
    recurring_group_id: note.recurringGroupId || null,
    created_at: note.createdAt || new Date().toISOString(),
  };
}

export const api = {
  // ==================== TAREFAS (KANBAN) ====================
  async getTasks(): Promise<Task[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapTaskFromSupabase);
    }

    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('Falha ao buscar tarefas do servidor');
    return res.json();
  },

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task | Task[]> {
    if (isSupabaseConfigured()) {
      if (taskData.isMonthlyRecurring && taskData.dueDate) {
        const baseDate = new Date(taskData.dueDate + 'T00:00:00');
        const targetDay = baseDate.getDate();
        const recurringGroupId = `recur-${Date.now()}`;
        const newTasks: any[] = [];
        const newNotes: any[] = [];

        for (let i = 0; i < 12; i++) {
          const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
          const targetMonth = (baseDate.getMonth() + i) % 12;
          const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
          const validDay = Math.min(targetDay, maxDays);
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateKeyStr = `${targetYear}-${pad(targetMonth + 1)}-${pad(validDay)}`;

          const occurrenceTaskId = `task-${Date.now()}-${i}`;
          const occurrenceNoteId = `note-${Date.now()}-${i}`;

          const t = {
            ...taskData,
            id: occurrenceTaskId,
            dueDate: dateKeyStr,
            isMonthlyRecurring: true,
            recurringGroupId,
            createdAt: new Date().toISOString(),
          };
          newTasks.push(mapTaskToSupabase(t));

          newNotes.push({
            id: occurrenceNoteId,
            task_id: occurrenceTaskId,
            date: dateKeyStr,
            title: taskData.title,
            content: taskData.description || null,
            category: 'geral',
            company: taskData.company || null,
            color: taskData.color || null,
            is_monthly_recurring: true,
            recurring_group_id: recurringGroupId,
            created_at: new Date().toISOString(),
          });
        }

        const { error: tErr } = await supabase.from('tasks').insert(newTasks);
        if (tErr) throw tErr;

        const { error: nErr } = await supabase.from('day_notes').insert(newNotes);
        if (nErr) throw nErr;

        if (taskData.company) {
          await this.createCompany(taskData.company);
        }

        return newTasks.map(mapTaskFromSupabase);
      }

      const newTask = {
        ...taskData,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const { error } = await supabase.from('tasks').insert(mapTaskToSupabase(newTask));
      if (error) throw error;

      if (newTask.company) {
        await this.createCompany(newTask.company);
      }

      return newTask as Task;
    }

    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error('Falha ao salvar tarefa no banco');
    return res.json();
  },

  async updateTask(task: Task): Promise<Task> {
    if (isSupabaseConfigured()) {
      const mapped = mapTaskToSupabase(task);
      const { error } = await supabase
        .from('tasks')
        .update(mapped)
        .eq('id', task.id);
      if (error) throw error;

      // Sincroniza anotação vinculada se houver
      await supabase
        .from('day_notes')
        .update({
          title: task.title,
          content: task.description || null,
          company: task.company || null,
          color: task.color || null,
          time: task.dueTime || null,
          date: task.dueDate || undefined,
        })
        .eq('task_id', task.id);

      if (task.company) {
        await this.createCompany(task.company);
      }

      return task;
    }

    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Falha ao atualizar tarefa');
    return res.json();
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null> {
    if (isSupabaseConfigured()) {
      const { data: current, error: fErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();
      if (fErr || !current) return null;

      const now = new Date();
      const nowIso = now.toISOString();
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

      if (current.status === 'todo') {
        timeInTodoSeconds += elapsed;
      } else if (current.status === 'in_progress') {
        timeInProgressSeconds += elapsed;
      } else if (current.status === 'delayed') {
        totalDelayedSeconds += elapsed;
        delayedAt = null;
      }

      if (status === 'in_progress' && !startedAt) {
        startedAt = nowIso;
      }
      if (status === 'delayed') {
        delayedAt = nowIso;
      }
      if (status === 'done') {
        completedAt = nowIso;
        const createdTime = current.created_at ? new Date(current.created_at).getTime() : now.getTime();
        completedDurationSeconds = Math.max(0, Math.floor((now.getTime() - createdTime) / 1000));
      } else if (current.status === 'done') {
        completedAt = null;
        completedDurationSeconds = null;
      }

      const history = Array.isArray(current.stage_history) ? [...current.stage_history] : [];
      if (history.length > 0) {
        const last = { ...history[history.length - 1] };
        if (!last.leftAt) {
          last.leftAt = nowIso;
          last.durationSeconds = elapsed;
          history[history.length - 1] = last;
        }
      } else {
        history.push({
          toStatus: current.status,
          enteredAt: current.stage_entered_at || current.created_at,
          leftAt: nowIso,
          durationSeconds: elapsed,
        });
      }

      history.push({
        fromStatus: current.status,
        toStatus: status,
        enteredAt: nowIso,
      });

      const updates = {
        status,
        stage_entered_at: nowIso,
        started_at: startedAt,
        delayed_at: delayedAt,
        completed_at: completedAt,
        completed_duration_seconds: completedDurationSeconds,
        time_in_todo_seconds: timeInTodoSeconds,
        time_in_progress_seconds: timeInProgressSeconds,
        stage_history: history,
        updated_at: nowIso,
      };

      const { data: updated, error: uErr } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (uErr) throw uErr;

      // Sincroniza nota do calendário
      await supabase
        .from('day_notes')
        .update({ is_completed: status === 'done' })
        .eq('task_id', id);

      return updated ? mapTaskFromSupabase(updated) : null;
    }

    const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Falha ao mover tarefa');
    const data = await res.json();
    return data.task || null;
  },

  async deleteTask(id: string, deleteFutureRecurring: boolean = false): Promise<void> {
    if (isSupabaseConfigured()) {
      if (deleteFutureRecurring) {
        const { data: current } = await supabase
          .from('tasks')
          .select('recurring_group_id, due_date')
          .eq('id', id)
          .single();

        if (current?.recurring_group_id) {
          await supabase
            .from('tasks')
            .delete()
            .eq('recurring_group_id', current.recurring_group_id)
            .gte('due_date', current.due_date || '');

          await supabase
            .from('day_notes')
            .delete()
            .eq('recurring_group_id', current.recurring_group_id)
            .gte('date', current.due_date || '');
          return;
        }
      }

      await supabase.from('tasks').delete().eq('id', id);
      await supabase.from('day_notes').delete().eq('task_id', id);
      return;
    }

    const query = deleteFutureRecurring ? '?future=true' : '';
    const res = await fetch(`${API_BASE}/tasks/${id}${query}`, {
      method: 'DELETE',
      headers: JSON_HEADERS,
    });
    if (!res.ok) throw new Error('Falha ao excluir tarefa');
  },

  // ==================== ANOTAÇÕES / CALENDÁRIO ====================
  async getNotes(): Promise<DayNote[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('day_notes')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapNoteFromSupabase);
    }

    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error('Falha ao buscar anotações do servidor');
    return res.json();
  },

  async createNote(noteData: Omit<DayNote, 'id' | 'createdAt'>): Promise<DayNote | DayNote[]> {
    if (isSupabaseConfigured()) {
      let priority = 'medium';
      if (noteData.category === 'urgente') priority = 'urgent';
      else if (noteData.category === 'ideia') priority = 'low';

      const categoryTag = noteData.category
        ? noteData.category.charAt(0).toUpperCase() + noteData.category.slice(1)
        : 'Calendário';

      if (noteData.isMonthlyRecurring) {
        const baseDate = new Date(noteData.date + 'T00:00:00');
        const targetDay = baseDate.getDate();
        const recurringGroupId = `recur-${Date.now()}`;
        const newNotes: any[] = [];
        const newTasks: any[] = [];

        for (let i = 0; i < 12; i++) {
          const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
          const targetMonth = (baseDate.getMonth() + i) % 12;
          const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
          const validDay = Math.min(targetDay, maxDays);
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateKeyStr = `${targetYear}-${pad(targetMonth + 1)}-${pad(validDay)}`;

          const occurrenceTaskId = `task-${Date.now()}-${i}`;
          const occurrenceNoteId = `note-${Date.now()}-${i}`;

          newTasks.push(
            mapTaskToSupabase({
              id: occurrenceTaskId,
              title: noteData.title,
              description: noteData.content,
              company: noteData.company,
              status: 'todo',
              priority,
              dueDate: dateKeyStr,
              dueTime: noteData.time || undefined,
              tags: [categoryTag, 'Recorrente'],
              isMonthlyRecurring: true,
              recurringGroupId,
              color: noteData.color,
              createdAt: new Date().toISOString(),
            })
          );

          newNotes.push({
            id: occurrenceNoteId,
            task_id: occurrenceTaskId,
            date: dateKeyStr,
            title: noteData.title,
            content: noteData.content || null,
            category: noteData.category,
            company: noteData.company || null,
            color: noteData.color || null,
            time: noteData.time || null,
            is_completed: false,
            is_monthly_recurring: true,
            recurring_group_id: recurringGroupId,
            created_at: new Date().toISOString(),
          });
        }

        const { error: tErr } = await supabase.from('tasks').insert(newTasks);
        if (tErr) throw tErr;

        const { error: nErr } = await supabase.from('day_notes').insert(newNotes);
        if (nErr) throw nErr;

        if (noteData.company) {
          await this.createCompany(noteData.company);
        }

        return newNotes.map(mapNoteFromSupabase);
      }

      const taskId = `task-${Date.now()}`;
      const noteId = `note-${Date.now()}`;

      // Cria a tarefa correspondente no Kanban
      const newTask = mapTaskToSupabase({
        id: taskId,
        title: noteData.title,
        description: noteData.content,
        company: noteData.company,
        color: noteData.color,
        status: 'todo',
        priority,
        dueDate: noteData.date,
        dueTime: noteData.time || undefined,
        tags: [categoryTag],
        createdAt: new Date().toISOString(),
      });
      const { error: tErr } = await supabase.from('tasks').insert(newTask);
      if (tErr) throw tErr;

      // Cria o registro da anotação no calendário
      const newNote = mapNoteToSupabase({
        ...noteData,
        id: noteId,
        taskId,
        createdAt: new Date().toISOString(),
      });
      const { error: nErr } = await supabase.from('day_notes').insert(newNote);
      if (nErr) throw nErr;

      if (noteData.company) {
        await this.createCompany(noteData.company);
      }

      return {
        ...noteData,
        id: noteId,
        taskId,
        createdAt: new Date().toISOString(),
      } as DayNote;
    }

    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(noteData),
    });
    if (!res.ok) throw new Error('Falha ao salvar anotação no banco');
    return res.json();
  },

  async updateNote(note: DayNote): Promise<DayNote> {
    if (isSupabaseConfigured()) {
      const mapped = mapNoteToSupabase(note);
      const { error } = await supabase
        .from('day_notes')
        .update(mapped)
        .eq('id', note.id);
      if (error) throw error;

      // Se tiver tarefa vinculada, atualiza a tarefa no Kanban
      if (note.taskId) {
        let priority = 'medium';
        if (note.category === 'urgente') priority = 'urgent';
        else if (note.category === 'ideia') priority = 'low';

        const categoryTag = note.category
          ? note.category.charAt(0).toUpperCase() + note.category.slice(1)
          : 'Calendário';

        await supabase
          .from('tasks')
          .update({
            title: note.title,
            description: note.content || null,
            company: note.company || null,
            color: note.color || null,
            due_date: note.date,
            due_time: note.time || null,
            priority,
            tags: [categoryTag],
            updated_at: new Date().toISOString(),
          })
          .eq('id', note.taskId);
      }

      if (note.company) {
        await this.createCompany(note.company);
      }

      return note;
    }

    const res = await fetch(`${API_BASE}/notes/${note.id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Falha ao atualizar anotação');
    return res.json();
  },

  async toggleNoteComplete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data: current } = await supabase
        .from('day_notes')
        .select('*')
        .eq('id', id)
        .single();
      if (!current) return;

      const nextCompleted = !current.is_completed;
      await supabase
        .from('day_notes')
        .update({ is_completed: nextCompleted })
        .eq('id', id);

      if (current.task_id) {
        await this.updateTaskStatus(current.task_id, nextCompleted ? 'done' : 'todo');
      }
      return;
    }

    const res = await fetch(`${API_BASE}/notes/${id}/toggle`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
    });
    if (!res.ok) throw new Error('Falha ao atualizar anotação');
  },

  async deleteNote(id: string, deleteFutureRecurring: boolean = false): Promise<void> {
    if (isSupabaseConfigured()) {
      if (deleteFutureRecurring) {
        const { data: current } = await supabase
          .from('day_notes')
          .select('recurring_group_id, date')
          .eq('id', id)
          .single();

        if (current?.recurring_group_id) {
          await supabase
            .from('day_notes')
            .delete()
            .eq('recurring_group_id', current.recurring_group_id)
            .gte('date', current.date);

          await supabase
            .from('tasks')
            .delete()
            .eq('recurring_group_id', current.recurring_group_id)
            .gte('due_date', current.date);
          return;
        }
      }

      const { data: current } = await supabase
        .from('day_notes')
        .select('task_id')
        .eq('id', id)
        .single();

      await supabase.from('day_notes').delete().eq('id', id);
      if (current?.task_id) {
        await supabase.from('tasks').delete().eq('id', current.task_id);
      }
      return;
    }

    const query = deleteFutureRecurring ? '?future=true' : '';
    const res = await fetch(`${API_BASE}/notes/${id}${query}`, {
      method: 'DELETE',
      headers: JSON_HEADERS,
    });
    if (!res.ok) throw new Error('Falha ao excluir anotação');
  },

  // ==================== EMPRESAS ====================
  async getCompanies(): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map((c) => c.name);
    }

    const res = await fetch(`${API_BASE}/companies`);
    if (!res.ok) throw new Error('Falha ao buscar empresas');
    return res.json();
  },

  async createCompany(name: string, cnpj?: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isSupabaseConfigured()) {
      await supabase
        .from('companies')
        .upsert({ name: trimmed, cnpj: cnpj || null }, { onConflict: 'name' });
      return;
    }

    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: trimmed, cnpj }),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar empresa');
  },

  // ==================== AUTENTICAÇÃO (MOCK/SIMPLIFICADO) ====================
  async login(_email: string, _password: string): Promise<{ user: any; token: string }> {
    return {
      user: {
        id: 'user-admin-default',
        name: 'Equipe Ergon',
        email: 'contato@ergon.com.br',
        role: 'admin',
      },
      token: 'fake-token-default',
    };
  },

  async register(_name: string, _email: string, _password: string, _role?: string): Promise<{ user: any; token: string }> {
    return {
      user: {
        id: 'user-admin-default',
        name: 'Equipe Ergon',
        email: 'contato@ergon.com.br',
        role: 'admin',
      },
      token: 'fake-token-default',
    };
  },

  async getMe(): Promise<{ user: any }> {
    return {
      user: {
        id: 'user-admin-default',
        name: 'Equipe Ergon',
        email: 'contato@ergon.com.br',
        role: 'admin',
      },
    };
  },

  // ==================== MIGRAÇÃO LOCALSTORAGE ====================
  async migrateFromLocalStorage(_tasks: any[], _notes: any[], _companies: any[]): Promise<boolean> {
    return true;
  },
};
