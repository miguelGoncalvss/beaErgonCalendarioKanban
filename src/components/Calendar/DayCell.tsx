import React from 'react';
import { Plus, Clock } from 'lucide-react';
import type { CalendarDay } from '../../utils/dateUtils';
import type { DayNote, Task } from '../../types';

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  notes: DayNote[];
  tasksDue: Task[];
  onClick: () => void;
  onQuickAddNote: (e: React.MouseEvent) => void;
}

export const DayCell: React.FC<DayCellProps> = ({
  day,
  isSelected,
  notes,
  tasksDue,
  onClick,
  onQuickAddNote,
}) => {
  // Reuniões agendadas para este dia
  const meetings = notes.filter((n) => n.category === 'reuniao');
  
  // Tarefas que não são reuniões
  const nonMeetingTasks = tasksDue.filter(
    (t) => !notes.some((n) => n.category === 'reuniao' && (n.taskId === t.id || n.title === t.title))
  );

  // Notas avulsas não vinculadas a tasks
  const standaloneNotes = notes.filter(
    (n) => n.category !== 'reuniao' && !tasksDue.some((t) => t.id === n.taskId || t.title === n.title)
  );

  const hasDelayedTasks = tasksDue.some((t) => t.status === 'delayed');
  const totalCount = meetings.length + nonMeetingTasks.length + standaloneNotes.length;

  return (
    <div
      onClick={onClick}
      title={`Ver agenda e demandas do dia ${day.dayNumber}`}
      className={`
        relative group min-h-[95px] p-1.5 sm:p-2 border-b border-r border-slate-100 flex flex-col justify-between transition-all duration-150 cursor-pointer select-none
        ${!day.isCurrentMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white text-slate-700 hover:bg-blue-50/40'}
        ${isSelected ? 'ring-2 ring-[#0d345e] ring-inset z-10 bg-blue-50/50 shadow-xs' : ''}
      `}
    >
      {/* Day header: Day number & hover quick add button */}
      <div className="flex items-center justify-between">
        <span
          className={`
            text-xs w-6 h-6 flex items-center justify-center rounded-full transition-all
            ${day.isToday 
              ? 'bg-[#0d345e] text-amber-300 font-black shadow-xs border border-amber-400/40' 
              : day.isCurrentMonth 
                ? 'text-slate-800 font-semibold' 
                : 'text-slate-400'}
          `}
        >
          {day.dayNumber}
        </span>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAddNote(e);
          }}
          className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 rounded hover:bg-amber-100/90 text-[#0d345e] transition cursor-pointer border border-transparent hover:border-amber-300"
          title={`Adicionar reunião ou demanda no dia ${day.dayNumber}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content: Reuniões e Tarefas preview inside the cell */}
      <div className="flex-1 my-1 space-y-1 overflow-hidden">
        {/* 1. Reuniões com destaque roxo e horário ou cor personalizada */}
        {meetings.slice(0, 2).map((meeting) => (
          <div
            key={meeting.id}
            className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate flex items-center gap-1 border bg-purple-50 text-purple-900 border-purple-200 font-semibold"
            style={meeting.color ? { borderLeftColor: meeting.color, borderLeftWidth: '3.5px' } : undefined}
            title={`Reunião: ${meeting.title}${meeting.time ? ` às ${meeting.time}` : ''}${meeting.company ? ` (${meeting.company})` : ''}`}
          >
            {meeting.color ? (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meeting.color }} />
            ) : (
              <Clock className="w-2.5 h-2.5 text-purple-600 shrink-0" />
            )}
            <span className="truncate">
              {meeting.time ? `${meeting.time} ` : ''}{meeting.title}
            </span>
          </div>
        ))}

        {/* 2. Tarefas do Kanban */}
        {nonMeetingTasks.slice(0, Math.max(0, 2 - meetings.length)).map((task) => {
          const correspondingNote = notes.find((n) => n.taskId === task.id || n.title === task.title);
          const color = task.color || correspondingNote?.color;

          return (
            <div
              key={task.id}
              className={`
                text-[10px] leading-tight px-1.5 py-0.5 rounded truncate flex items-center gap-1 border
                ${task.status === 'done'
                  ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                  : task.status === 'delayed'
                    ? 'bg-rose-50 text-rose-800 border-rose-200 font-medium'
                    : task.status === 'in_progress'
                      ? 'bg-amber-50 text-amber-900 border-amber-200 font-medium'
                      : 'bg-blue-50 text-blue-900 border-blue-100 font-medium'}
              `}
              style={color ? { borderLeftColor: color, borderLeftWidth: '3.5px' } : undefined}
              title={`${task.company ? `[${task.company}] ` : ''}${task.title} (${
                task.status === 'todo' ? 'A Fazer' :
                task.status === 'in_progress' ? 'Fazendo' :
                task.status === 'done' ? 'Concluído' : 'Atrasado'
              })`}
            >
              <span 
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  color ? '' : (
                    task.status === 'done' ? 'bg-emerald-500' :
                    task.status === 'delayed' ? 'bg-rose-500' :
                    task.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
                  )
                }`}
                style={color ? { backgroundColor: color } : undefined}
              />
              <span className="truncate">
                {task.company ? `${task.company.split(' ')[0]}: ${task.title}` : task.title}
              </span>
            </div>
          );
        })}

        {/* 3. Anotações avulsas se couber */}
        {standaloneNotes.slice(0, Math.max(0, 2 - meetings.length - nonMeetingTasks.length)).map((note) => (
          <div
            key={note.id}
            className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate flex items-center gap-1 border bg-slate-50 text-slate-800 border-slate-200 font-medium"
            style={note.color ? { borderLeftColor: note.color, borderLeftWidth: '3.5px' } : undefined}
            title={note.title}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: note.color || '#64748b' }}
            />
            <span className="truncate">{note.title}</span>
          </div>
        ))}

        {totalCount > 2 && (
          <div className="text-[9px] text-[#0d345e] font-bold px-1">
            +{totalCount - 2} {totalCount - 2 === 1 ? 'item' : 'itens'}
          </div>
        )}
      </div>

      {/* Footer tags / badges: indicadores de reuniões e tarefas */}
      <div className="flex items-center justify-between text-[10px] pt-1 gap-1">
        {meetings.length > 0 && (
          <span 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold text-[9px] bg-purple-100 text-purple-800"
            title={`${meetings.length} reunião(ões)`}
          >
            📅 {meetings.length} reun.
          </span>
        )}

        {tasksDue.length > 0 && (
          <span 
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-semibold text-[9px]
              ${hasDelayedTasks 
                ? 'bg-rose-100 text-rose-700 font-bold' 
                : 'bg-blue-100 text-blue-700'}
            `}
            title={`${tasksDue.length} tarefa(s) vinculada(s) ao Kanban`}
          >
            ● {tasksDue.length}
          </span>
        )}
      </div>

    </div>
  );
};

export default DayCell;
