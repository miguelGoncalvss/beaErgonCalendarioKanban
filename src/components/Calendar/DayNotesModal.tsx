import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3,
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ListTodo,
  Repeat,
  Building2,
  CalendarCheck,
  AlertCircle,
  Lightbulb,
  Bell
} from 'lucide-react';
import type { DayNote, NoteCategory, Task } from '../../types';
import { formatFriendlyDate } from '../../utils/dateUtils';
import { ColorPicker } from '../Common/ColorPicker';

interface DayNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  notes: DayNote[];
  tasksDue: Task[];
  companies?: string[];
  initialShowAddForm?: boolean;
  onAddNewCompany?: (company: string) => void;
  onOpenCompanyManager?: () => void;
  onAddNote: (note: Omit<DayNote, 'id' | 'createdAt'>) => void;
  onUpdateNote?: (note: DayNote) => void;
  onToggleNoteComplete: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onSelectTask?: (task: Task) => void;
}

const CATEGORY_CONFIG: Record<NoteCategory, { label: string; icon: React.ReactNode; badge: string; border: string }> = {
  reuniao: { 
    label: 'Reunião', 
    icon: <CalendarCheck className="w-3.5 h-3.5 text-purple-600" />,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-purple-300'
  },
  geral: { 
    label: 'Afazer / Tarefa', 
    icon: <ListTodo className="w-3.5 h-3.5 text-blue-600" />,
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-blue-300'
  },
  lembrete: { 
    label: 'Lembrete', 
    icon: <Bell className="w-3.5 h-3.5 text-sky-600" />,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    border: 'border-sky-300'
  },
  urgente: { 
    label: 'Urgente', 
    icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-300'
  },
  ideia: { 
    label: 'Ideia', 
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600" />,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-300'
  },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  todo: { label: 'A Fazer', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'Fazendo', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  done: { label: 'Concluído', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delayed: { label: 'Atrasado', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const DayNotesModal: React.FC<DayNotesModalProps> = ({
  isOpen,
  onClose,
  dateKey,
  notes,
  tasksDue,
  companies = [],
  initialShowAddForm = false,
  onAddNewCompany,
  onOpenCompanyManager,
  onAddNote,
  onUpdateNote,
  onToggleNoteComplete,
  onDeleteNote,
  onSelectTask,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('geral');
  const [newTime, setNewTime] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newColor, setNewColor] = useState<string | undefined>(undefined);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [editingNote, setEditingNote] = useState<DayNote | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setShowAddForm(initialShowAddForm);
      setEditingNote(null);
      setNewColor(undefined);
    }
  }, [isOpen, initialShowAddForm]);

  if (!isOpen) return null;

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddNote({
      date: dateKey,
      title: newTitle.trim(),
      content: newContent.trim() || undefined,
      category: newCategory,
      company: newCompany.trim() || undefined,
      color: newColor || undefined,
      time: newTime || undefined,
      isCompleted: false,
      isMonthlyRecurring: repeatMonthly,
    });

    setNewTitle('');
    setNewContent('');
    setNewTime('');
    setNewCategory('geral');
    setNewCompany('');
    setNewColor(undefined);
    setIsCreatingCompany(false);
    setCustomCompanyName('');
    setRepeatMonthly(false);
    setShowAddForm(false);
  };

  const handleStartEdit = (note: DayNote) => {
    setEditingNote({ ...note });
    setShowAddForm(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;

    onUpdateNote?.(editingNote);
    setEditingNote(null);
  };

  const dayNumber = dateKey ? dateKey.split('-')[2] : '';

  // Identifica notas avulsas que não coincidem com tasksDue
  const standaloneNotes = notes.filter(
    (n) => !tasksDue.some((t) => t.id === n.taskId || t.title === n.title)
  );

  const totalItemsCount = tasksDue.length + standaloneNotes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp font-['Inter',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#0d345e] flex items-center justify-center font-black shadow-xs border border-amber-300 select-none">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold m-0 text-white">
                  {formatFriendlyDate(dateKey)}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900/80">
                  Agenda do Dia
                </span>
              </div>
              <p className="text-xs text-blue-200/90 m-0">
                {totalItemsCount} compromisso{totalItemsCount === 1 ? '' : 's'} / tarefa{totalItemsCount === 1 ? '' : 's'} neste dia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">

          {/* Edit Form */}
          {editingNote && (
            <form onSubmit={handleSaveEdit} className="p-4 bg-amber-50/50 rounded-xl border border-amber-300 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0d345e] flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  Editar Compromisso / Demanda
                </span>
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer px-2 py-0.5 rounded hover:bg-slate-200/60"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Título ou pauta..."
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0d345e] font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <textarea
                  placeholder="Descrição ou observações..."
                  value={editingNote.content || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0d345e] resize-none"
                />
              </div>

              {/* Faixa de cor */}
              <ColorPicker
                selectedColor={editingNote.color}
                onChange={(c) => setEditingNote({ ...editingNote, color: c })}
                label="Faixa de Cor (Kanban e Calendário)"
              />

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Categoria:</span>
                  <select
                    value={editingNote.category}
                    onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value as NoteCategory })}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium cursor-pointer"
                  >
                    <option value="reuniao">Reunião</option>
                    <option value="geral">Afazer / Tarefa</option>
                    <option value="lembrete">Lembrete</option>
                    <option value="urgente">Urgente</option>
                    <option value="ideia">Ideia</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="time"
                    value={editingNote.time || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, time: e.target.value || undefined })}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={editingNote.company || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, company: e.target.value || undefined })}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium cursor-pointer"
                  >
                    <option value="">Sem empresa alocada</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Add Form */}
          {showAddForm && !editingNote && (
            <form onSubmit={handleCreateNote} className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0d345e] flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-amber-500" />
                    Novo Agendamento / Afazer para este dia
                  </span>
                  <span className="text-[10px] font-bold bg-[#08223f] text-amber-300 px-2.5 py-0.5 rounded-full border border-blue-900/80">
                    Sincronizado com o Kanban
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer px-2 py-0.5 rounded hover:bg-slate-200/60"
                >
                  ✕ Fechar
                </button>
              </div>

              {/* Seletor rápido de tipo de compromisso */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1">Tipo:</span>
                {(['reuniao', 'geral', 'lembrete', 'urgente', 'ideia'] as NoteCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const isSelected = newCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isSelected 
                          ? 'bg-[#0d345e] text-amber-300 border-amber-400 shadow-xs' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cfg.icon}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <input
                  type="text"
                  placeholder={
                    newCategory === 'reuniao'
                      ? 'Pauta da Reunião (Ex: Alinhamento Fiscal com Cliente Alfa)'
                      : newCategory === 'urgente'
                      ? 'Demanda Urgente (Ex: Prazo final transmissão DCTFWeb)'
                      : 'Título da Demanda / Afazer (Ex: Fechar folha de pagamento)...'
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium placeholder:text-slate-400"
                  autoFocus
                  required
                />
              </div>

              <div>
                <textarea
                  placeholder="Detalhes adicionais, pauta, links ou critérios (opcional)..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Faixa de cor */}
              <ColorPicker
                selectedColor={newColor}
                onChange={setNewColor}
                label="Faixa de Cor (Kanban e Calendário)"
              />

              {/* Empresa / Cliente do Setor Contábil */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0d345e]" />
                    Empresa / Cliente Contábil
                  </span>
                  {!isCreatingCompany && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCompany(true)}
                        className="text-[11px] font-semibold text-[#0d345e] hover:text-blue-900 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Nova Empresa
                      </button>
                      {onOpenCompanyManager && (
                        <button
                          type="button"
                          onClick={onOpenCompanyManager}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                          title="Gerenciar e excluir empresas"
                        >
                          Gerenciar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!isCreatingCompany ? (
                  <select
                    value={newCompany}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCreatingCompany(true);
                      } else {
                        setNewCompany(e.target.value);
                      }
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium cursor-pointer"
                  >
                    <option value="">Sem empresa alocada (Geral)</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">+ Cadastrar nova empresa...</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2 p-1.5 bg-blue-50/70 rounded-lg border border-blue-200">
                    <input
                      type="text"
                      placeholder="Razão social ou nome fantasia..."
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customCompanyName.trim()) {
                            onAddNewCompany?.(customCompanyName.trim());
                            setNewCompany(customCompanyName.trim());
                            setCustomCompanyName('');
                            setIsCreatingCompany(false);
                          }
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-blue-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium placeholder:text-slate-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCompanyName.trim()) {
                          onAddNewCompany?.(customCompanyName.trim());
                          setNewCompany(customCompanyName.trim());
                          setCustomCompanyName('');
                          setIsCreatingCompany(false);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 rounded-md text-xs font-bold transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCompany(false);
                        setCustomCompanyName('');
                      }}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md text-xs font-medium cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
                    title="Horário do compromisso / reunião"
                  />
                </div>

                {/* Repetir todos os meses Checkbox */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white px-2.5 py-1 rounded-md border border-slate-300 hover:border-[#0d345e]/60 transition">
                    <input
                      type="checkbox"
                      checked={repeatMonthly}
                      onChange={(e) => setRepeatMonthly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#0d345e] focus:ring-[#0d345e] border-slate-300 cursor-pointer"
                    />
                    <Repeat className={`w-3.5 h-3.5 ${repeatMonthly ? 'text-[#0d345e]' : 'text-slate-400'}`} />
                    <span>Repetir todo mês no dia {dayNumber}?</span>
                  </label>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0d345e] hover:bg-blue-900 active:bg-blue-950 text-amber-300 border border-amber-400/50 rounded-lg text-xs font-extrabold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salvar Demanda</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List of Tasks / Notes for this day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-[#0d345e]" />
                <span>Demandas & Reuniões do Dia ({totalItemsCount})</span>
              </h3>
              {!showAddForm && !editingNote && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0d345e] hover:text-blue-900 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                  title="Cadastrar nova demanda neste dia"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>Novo Agendamento</span>
                </button>
              )}
            </div>

            {totalItemsCount === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-bold">Nenhum compromisso ou demanda agendada para este dia.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">A agenda deste dia está livre de compromissos.</p>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 text-xs font-extrabold shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Adicionar Reunião ou Demanda</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* 1. Tarefas do Kanban vinculadas a este dia */}
                {tasksDue.map((task) => {
                  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                  const isCompleted = task.status === 'done';

                  // Encontra anotação correspondente se existir
                  const correspondingNote = notes.find((n) => n.taskId === task.id || n.title === task.title);
                  const isMeeting = correspondingNote?.category === 'reuniao';
                  const itemColor = task.color || correspondingNote?.color;

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border transition group flex items-start gap-3 relative overflow-hidden ${
                        isCompleted 
                          ? 'bg-slate-50 border-slate-200 opacity-65' 
                          : isMeeting
                          ? 'bg-purple-50/30 border-purple-200 hover:border-purple-300 shadow-2xs'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                      style={itemColor ? { borderLeftColor: itemColor, borderLeftWidth: '5px' } : undefined}
                    >
                      {itemColor && (
                        <div
                          className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
                          style={{ backgroundColor: itemColor }}
                        />
                      )}

                      <button
                        onClick={() => {
                          if (correspondingNote) {
                            onToggleNoteComplete(correspondingNote.id);
                          } else {
                            onSelectTask?.(task);
                          }
                        }}
                        className="mt-0.5 text-slate-400 hover:text-[#0d345e] transition cursor-pointer shrink-0"
                        title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => onSelectTask?.(task)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isMeeting && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                              <CalendarCheck className="w-3 h-3 text-purple-600" />
                              Reunião
                            </span>
                          )}

                          {itemColor && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white"
                              style={{ backgroundColor: itemColor }}
                              title="Faixa de cor configurada"
                            />
                          )}

                          <span className={`text-sm font-semibold cursor-pointer ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${statusInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>

                          {task.isMonthlyRecurring && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5 text-amber-600" />
                              Mensal
                            </span>
                          )}

                          {(task.company || correspondingNote?.company) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1" title="Empresa / Cliente">
                              <Building2 className="w-2.5 h-2.5 text-[#0d345e]" />
                              {task.company || correspondingNote?.company}
                            </span>
                          )}

                          {(correspondingNote?.time || task.dueTime) && (
                            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {correspondingNote?.time || task.dueTime}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className={`text-xs mt-1 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-600'} line-clamp-2`}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        {correspondingNote && onUpdateNote && (
                          <button
                            onClick={() => handleStartEdit(correspondingNote)}
                            className="p-1 text-slate-400 hover:text-[#0d345e] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Editar compromisso"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {correspondingNote && (
                          <button
                            onClick={() => onDeleteNote(correspondingNote.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Excluir demanda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Anotações avulsas do calendário que não possuem task correspondente */}
                {standaloneNotes.map((note) => {
                  const isCompleted = note.isCompleted;
                  const isMeeting = note.category === 'reuniao';
                  const catCfg = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.geral;
                  const itemColor = note.color;

                  return (
                    <div
                      key={note.id}
                      className={`p-3 rounded-xl border transition group flex items-start gap-3 relative overflow-hidden ${
                        isCompleted 
                          ? 'bg-slate-50 border-slate-200 opacity-65' 
                          : isMeeting
                          ? 'bg-purple-50/30 border-purple-200 hover:border-purple-300 shadow-2xs'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                      style={itemColor ? { borderLeftColor: itemColor, borderLeftWidth: '5px' } : undefined}
                    >
                      {itemColor && (
                        <div
                          className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
                          style={{ backgroundColor: itemColor }}
                        />
                      )}

                      <button
                        onClick={() => onToggleNoteComplete(note.id)}
                        className="mt-0.5 text-slate-400 hover:text-[#0d345e] transition cursor-pointer shrink-0"
                        title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${catCfg.badge}`}>
                            {catCfg.icon}
                            {catCfg.label}
                          </span>

                          {itemColor && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white"
                              style={{ backgroundColor: itemColor }}
                              title="Faixa de cor configurada"
                            />
                          )}

                          <span className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {note.title}
                          </span>

                          {note.company && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-[#0d345e]" />
                              {note.company}
                            </span>
                          )}

                          {note.time && (
                            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {note.time}
                            </span>
                          )}
                        </div>

                        {note.content && (
                          <p className={`text-xs mt-1 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-600'} line-clamp-2`}>
                            {note.content}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        {onUpdateNote && (
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="p-1 text-slate-400 hover:text-[#0d345e] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Editar compromisso"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Excluir demanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

export default DayNotesModal;
