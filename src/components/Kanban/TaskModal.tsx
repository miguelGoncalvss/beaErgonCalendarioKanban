import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, Building2, Plus, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../types';
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
  const [tagsInput, setTagsInput] = useState('');
  const [company, setCompany] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
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
      setTagsInput(editingTask.tags ? editingTask.tags.join(', ') : '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setDueDate(defaultDueDate || '');
      setDueTime('');
      setCompany('');
      setColor(undefined);
      setTagsInput('');
    }
    setIsCreatingCompany(false);
    setCustomCompanyName('');
  }, [editingTask, defaultStatus, defaultDueDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        company: company.trim() || undefined,
        tags,
        color: color || undefined,
      },
      editingTask ? editingTask.id : undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scaleUp font-['Inter',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="text-base font-black text-white m-0">
              {editingTask ? 'Editar Tarefa' : 'Nova Tarefa no Kanban'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Título da Tarefa *
            </label>
            <input
              type="text"
              placeholder="Ex: Desenvolver tela de relatórios..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descrição / Detalhes
            </label>
            <textarea
              placeholder="Adicione notas, links ou critérios de aceitação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] leading-relaxed resize-none"
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
                  placeholder="Digite a Razão Social ou Nome Fantasia..."
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

            <p className="text-[10.5px] text-slate-500 m-0 leading-tight">
              Se a tarefa não for finalizada até este dia e horário, o sistema registrará atraso e computará as métricas para a administração.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#0d345e]" />
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: Folha, DP, DCTFWeb, ICMS"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
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

          {/* Modal Footer */}
          <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold text-[#0d345e] bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-lg shadow-xs transition cursor-pointer"
            >
              {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
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
