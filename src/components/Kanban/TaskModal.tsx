import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Building2, 
  Plus, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  User, 
  CheckSquare, 
  Square, 
  Trash2, 
  PauseCircle, 
  PlayCircle, 
  AlertCircle,
  Sparkles,
  Repeat
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, ChecklistItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  formatDurationLong, 
  getLiveKanbanDurationSeconds, 
  getLiveDelayedDurationSeconds,
  getLiveTodoDurationSeconds,
  getLiveInProgressDurationSeconds
} from '../../utils/timeMetrics';
import { TaskAuditModal } from './TaskAuditModal';
import { ColorPicker } from '../Common/ColorPicker';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt'>, taskId?: string) => void;
  editingTask?: Task | null;
  defaultStatus?: TaskStatus;
  defaultDueDate?: string;
  companies?: string[];
  onAddNewCompany?: (company: string) => void;
  onOpenCompanyManager?: () => void;
}

const ACCOUNTING_STEP_TEMPLATES = [
  'Extrato Bancário',
  'Conciliação Bancária',
  'Fechamento Folha',
  'DCTFWeb',
  'Apuração Fiscal',
  'Emissão de Guias',
];

const QUICK_PAUSE_REASONS = [
  'Aguardando extratos do cliente',
  'Aguardando envio de documentos / notas',
  'Aguardando retorno via WhatsApp/E-mail',
  'Instabilidade nos portais da Receita/Prefeitura',
  'Aguardando validação interna',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultStatus = 'todo',
  defaultDueDate = '',
  companies = [],
  onAddNewCompany,
  onOpenCompanyManager,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [company, setCompany] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [assignee, setAssignee] = useState<string>('Bea');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [pausedReason, setPausedReason] = useState('');
  const [isMonthlyRecurring, setIsMonthlyRecurring] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate || '');
      setDueTime(editingTask.dueTime || '');
      setCompany(editingTask.company || '');
      setColor(editingTask.color);
      setAssignee(editingTask.assignee || 'Bea');
      setChecklist(editingTask.checklist ? [...editingTask.checklist] : []);
      setIsPaused(Boolean(editingTask.isPaused));
      setPausedReason(editingTask.pausedReason || '');
      setIsMonthlyRecurring(Boolean(editingTask.isMonthlyRecurring || editingTask.recurrence === 'monthly' || editingTask.recurringGroupId));
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setDueDate(defaultDueDate || '');
      setDueTime('');
      setCompany('');
      setColor(undefined);
      setAssignee('Bea');
      setChecklist([]);
      setIsPaused(false);
      setPausedReason('');
      setIsMonthlyRecurring(false);
    }
    setNewStepText('');
    setIsCreatingCompany(false);
    setCustomCompanyName('');
  }, [editingTask, defaultStatus, defaultDueDate, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = (text: string) => {
    if (!text.trim()) return;
    const newItem: ChecklistItem = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: text.trim(),
      completed: false,
    };
    setChecklist((prev) => [...prev, newItem]);
    setNewStepText('');
  };

  const handleToggleStep = (id: string) => {
    setChecklist((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const handleDeleteStep = (id: string) => {
    setChecklist((prev) => prev.filter((step) => step.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let updatedTotalPaused = editingTask?.totalPausedSeconds || 0;
    let updatedPausedAt = editingTask?.pausedAt;

    if (isPaused && !editingTask?.isPaused) {
      // Entrando em pausa agora
      updatedPausedAt = new Date().toISOString();
    } else if (!isPaused && editingTask?.isPaused && editingTask?.pausedAt) {
      // Retomando tarefa da pausa
      const pauseDuration = Math.max(
        0,
        Math.floor((Date.now() - new Date(editingTask.pausedAt).getTime()) / 1000)
      );
      updatedTotalPaused += pauseDuration;
      updatedPausedAt = undefined;
    }

    onSave(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        company: company.trim() || undefined,
        color: color || undefined,
        assignee,
        checklist,
        isPaused,
        pausedReason: isPaused
          ? pausedReason.trim() || 'Aguardando retorno do cliente'
          : undefined,
        pausedAt: isPaused ? updatedPausedAt : undefined,
        totalPausedSeconds: updatedTotalPaused,
        isMonthlyRecurring,
        recurrence: isMonthlyRecurring ? 'monthly' : 'none',
      },
      editingTask ? editingTask.id : undefined
    );

    onClose();
  };

  const completedStepsCount = checklist.filter((s) => s.completed).length;
  const progressPercent = checklist.length > 0 
    ? Math.round((completedStepsCount / checklist.length) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp font-['Inter',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="text-base font-black text-white m-0">
              {editingTask ? 'Editar Processo da Empresa' : 'Novo Processo / Tarefa'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-slate-700">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Título do Processo / Tarefa *
            </label>
            <input
              type="text"
              placeholder="Ex: Fechamento Contábil Mensal, DCTFWeb, Folha..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
              required
              autoFocus
            />
          </div>

          {/* Empresa / Cliente Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
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
            </label>

            {!isCreatingCompany ? (
              <select
                value={company}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCreatingCompany(true);
                  } else {
                    setCompany(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium cursor-pointer"
              >
                <option value="">-- Nenhuma empresa vinculada (Geral) --</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__new__">+ Cadastrar nova empresa...</option>
              </select>
            ) : (
              <div className="flex items-center gap-2 p-1.5 bg-blue-50/60 rounded-lg border border-blue-200">
                <input
                  type="text"
                  placeholder="Razão Social ou Nome Fantasia..."
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customCompanyName.trim()) {
                        onAddNewCompany?.(customCompanyName.trim());
                        setCompany(customCompanyName.trim());
                        setCustomCompanyName('');
                        setIsCreatingCompany(false);
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium placeholder:text-slate-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customCompanyName.trim()) {
                      onAddNewCompany?.(customCompanyName.trim());
                      setCompany(customCompanyName.trim());
                      setCustomCompanyName('');
                      setIsCreatingCompany(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 rounded-md text-xs font-bold transition cursor-pointer"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCompany(false);
                    setCustomCompanyName('');
                  }}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* PASSAGEM DE BASTÃO: Responsável Atual (Bea vs Vini) */}
          <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#0d345e] uppercase tracking-wider flex items-center gap-1.5 m-0">
                <User className="w-3.5 h-3.5 text-[#0d345e]" />
                <span>Responsável Atual (Com quem está agora?)</span>
              </label>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                Passagem de Bastão
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignee('Bea')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  assignee === 'Bea'
                    ? 'bg-[#0d345e] text-white border-[#08223f] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${assignee === 'Bea' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <span>Bea</span>
                {assignee === 'Bea' && <span className="text-[10px] opacity-80">(ativo)</span>}
              </button>

              <button
                type="button"
                onClick={() => setAssignee('Vini')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  assignee === 'Vini'
                    ? 'bg-indigo-900 text-white border-indigo-950 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${assignee === 'Vini' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <span>Vini</span>
                {assignee === 'Vini' && <span className="text-[10px] opacity-80">(ativo)</span>}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 m-0">
              Facilita a passagem de bastão: "Te passei a tarefa, agora é com você".
            </p>
          </div>

          {/* CHECKLIST / ETAPAS DO PROCESSO DA EMPRESA */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 m-0">
                <CheckSquare className="w-3.5 h-3.5 text-[#0d345e]" />
                <span>Etapas do Processo / To-Do da Empresa</span>
              </label>
              {checklist.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  {completedStepsCount}/{checklist.length} ({progressPercent}%)
                </span>
              )}
            </div>

            {/* Barra de Progresso */}
            {checklist.length > 0 && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Input para adicionar nova etapa */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Ex: Conciliação bancária, fechamento de folha..."
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStep(newStepText);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
              />
              <button
                type="button"
                onClick={() => handleAddStep(newStepText)}
                className="px-3 py-1.5 bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
              >
                + Adicionar
              </button>
            </div>

            {/* Sugestões rápidas de etapas contábeis */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                Atalhos:
              </span>
              {ACCOUNTING_STEP_TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => handleAddStep(tpl)}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-900 text-slate-600 border border-slate-200 rounded-md transition cursor-pointer"
                >
                  + {tpl}
                </button>
              ))}
            </div>

            {/* Lista de etapas cadastradas */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1">
              {checklist.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                    step.completed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleStep(step.id)}
                    className="flex items-center gap-2 text-left flex-1 cursor-pointer min-w-0"
                  >
                    {step.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={`truncate font-medium ${step.completed ? 'line-through text-slate-400' : ''}`}>
                      <strong className="text-slate-500 mr-1.5 font-mono">{index + 1}.</strong>
                      {step.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStep(step.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer shrink-0 ml-1.5"
                    title="Remover etapa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {checklist.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-2 m-0 italic">
                  Nenhuma etapa cadastrada ainda. Adicione as etapas do processo acima para acompanhar o progresso.
                </p>
              )}
            </div>
          </div>

          {/* PAUSAR TEMPO / AGUARDANDO CLIENTE */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            isPaused 
              ? 'bg-amber-50/90 border-amber-300' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 m-0">
                {isPaused ? (
                  <PauseCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <PlayCircle className="w-4 h-4 text-slate-500" />
                )}
                <span>Controle de Pausa de Tempo (SLA)</span>
              </label>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={`text-xs font-extrabold px-3 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                }`}
              >
                {isPaused ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Retomar Tarefa</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pausar Tempo</span>
                  </>
                )}
              </button>
            </div>

            {isPaused ? (
              <div className="space-y-2 mt-2 pt-2 border-t border-amber-200">
                <div className="flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Tempo Pausado:</strong> O cronômetro de execução e o SLA não contabilizarão atraso enquanto aguardam a resposta do cliente.
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-amber-950 mb-1">
                    Motivo / Justificativa da Pausa:
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: Aguardando cliente enviar extratos bancários..."
                    value={pausedReason}
                    onChange={(e) => setPausedReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[10px] font-semibold text-amber-800">Motivos comuns:</span>
                  {QUICK_PAUSE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setPausedReason(reason)}
                      className="text-[9.5px] font-semibold px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10.5px] text-slate-500 m-0">
                Use a pausa quando a empresa cliente demorar a enviar extratos, notas ou documentos. O tempo não será cobrado da sua equipe.
              </p>
            )}
          </div>

          {/* Coluna / Status & Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Coluna / Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium cursor-pointer"
              >
                <option value="todo">A Fazer</option>
                <option value="in_progress">Fazendo</option>
                <option value="done">Concluído</option>
                <option value="delayed">Atrasado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium cursor-pointer"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          {/* Faixa de Cor / Identificador Visual */}
          <ColorPicker
            selectedColor={color}
            onChange={setColor}
            label="Faixa de Cor (Kanban e Calendário)"
          />

          {/* Prazo fatal: Até quando deve ser feito? */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Calendar className="w-3.5 h-3.5 text-[#0d345e]" />
                <span>Até quando deve ser feito? (Prazo Fatal / SLA)</span>
              </label>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                Meta de SLA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Data Limite
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Horário Limite (Opcional)
                </span>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Repetir todo mês (Recorrência Mensal Automática) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMonthlyRecurring}
                onChange={(e) => setIsMonthlyRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-[#0d345e] focus:ring-[#0d345e] cursor-pointer"
              />
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-amber-600" />
                Repetir todo mês automaticamente (12 meses)
              </span>
            </label>
            <p className="text-[10.5px] text-amber-800 m-0 pl-6 leading-tight">
              Gera automaticamente a mesma demanda e etapas para os próximos 12 meses. Ideal para rotinas contábeis recorrentes de cada empresa (fechamento, DCTFWeb, folha).
            </p>
          </div>

          {/* Observações da Empresa (Simples) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações da Empresa (Simples)
            </label>
            <textarea
              placeholder="Adicione anotações rápidas ou observações sobre o cliente..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] leading-relaxed resize-none font-medium"
            />
          </div>

          {/* Informações Administrativas de Tempo (Somente Admin) */}
          {user?.role === 'admin' && editingTask && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-slate-800 font-bold border-b border-slate-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Auditoria e Métricas de Tempo (Administração)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="text-[10px] font-bold text-[#0d345e] hover:text-blue-950 flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-50 cursor-pointer transition shadow-2xs"
                >
                  <span>Ver Auditoria Completa</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">1. A Fazer:</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {formatDurationLong(getLiveTodoDurationSeconds(editingTask))}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">2. Fazendo:</span>
                  <span className="font-bold text-amber-950 font-mono">
                    {formatDurationLong(getLiveInProgressDurationSeconds(editingTask))}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">3. Atraso:</span>
                  <span className={`font-bold font-mono ${getLiveDelayedDurationSeconds(editingTask) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {getLiveDelayedDurationSeconds(editingTask) > 0 
                      ? formatDurationLong(getLiveDelayedDurationSeconds(editingTask)) 
                      : 'Nenhum'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">4. Ciclo Total:</span>
                  <span className="font-bold text-[#0d345e] font-mono">
                    {formatDurationLong(getLiveKanbanDurationSeconds(editingTask))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-extrabold text-[#0d345e] bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-lg shadow-xs transition cursor-pointer"
          >
            {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
          </button>
        </div>
      </div>

      {/* Modal de Auditoria Completa */}
      {editingTask && (
        <TaskAuditModal
          task={editingTask}
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}
    </div>
  );
};
