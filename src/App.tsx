import { useState, useEffect, useCallback } from 'react';
import { 
  CalendarDays, 
  KanbanSquare, 
  Columns2
} from 'lucide-react';
import type { Task, DayNote, TaskStatus, TaskPriority } from './types';
import { 
  loadTasksFromStorage, 
  saveTasksToStorage, 
  loadNotesFromStorage, 
  saveNotesToStorage,
  loadCompaniesFromStorage,
  saveCompaniesToStorage
} from './utils/storage';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/Calendar/CalendarView';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { TaskModal } from './components/Kanban/TaskModal';
import { DayNotesModal } from './components/Calendar/DayNotesModal';
import { AdminMetricsModal } from './components/Admin/AdminMetricsModal';
import { CompanyManagerModal } from './components/Common/CompanyManagerModal';
import { formatDateKey, parseDateKey } from './utils/dateUtils';

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());
  const [notes, setNotes] = useState<DayNote[]>(() => loadNotesFromStorage());
  const [companies, setCompanies] = useState<string[]>(() => loadCompaniesFromStorage());
  
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth());
  const [activeTab, setActiveTab] = useState<'both' | 'calendar' | 'kanban'>('both');
  
  // Selected date state for sync between calendar and kanban
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAdminMetricsOpen, setIsAdminMetricsOpen] = useState(false);
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);

  // Sincronização centralizada com o banco de dados
  const syncWithDatabase = useCallback(async () => {
    try {
      const [sqlTasks, sqlNotes, sqlCompanies] = await Promise.all([
        api.getTasks(),
        api.getNotes(),
        api.getCompanies(),
      ]);

      if (sqlTasks) {
        setTasks(sqlTasks);
        saveTasksToStorage(sqlTasks);
      }
      if (sqlNotes) {
        setNotes(sqlNotes);
        saveNotesToStorage(sqlNotes);
      }
      if (sqlCompanies) {
        setCompanies(sqlCompanies);
        saveCompaniesToStorage(sqlCompanies);
      }
    } catch (err) {
      console.warn('Sincronização em segundo plano:', err);
    }
  }, []);

  // 1. Carrega dados do Banco SQL e faz migração segura de dados antigos
  useEffect(() => {
    async function initFromSQL() {
      try {
        const localTasks = loadTasksFromStorage();
        const localNotes = loadNotesFromStorage();
        const localCompanies = loadCompaniesFromStorage();

        // Migra dados locais caso existam para o banco SQL
        if (localTasks.length > 0 || localNotes.length > 0 || localCompanies.length > 0) {
          await api.migrateFromLocalStorage(localTasks, localNotes, localCompanies);
        }

        await syncWithDatabase();
      } catch (err) {
        console.warn('Banco de dados inicializando ou operando offline, mantendo cache:', err);
      }
    }

    initFromSQL();
  }, [syncWithDatabase]);

  // 2. Sincronização em tempo real (Supabase Realtime) + polling de segurança
  // Mantém a dupla (Bea & Vini) sempre com dados sincronizados instantaneamente!
  useEffect(() => {
    // Escuta alterações em tempo real via websockets do Supabase
    const unsubscribe = api.subscribeToRealtime(() => {
      syncWithDatabase();
    });

    const interval = setInterval(() => {
      syncWithDatabase();
    }, 4000);

    const handleFocus = () => {
      syncWithDatabase();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncWithDatabase]);

  // Sync cache de segurança
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  useEffect(() => {
    saveCompaniesToStorage(companies);
  }, [companies]);

  const handleAddNewCompany = async (newCompany: string) => {
    const trimmed = newCompany.trim();
    if (!trimmed) return;

    setCompanies((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    try {
      await api.createCompany(trimmed);
      const updatedComps = await api.getCompanies();
      setCompanies(updatedComps);
    } catch (err) {
      console.error('Erro ao cadastrar empresa:', err);
    }
  };

  const handleDeleteCompany = async (companyToDelete: string) => {
    setCompanies((prev) => prev.filter((c) => c !== companyToDelete));
    try {
      await api.deleteCompany(companyToDelete);
      const updatedComps = await api.getCompanies();
      setCompanies(updatedComps);
    } catch (err) {
      console.error('Erro ao excluir empresa:', err);
    }
  };

  // Task Actions
  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    // Tratamento otimista local
    if (taskData.isMonthlyRecurring && taskData.dueDate) {
      const baseDate = parseDateKey(taskData.dueDate);
      const targetDay = baseDate.getDate();
      const recurringGroupId = `recur-${Date.now()}`;
      const newTasks: Task[] = [];
      const newNotes: DayNote[] = [];

      for (let i = 0; i < 12; i++) {
        const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
        const targetMonth = (baseDate.getMonth() + i) % 12;
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        const validDay = Math.min(targetDay, maxDays);
        const occurrenceDate = new Date(targetYear, targetMonth, validDay);
        const dateKeyStr = formatDateKey(occurrenceDate);

        const occurrenceTaskId = `task-${Date.now()}-${i}`;
        const occurrenceNoteId = `note-${Date.now()}-${i}`;

        newTasks.push({
          ...taskData,
          id: occurrenceTaskId,
          dueDate: dateKeyStr,
          isMonthlyRecurring: true,
          recurringGroupId,
          createdAt: new Date().toISOString(),
        });

        newNotes.push({
          id: occurrenceNoteId,
          taskId: occurrenceTaskId,
          date: dateKeyStr,
          title: taskData.title,
          content: taskData.description,
          category: 'geral',
          company: taskData.company,
          isMonthlyRecurring: true,
          recurringGroupId,
          color: taskData.color,
          createdAt: new Date().toISOString(),
        });
      }

      if (taskData.company) {
        handleAddNewCompany(taskData.company);
      }

      setTasks((prev) => [...newTasks, ...prev]);
      setNotes((prev) => [...newNotes, ...prev]);

      try {
        await api.createTask(taskData);
        const [sqlTasks, sqlNotes] = await Promise.all([api.getTasks(), api.getNotes()]);
        setTasks(sqlTasks);
        setNotes(sqlNotes);
      } catch (err) {
        console.error('Erro ao sincronizar tarefa recorrente com SQL:', err);
      }
      return;
    }

    if (taskData.company) {
      handleAddNewCompany(taskData.company);
    }

    const tempId = `task-${Date.now()}`;
    const newTask: Task = {
      ...taskData,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);

    try {
      const created = await api.createTask(taskData) as Task;
      if (created && created.id) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      }
    } catch (err) {
      console.error('Erro ao salvar tarefa no SQL:', err);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const existing = tasks.find((t) => t.id === updatedTask.id);
    let finalTask = { ...updatedTask };

    if (existing && existing.status !== updatedTask.status) {
      const now = new Date();
      const nowIso = now.toISOString();
      const stageStart = existing.stageEnteredAt 
        ? new Date(existing.stageEnteredAt).getTime() 
        : (existing.createdAt ? new Date(existing.createdAt).getTime() : now.getTime());
      const elapsed = Math.max(0, Math.floor((now.getTime() - stageStart) / 1000));

      let timeInTodoSeconds = existing.timeInTodoSeconds || 0;
      let timeInProgressSeconds = existing.timeInProgressSeconds || 0;
      let totalDelayedSeconds = existing.totalDelayedSeconds || 0;

      if (existing.status === 'todo') {
        timeInTodoSeconds += elapsed;
      } else if (existing.status === 'in_progress') {
        timeInProgressSeconds += elapsed;
      } else if (existing.status === 'delayed') {
        totalDelayedSeconds += elapsed;
      }

      finalTask = {
        ...updatedTask,
        stageEnteredAt: nowIso,
        timeInTodoSeconds,
        timeInProgressSeconds,
        totalDelayedSeconds,
        startedAt: (updatedTask.status === 'in_progress' && !existing.startedAt) ? nowIso : existing.startedAt,
        updatedAt: nowIso,
      };
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === finalTask.id ? finalTask : t))
    );

    // Sincroniza nota do calendário vinculada
    setNotes((prev) =>
      prev.map((n) =>
        n.taskId === finalTask.id
          ? {
              ...n,
              title: finalTask.title,
              content: finalTask.description,
              company: finalTask.company,
              date: finalTask.dueDate || n.date,
              time: finalTask.dueTime,
              color: finalTask.color,
            }
          : n
      )
    );

    try {
      const saved = await api.updateTask(finalTask);
      if (saved) {
        setTasks((prev) => prev.map((t) => (t.id === finalTask.id ? saved : t)));
      }
      if (finalTask.company) {
        const comps = await api.getCompanies();
        setCompanies(comps);
      }
    } catch (err) {
      console.error('Erro ao atualizar tarefa no SQL:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    let deleteFuture = false;

    if (taskToDelete?.recurringGroupId) {
      deleteFuture = window.confirm(
        'Esta é uma tarefa recorrente mensal.\n\nDeseja excluir todas as repetições futuras?\nClique em "OK" para excluir todas ou "Cancelar" para excluir apenas deste mês.'
      );
      if (deleteFuture) {
        setTasks((prev) =>
          prev.filter((t) => !(t.recurringGroupId === taskToDelete.recurringGroupId && (!taskToDelete.dueDate || !t.dueDate || t.dueDate >= taskToDelete.dueDate)))
        );
        setNotes((prev) =>
          prev.filter((n) => !(n.recurringGroupId === taskToDelete.recurringGroupId && (!taskToDelete.dueDate || n.date >= taskToDelete.dueDate)))
        );
        try {
          await api.deleteTask(id, true);
        } catch (err) {
          console.error('Erro ao deletar série de tarefas no SQL:', err);
        }
        return;
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    setNotes((prev) => prev.filter((n) => n.taskId !== id));

    try {
      await api.deleteTask(id, false);
    } catch (err) {
      console.error('Erro ao deletar tarefa no SQL:', err);
    }
  };

  const handleMoveTaskStatus = async (id: string, newStatus: TaskStatus) => {
    const now = new Date();
    const nowIso = now.toISOString();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.status === newStatus) return t;

        // Calcula com precisão o tempo que permaneceu no estágio anterior
        const stageStart = t.stageEnteredAt 
          ? new Date(t.stageEnteredAt).getTime() 
          : (t.createdAt ? new Date(t.createdAt).getTime() : now.getTime());
        const elapsed = Math.max(0, Math.floor((now.getTime() - stageStart) / 1000));

        let timeInTodoSeconds = t.timeInTodoSeconds || 0;
        let timeInProgressSeconds = t.timeInProgressSeconds || 0;
        let totalDelayedSeconds = t.totalDelayedSeconds || 0;

        if (t.status === 'todo') {
          timeInTodoSeconds += elapsed;
        } else if (t.status === 'in_progress') {
          timeInProgressSeconds += elapsed;
        } else if (t.status === 'delayed') {
          totalDelayedSeconds += elapsed;
        }

        const history = [...(t.stageHistory || [])];
        if (history.length > 0) {
          const last = { ...history[history.length - 1] };
          if (!last.leftAt) {
            last.leftAt = nowIso;
            last.durationSeconds = elapsed;
            history[history.length - 1] = last;
          }
        } else {
          history.push({
            toStatus: t.status,
            enteredAt: t.stageEnteredAt || t.createdAt,
            leftAt: nowIso,
            durationSeconds: elapsed,
          });
        }

        history.push({
          fromStatus: t.status,
          toStatus: newStatus,
          enteredAt: nowIso,
        });

        return {
          ...t,
          status: newStatus,
          stageEnteredAt: nowIso,
          timeInTodoSeconds,
          timeInProgressSeconds,
          totalDelayedSeconds,
          startedAt: (newStatus === 'in_progress' && !t.startedAt) ? nowIso : t.startedAt,
          completedAt: newStatus === 'done' ? nowIso : (t.status === 'done' ? undefined : t.completedAt),
          completedDurationSeconds: newStatus === 'done' 
            ? Math.max(0, Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / 1000))
            : (t.status === 'done' ? undefined : t.completedDurationSeconds),
          stageHistory: history,
          updatedAt: nowIso,
        };
      })
    );

    // Sync completion status on corresponding note in calendar
    setNotes((prev) =>
      prev.map((n) =>
        n.taskId === id
          ? { ...n, isCompleted: newStatus === 'done' }
          : n
      )
    );

    try {
      const updated = await api.updateTaskStatus(id, newStatus);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa no SQL:', err);
    }
  };

  // Note Actions: Everything created in the calendar goes as "A Fazer" in Kanban!
  const handleAddNote = async (noteData: Omit<DayNote, 'id' | 'createdAt'>) => {
    let priority: TaskPriority = 'medium';
    if (noteData.category === 'urgente') priority = 'urgent';
    else if (noteData.category === 'ideia') priority = 'low';

    if (noteData.isMonthlyRecurring) {
      const baseDate = parseDateKey(noteData.date);
      const targetDay = baseDate.getDate();
      const recurringGroupId = `recur-${Date.now()}`;
      const newNotes: DayNote[] = [];
      const newTasks: Task[] = [];

      for (let i = 0; i < 12; i++) {
        const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + i) / 12);
        const targetMonth = (baseDate.getMonth() + i) % 12;
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        const validDay = Math.min(targetDay, maxDays);
        const occurrenceDate = new Date(targetYear, targetMonth, validDay);
        const dateKeyStr = formatDateKey(occurrenceDate);

        const occurrenceTaskId = `task-${Date.now()}-${i}`;
        const occurrenceNoteId = `note-${Date.now()}-${i}`;

        newNotes.push({
          ...noteData,
          id: occurrenceNoteId,
          taskId: occurrenceTaskId,
          date: dateKeyStr,
          isMonthlyRecurring: true,
          recurringGroupId,
          createdAt: new Date().toISOString(),
        });

        newTasks.push({
          id: occurrenceTaskId,
          title: noteData.title,
          description: noteData.content,
          company: noteData.company,
          status: 'todo',
          priority,
          dueDate: dateKeyStr,
          dueTime: noteData.time || undefined,
          assignee: 'Bea',
          checklist: [],
          isMonthlyRecurring: true,
          recurringGroupId,
          color: noteData.color,
          createdAt: new Date().toISOString(),
        });
      }

      if (noteData.company) {
        handleAddNewCompany(noteData.company);
      }

      setNotes((prev) => [...newNotes, ...prev]);
      setTasks((prev) => [...newTasks, ...prev]);

      try {
        await api.createNote(noteData);
        const [sqlNotes, sqlTasks] = await Promise.all([api.getNotes(), api.getTasks()]);
        setNotes(sqlNotes);
        setTasks(sqlTasks);
      } catch (err) {
        console.error('Erro ao sincronizar anotação recorrente no SQL:', err);
      }
      return;
    }

    if (noteData.company) {
      handleAddNewCompany(noteData.company);
    }

    const tempTaskId = `task-${Date.now()}`;
    const tempNoteId = `note-${Date.now()}`;

    const newNote: DayNote = {
      ...noteData,
      id: tempNoteId,
      taskId: tempTaskId,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);

    const newTask: Task = {
      id: tempTaskId,
      title: noteData.title,
      description: noteData.content,
      company: noteData.company,
      status: 'todo',
      priority,
      dueDate: noteData.date,
      dueTime: noteData.time || undefined,
      assignee: 'Bea',
      checklist: [],
      color: noteData.color,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);

    try {
      await api.createNote(noteData);
      const [sqlNotes, sqlTasks] = await Promise.all([api.getNotes(), api.getTasks()]);
      setNotes(sqlNotes);
      setTasks(sqlTasks);
    } catch (err) {
      console.error('Erro ao salvar anotação no SQL:', err);
    }
  };

  const handleToggleNoteComplete = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const nextCompleted = !n.isCompleted;
          if (n.taskId) {
            setTasks((tPrev) =>
              tPrev.map((t) =>
                t.id === n.taskId
                  ? {
                      ...t,
                      status: nextCompleted ? 'done' : 'todo',
                      updatedAt: new Date().toISOString(),
                    }
                  : t
              )
            );
          }
          return { ...n, isCompleted: nextCompleted };
        }
        return n;
      })
    );

    try {
      await api.toggleNoteComplete(id);
    } catch (err) {
      console.error('Erro ao alternar status da anotação no SQL:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const noteToDelete = notes.find((n) => n.id === id);
    let deleteFuture = false;

    if (noteToDelete?.recurringGroupId) {
      deleteFuture = window.confirm(
        'Esta é uma anotação recorrente mensal.\n\nDeseja excluir todas as repetições futuras?\nClique em "OK" para excluir todas ou "Cancelar" para excluir apenas deste mês.'
      );
      if (deleteFuture) {
        setNotes((prev) =>
          prev.filter((n) => !(n.recurringGroupId === noteToDelete.recurringGroupId && n.date >= noteToDelete.date))
        );
        setTasks((prev) =>
          prev.filter((t) => !(t.recurringGroupId === noteToDelete.recurringGroupId && (!t.dueDate || t.dueDate >= noteToDelete.date)))
        );
        try {
          await api.deleteNote(id, true);
        } catch (err) {
          console.error('Erro ao excluir série de notas no SQL:', err);
        }
        return;
      }
    }

    if (noteToDelete?.taskId) {
      setTasks((prev) => prev.filter((t) => t.id !== noteToDelete.taskId));
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));

    try {
      await api.deleteNote(id, false);
    } catch (err) {
      console.error('Erro ao excluir anotação no SQL:', err);
    }
  };

  const handleUpdateNote = async (updatedNote: DayNote) => {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    if (updatedNote.taskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updatedNote.taskId
            ? {
                ...t,
                title: updatedNote.title,
                description: updatedNote.content,
                company: updatedNote.company,
                dueDate: updatedNote.date,
                dueTime: updatedNote.time,
                color: updatedNote.color,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    }

    try {
      await api.updateNote(updatedNote);
      await syncWithDatabase();
    } catch (err) {
      console.error('Erro ao atualizar compromisso:', err);
    }
  };

  const handleSelectDueDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsNewNoteModalOpen(true);
  };

  const handleSelectTaskFromCalendar = (task: Task) => {
    setEditingTask(task);
    setIsNewTaskModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-['Inter',sans-serif] select-none">
      {/* Top Navbar */}
      <Navbar 
        onOpenAdminMetrics={() => setIsAdminMetricsOpen(true)}
        onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
      />

      {/* View Switcher: Lado a Lado | Calendário | Kanban */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-200/90 border-b border-slate-300/80 shrink-0 font-['Inter',sans-serif]">
        <div className="flex items-center gap-1 bg-slate-300/70 p-0.5 rounded-lg text-xs font-semibold text-slate-700">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'both'
                ? 'bg-[#0d345e] text-amber-300 shadow-xs font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Visualizar Calendário e Kanban lado a lado"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lado a Lado</span>
            <span className="sm:hidden">Dividido</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#0d345e] text-amber-300 shadow-xs font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Foco exclusivo no Calendário"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Calendário</span>
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-[#0d345e] text-amber-300 shadow-xs font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Foco exclusivo no Quadro Kanban (tela cheia)"
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Quadro Kanban</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-medium">
        </div>
      </div>

      {/* Main Split Screen Area: 50% Left Calendar, 50% Right Kanban */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Half: Calendar & Annotations */}
        <section 
          className={`
            h-full flex flex-col overflow-hidden transition-all duration-150
            ${activeTab === 'calendar' ? 'w-full flex' : ''}
            ${activeTab === 'kanban' ? 'hidden' : ''}
            ${activeTab === 'both' ? 'w-full lg:w-[44%] xl:w-[42%] flex' : ''}
          `}
        >
          <CalendarView
            currentYear={currentYear}
            currentMonth={currentMonth}
            onYearChange={setCurrentYear}
            onMonthChange={setCurrentMonth}
            notes={notes}
            tasks={tasks}
            companies={companies}
            onAddNewCompany={handleAddNewCompany}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onToggleNoteComplete={handleToggleNoteComplete}
            onDeleteNote={handleDeleteNote}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            onSelectTask={handleSelectTaskFromCalendar}
          />
        </section>

        {/* Right Half: Kanban Board (4 Columns: A Fazer, Fazendo, Concluído, Atrasado) */}
        <section 
          className={`
            h-full flex flex-col overflow-hidden transition-all duration-150
            ${activeTab === 'kanban' ? 'w-full flex' : ''}
            ${activeTab === 'calendar' ? 'hidden' : ''}
            ${activeTab === 'both' ? 'hidden lg:flex lg:w-[56%] xl:w-[58%]' : ''}
          `}
        >
          <KanbanBoard
            currentYear={currentYear}
            currentMonth={currentMonth}
            tasks={tasks}
            companies={companies}
            onAddNewCompany={handleAddNewCompany}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onMoveTaskStatus={handleMoveTaskStatus}
            onSelectDueDate={handleSelectDueDate}
          />
        </section>

      </main>

      {/* Global Quick Modals */}
      <TaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={(data, taskId) => {
          if (taskId && editingTask) {
            handleUpdateTask({ ...editingTask, ...data, updatedAt: new Date().toISOString() });
          } else {
            handleAddTask(data);
          }
        }}
        editingTask={editingTask}
        defaultStatus="todo"
        defaultDueDate={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`}
        companies={companies}
        onAddNewCompany={handleAddNewCompany}
        onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
      />

      <DayNotesModal
        isOpen={isNewNoteModalOpen}
        onClose={() => {
          setIsNewNoteModalOpen(false);
          setSelectedDateKey('');
        }}
        dateKey={selectedDateKey || formatDateKey(new Date())}
        notes={selectedDateKey ? notes.filter((n) => n.date === selectedDateKey) : []}
        tasksDue={selectedDateKey ? tasks.filter((t) => t.dueDate === selectedDateKey) : []}
        companies={companies}
        onAddNewCompany={handleAddNewCompany}
        onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onToggleNoteComplete={handleToggleNoteComplete}
        onDeleteNote={handleDeleteNote}
        onSelectTask={handleSelectTaskFromCalendar}
      />

      {/* Modal de Métricas de Tempo e SLA (Exclusivo da Administração) */}
      <AdminMetricsModal
        isOpen={isAdminMetricsOpen}
        onClose={() => setIsAdminMetricsOpen(false)}
        tasks={tasks}
        companies={companies}
      />

      {/* Modal de Gerenciamento e Exclusão de Empresas */}
      <CompanyManagerModal
        isOpen={isCompanyManagerOpen}
        onClose={() => setIsCompanyManagerOpen(false)}
        companies={companies}
        tasks={tasks}
        onAddNewCompany={handleAddNewCompany}
        onDeleteCompany={handleDeleteCompany}
      />
    </div>
  );
}

export default App;
