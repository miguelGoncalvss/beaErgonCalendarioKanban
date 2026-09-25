import React, { useState } from 'react';
import { Plus, ListFilter } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: {
    bar: string;
    badge: string;
    dropRing: string;
  };
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveStatus: (id: string, newStatus: TaskStatus) => void;
  onUpdateTask?: (task: Task) => void;
  onSelectDueDate?: (dateKey: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  color,
  onDropTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveStatus,
  onUpdateTask,
  onSelectDueDate,
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full min-w-0 flex flex-col h-full bg-slate-100/80 rounded-xl border transition-all duration-150 shadow-2xs overflow-hidden font-['Inter',sans-serif]
        ${isOver 
          ? `ring-2 ${color.dropRing} bg-blue-50/50 border-blue-400 scale-[1.006]` 
          : 'border-slate-200/80'}
      `}
    >
      {/* Column Header */}
      <div className="p-2 sm:p-2.5 px-2.5 flex items-center justify-between border-b border-slate-200/70 bg-white/90 backdrop-blur-xs min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.bar}`} />
          <h3 className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-tight truncate m-0">
            {title}
          </h3>
          <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded-full shrink-0">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(id)}
          className="p-1 rounded-md text-slate-400 hover:text-[#0d345e] hover:bg-slate-200/60 transition cursor-pointer shrink-0"
          title={`Adicionar tarefa em ${title}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task List: Scrollable container */}
      <div className="flex-1 p-1.5 sm:p-2 space-y-2 overflow-y-auto min-h-0">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMoveStatus={onMoveStatus}
            onUpdateTask={onUpdateTask}
            onSelectDueDate={onSelectDueDate}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-20 border border-dashed border-slate-300/80 rounded-lg flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-white/30">
            <ListFilter className="w-3.5 h-3.5 mb-1 opacity-40 text-slate-400" />
            <p className="text-[10.5px] font-medium text-slate-500 m-0">Sem tarefas</p>
          </div>
        )}
      </div>

      {/* Quick Add footer button */}
      <div className="p-1.5 border-t border-slate-200/60 bg-white/50">
        <button
          type="button"
          onClick={() => onAddTask(id)}
          className="w-full py-1 px-2 rounded-md text-[11px] font-bold text-slate-600 hover:text-[#0d345e] hover:bg-white border border-transparent hover:border-slate-200 shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3 text-slate-400" />
          <span>Adicionar</span>
        </button>
      </div>
    </div>
  );
};
