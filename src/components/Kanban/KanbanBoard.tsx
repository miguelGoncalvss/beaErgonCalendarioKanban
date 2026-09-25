import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { isDateOverdue, MONTH_NAMES_PT, formatDateKey } from '../../utils/dateUtils';
import { KanbanColumn } from './KanbanColumn';
import { TaskModal } from './TaskModal';

interface KanbanBoardProps {
  currentYear: number;
  currentMonth: number;
  tasks: Task[];
  companies?: string[];
  onAddNewCompany?: (company: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTaskStatus: (id: string, newStatus: TaskStatus) => void;
  onSelectDueDate?: (dateKey: string) => void;
}

const COLUMNS: {
  id: TaskStatus;
  title: string;
  color: {
    bar: string;
    badge: string;
    dropRing: string;
  };
}[] = [
  {
    id: 'todo',
    title: 'A Fazer',
    color: {
      bar: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-800',
      dropRing: 'ring-blue-400',
    },
  },
  {
    id: 'in_progress',
    title: 'Fazendo',
    color: {
      bar: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-800',
      dropRing: 'ring-amber-400',
    },
  },
  {
    id: 'done',
    title: 'Concluído',
    color: {
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800',
      dropRing: 'ring-emerald-400',
    },
  },
  {
    id: 'delayed',
    title: 'Atrasado',
    color: {
      bar: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-800',
      dropRing: 'ring-rose-400',
    },
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  currentYear,
  currentMonth,
  tasks,
  companies = [],
  onAddNewCompany,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTaskStatus,
  onSelectDueDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<TaskStatus>('todo');

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Filter tasks that belong specifically to the currently viewed month
  const monthTasks = tasks.filter((task) => {
    if (task.dueDate) {
      return task.dueDate.startsWith(currentMonthKey);
    }
    return task.createdAt.startsWith(currentMonthKey);
  });

  // Check how many tasks in THIS month are overdue but not marked as delayed or done
  const unflaggedOverdueTasks = monthTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'delayed' && isDateOverdue(t.dueDate)
  );

  const handleAutoMoveOverdue = () => {
    unflaggedOverdueTasks.forEach((t) => {
      onMoveTaskStatus(t.id, 'delayed');
    });
  };

  const handleOpenNewTaskModal = (status: TaskStatus = 'todo') => {
    setEditingTask(null);
    setDefaultColumnStatus(status);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveModal = (
    taskData: Omit<Task, 'id' | 'createdAt'>,
    taskId?: string
  ) => {
    if (taskId && editingTask) {
      onUpdateTask({
        ...editingTask,
        ...taskData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddTask(taskData);
    }
  };

  // Filter tasks by search, priority, and company
  const filteredTasks = monthTasks.filter((task) => {
    const matchesQuery =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      task.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.company && task.company.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter === 'all' || task.priority === priorityFilter;

    const matchesCompany =
      companyFilter === 'all' || task.company === companyFilter;

    return matchesQuery && matchesPriority && matchesCompany;
  });

  const today = new Date();
  const defaultDueDate =
    currentMonth === today.getMonth() && currentYear === today.getFullYear()
      ? formatDateKey(today)
      : `${currentMonthKey}-01`;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 overflow-hidden font-['Inter',sans-serif]">
      {/* Kanban Top Filter & Actions Bar - Totalmente Responsivo */}
      <div className="min-h-16 py-2.5 px-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        
        {/* Title, Month & Filters */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-sm font-extrabold text-slate-900 m-0 flex items-center gap-1.5 whitespace-nowrap">
            Quadro Kanban
          </h2>

          {/* Active Month Badge */}
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0d345e] border border-blue-200 capitalize whitespace-nowrap">
            {MONTH_NAMES_PT[currentMonth]} {currentYear}
          </span>

          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            ({filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'})
          </span>

          {/* Company Filter */}
          <div className="flex items-center gap-1.5 ml-0.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#0d345e] font-medium text-slate-700 cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
              title="Filtrar por empresa cliente"
            >
              <option value="all">Todas as Empresas</option>
              {companies.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#0d345e] font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">Prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
        </div>

        {/* Search and New Task Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0d345e] w-28 sm:w-36 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenNewTaskModal('todo')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0d345e] hover:bg-blue-900 active:bg-blue-950 text-amber-300 border border-amber-400/50 text-xs font-extrabold shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Auto Overdue Alert Banner if any task is overdue */}
      {unflaggedOverdueTasks.length > 0 && (
        <div className="px-3 pt-2.5 shrink-0">
          <div className="p-2 px-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between text-xs text-rose-800 gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>{unflaggedOverdueTasks.length}</strong> {unflaggedOverdueTasks.length === 1 ? 'tarefa ultrapassou' : 'tarefas ultrapassaram'} o prazo em {MONTH_NAMES_PT[currentMonth]}.
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoMoveOverdue}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md text-[11px] transition shrink-0 cursor-pointer shadow-2xs"
            >
              Mover para Atrasado
            </button>
          </div>
        </div>
      )}

      {/* Kanban 4 Columns Container: As 4 colunas sempre visíveis lado a lado na tela */}
      <div className="flex-1 p-2 sm:p-2.5 overflow-hidden min-h-0">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 h-full w-full min-w-0">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={columnTasks}
                onDropTask={onMoveTaskStatus}
                onAddTask={handleOpenNewTaskModal}
                onEditTask={handleEditTask}
                onDeleteTask={onDeleteTask}
                onMoveStatus={onMoveTaskStatus}
                onSelectDueDate={onSelectDueDate}
              />
            );
          })}
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingTask={editingTask}
        defaultStatus={defaultColumnStatus}
        defaultDueDate={defaultDueDate}
        companies={companies}
        onAddNewCompany={onAddNewCompany}
      />
    </div>
  );
};
