import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus,
  StickyNote
} from 'lucide-react';
import { 
  MONTH_NAMES_PT, 
  WEEKDAYS_SHORT_PT, 
  getDaysForMonth, 
  formatDateKey 
} from '../../utils/dateUtils';
import { DayCell } from './DayCell';
import { DayNotesModal } from './DayNotesModal';
import type { DayNote, Task } from '../../types';

interface CalendarViewProps {
  currentYear: number;
  currentMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  notes: DayNote[];
  tasks: Task[];
  companies?: string[];
  onAddNewCompany?: (company: string) => void;
  onAddNote: (note: Omit<DayNote, 'id' | 'createdAt'>) => void;
  onUpdateNote?: (note: DayNote) => void;
  onToggleNoteComplete: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onSelectTask?: (task: Task) => void;
  selectedDateKey?: string;
  onSelectDateKey?: (dateKey: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentYear,
  currentMonth,
  onYearChange,
  onMonthChange,
  notes,
  tasks,
  companies = [],
  onAddNewCompany,
  onAddNote,
  onUpdateNote,
  onToggleNoteComplete,
  onDeleteNote,
  onSelectTask,
  selectedDateKey: controlledDateKey,
  onSelectDateKey,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    controlledDateKey || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialAddForm, setModalInitialAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const calendarRef = useRef<HTMLDivElement>(null);

  // Year options for quick select (e.g. 2023 - 2030)
  const years = Array.from({ length: 11 }, (_, i) => 2023 + i);

  // Sync if controlledDateKey changes
  useEffect(() => {
    if (controlledDateKey) {
      setSelectedDate(controlledDateKey);
    }
  }, [controlledDateKey]);

  // Deselect day when user clicks outside the calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isModalOpen) return;
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setSelectedDate(null);
        onSelectDateKey?.('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen, onSelectDateKey]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onMonthChange(11);
      onYearChange(currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onMonthChange(0);
      onYearChange(currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    onYearChange(now.getFullYear());
    onMonthChange(now.getMonth());
    const key = formatDateKey(now);
    setSelectedDate(key);
    onSelectDateKey?.(key);
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    onSelectDateKey?.(dateKey);
    setModalInitialAddForm(false);
    setIsModalOpen(true);
  };

  const handleQuickAdd = (e: React.MouseEvent, dateKey: string) => {
    e.stopPropagation();
    setSelectedDate(dateKey);
    onSelectDateKey?.(dateKey);
    setModalInitialAddForm(true);
    setIsModalOpen(true);
  };

  const days = getDaysForMonth(currentYear, currentMonth);

  // Group notes by dateKey
  const notesByDate: Record<string, DayNote[]> = {};
  notes.forEach((note) => {
    if (!notesByDate[note.date]) notesByDate[note.date] = [];
    notesByDate[note.date].push(note);
  });

  // Group tasks due by dateKey
  const tasksByDate: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.dueDate) {
      if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
      tasksByDate[task.dueDate].push(task);
    }
  });

  // Filtered notes if search query is active
  const filteredNotes = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div ref={calendarRef} className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Calendar Top Bar */}
      <div className="h-16 px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 relative">
        {/* Month & Year Title & Quick Jumper */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 shadow-2xs p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-200/70 rounded text-slate-600 transition cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <select
                value={currentMonth}
                onChange={(e) => onMonthChange(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 text-sm focus:outline-hidden cursor-pointer hover:text-[#0d345e] transition"
              >
                {MONTH_NAMES_PT.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 text-sm focus:outline-hidden cursor-pointer hover:text-[#0d345e] transition"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-200/70 rounded text-slate-600 transition cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-400/80 bg-slate-50 hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-[#0d345e] transition shadow-2xs cursor-pointer"
          >
            Hoje
          </button>
        </div>

        {/* Quick Add Note Button & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0d345e] focus:border-[#0d345e] w-32 sm:w-40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => {
              const nowKey = formatDateKey(new Date());
              setSelectedDate(nowKey);
              setModalInitialAddForm(true);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0d345e] hover:bg-blue-900 active:bg-blue-950 text-amber-300 border border-amber-400/50 text-xs font-extrabold shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Anotar</span>
          </button>
        </div>

        {/* Search Results Drawer if searching */}
        {searchQuery.trim() && (
          <div className="absolute right-4 top-16 z-30 w-72 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl space-y-1.5 max-h-48 overflow-y-auto animate-scaleUp">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-[#0d345e]" />
              <span>Resultados para "{searchQuery}" ({filteredNotes.length})</span>
            </div>
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma anotação encontrada.</p>
            ) : (
              filteredNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setSelectedDate(n.date);
                    const [y, m] = n.date.split('-').map(Number);
                    onYearChange(y);
                    onMonthChange(m - 1);
                    setModalInitialAddForm(false);
                    setIsModalOpen(true);
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/70 flex items-center justify-between text-xs cursor-pointer border border-slate-100"
                >
                  <span className="font-medium text-slate-700 truncate">{n.title}</span>
                  <span className="text-[10px] text-[#0d345e] font-bold font-mono">{n.date}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 bg-slate-100/90 border-b border-slate-200 text-center py-2 text-xs font-semibold text-slate-600">
        {WEEKDAYS_SHORT_PT.map((day, idx) => (
          <div 
            key={day} 
            className={idx === 0 || idx === 6 ? 'text-[#0d345e] font-bold' : 'text-slate-600'}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-y-auto bg-slate-50">
        {days.map((day) => {
          const dayNotes = notesByDate[day.dateKey] || [];
          const dayTasks = tasksByDate[day.dateKey] || [];
          return (
            <DayCell
              key={day.dateKey}
              day={day}
              isSelected={selectedDate === day.dateKey}
              notes={dayNotes}
              tasksDue={dayTasks}
              onClick={() => handleDayClick(day.dateKey)}
              onQuickAddNote={(e) => handleQuickAdd(e, day.dateKey)}
            />
          );
        })}
      </div>

      {/* Calendar Footer: Legend & Helper Info */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0d345e] border border-amber-400/70 inline-block" /> Hoje
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Tarefa vinculada
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Vencida
          </span>
        </div>
        <span className="italic text-slate-400 hidden sm:inline">
          Dica: clique no dia para ver a agenda ou no "+" para adicionar tarefas
        </span>
      </div>

      {/* Day Notes Modal */}
      <DayNotesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDate(null);
          onSelectDateKey?.('');
          setModalInitialAddForm(false);
        }}
        dateKey={selectedDate || formatDateKey(new Date())}
        notes={selectedDate ? notesByDate[selectedDate] || [] : []}
        tasksDue={selectedDate ? tasksByDate[selectedDate] || [] : []}
        companies={companies}
        initialShowAddForm={modalInitialAddForm}
        onAddNewCompany={onAddNewCompany}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onToggleNoteComplete={onToggleNoteComplete}
        onDeleteNote={onDeleteNote}
        onSelectTask={(t) => {
          setIsModalOpen(false);
          setSelectedDate(null);
          onSelectDateKey?.('');
          setModalInitialAddForm(false);
          onSelectTask?.(t);
        }}
      />
    </div>
  );
};
