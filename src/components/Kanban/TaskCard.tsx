import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  ArrowRight, 
  GripVertical,
  Repeat,
  Building2,
  ShieldCheck,
  Hourglass,
  ExternalLink,
  CheckSquare,
  Square,
  PauseCircle,
  PlayCircle,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  formatDuration, 
  getLiveKanbanDurationSeconds, 
  getLiveDelayedDurationSeconds,
  getLiveTodoDurationSeconds,
  getLiveInProgressDurationSeconds,
  getTaskSlaInfo
} from '../../utils/timeMetrics';
import { TaskAuditModal } from './TaskAuditModal';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveStatus: (id: string, newStatus: TaskStatus) => void;
  onUpdateTask?: (task: Task) => void;
  onSelectDueDate?: (dateKey: string) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  low: { label: 'Baixa', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  medium: { label: 'Média', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high: { label: 'Alta', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  urgent: { label: 'Urgente', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const STATUS_NAMES: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Fazendo',
  done: 'Concluído',
  delayed: 'Atrasado',
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onMoveStatus,
  onUpdateTask,
  onSelectDueDate,
}) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const slaInfo = getTaskSlaInfo(task);
  const isOverdue = slaInfo.isBreached && task.status !== 'done' && !task.isPaused;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const currentAssignee = task.assignee || 'Bea';
  const otherAssignee = currentAssignee === 'Vini' ? 'Bea' : 'Vini';

  const checklist = task.checklist || [];
  const completedSteps = checklist.filter((s) => s.completed).length;
  const currentPendingStep = checklist.find((s) => !s.completed);
  const isAllChecklistDone = checklist.length > 0 && completedSteps === checklist.length;
  const progressPercent = checklist.length > 0 
    ? Math.round((completedSteps / checklist.length) * 100) 
    : 0;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Passagem de bastão instantânea (1-clique)
  const handleHandoff = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    onUpdateTask({
      ...task,
      assignee: otherAssignee,
      updatedAt: new Date().toISOString(),
    });
  };

  // Alternar conclusão da etapa ativa diretamente no card
  const handleToggleStep = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    const updatedChecklist = checklist.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    onUpdateTask({
      ...task,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });
  };

  // Pausar ou Retomar tempo diretamente pelo card
  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateTask) return;

    if (task.isPaused) {
      const pauseDuration = task.pausedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(task.pausedAt).getTime()) / 1000))
        : 0;
      onUpdateTask({
        ...task,
        isPaused: false,
        pausedReason: undefined,
        pausedAt: undefined,
        totalPausedSeconds: (task.totalPausedSeconds || 0) + pauseDuration,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const reason = window.prompt(
        'Motivo da pausa (ex: Aguardando extratos do cliente, documentos, retorno no WhatsApp):',
        'Aguardando envio de extrato/documentos pelo cliente'
      );
      if (reason === null) return;
      onUpdateTask({
        ...task,
        isPaused: true,
        pausedReason: reason.trim() || 'Aguardando retorno do cliente',
        pausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        borderLeftColor: task.color || undefined,
        borderLeftWidth: task.color ? '4px' : undefined,
      }}
      className={`
        relative bg-white rounded-xl border p-2.5 shadow-2xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing group select-none font-['Inter',sans-serif] min-w-0 overflow-hidden
        ${isDragging ? 'opacity-35 scale-95 border-blue-400' : 'border-slate-200/90 hover:border-slate-300'}
        ${isOverdue ? 'ring-1 ring-rose-300 bg-rose-50/20' : ''}
        ${task.isPaused ? 'ring-1 ring-amber-300 bg-amber-50/30' : ''}
      `}
    >
      {/* Faixa de cor superior */}
      {task.color && (
        <div 
          className="h-1.5 w-full rounded-t-lg -mt-2.5 -mx-2.5 mb-2 shrink-0" 
          style={{ backgroundColor: task.color, width: 'calc(100% + 20px)' }}
        />
      )}

      {/* Top row: Priority badge & Quick Menu */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${priority.bg} ${priority.text} ${priority.border}`}>
            {priority.label}
          </span>

          {task.recurringGroupId?.startsWith('recur-week-') || task.recurrence === 'weekly' ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1"
              title="Tarefa recorrente semanal (12 semanas)"
            >
              <Repeat className="w-2.5 h-2.5 text-purple-600" />
              Semanal
            </span>
          ) : (task.isMonthlyRecurring || task.recurrence === 'monthly' || task.recurringGroupId) ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
              title="Tarefa recorrente mensal (12 meses)"
            >
              <Repeat className="w-2.5 h-2.5 text-amber-600" />
              Mensal
            </span>
          ) : null}
        </div>

        <div className="relative flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Opções"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }} 
              />
              <div 
                className="absolute right-0 top-6 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-slate-700 divide-y divide-slate-100 animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(task);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Editar / Etapas</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      setShowMenu(false);
                      handleTogglePause(e);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-800 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    {task.isPaused ? (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Retomar Tempo</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pausar Tempo (Cliente)</span>
                      </>
                    )}
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsAuditModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Auditoria e SLA (Admin)</span>
                    </button>
                  )}
                </div>

                <div className="p-1">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Mover para
                  </div>
                  {(['todo', 'in_progress', 'done', 'delayed'] as TaskStatus[])
                    .filter((s) => s !== task.status)
                    .map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onMoveStatus(task.id, status);
                        }}
                        className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{STATUS_NAMES[status]}</span>
                      </button>
                    ))}
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(task.id);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PASSAGEM DE BASTÃO: Responsável Atual + Botão de 1-Clique */}
      <div className="flex items-center justify-between gap-1.5 bg-slate-50/90 border border-slate-200/90 rounded-lg p-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
            currentAssignee === 'Vini' ? 'bg-indigo-600' : 'bg-[#0d345e]'
          }`}>
            {currentAssignee.charAt(0)}
          </div>
          <span className="text-[11px] font-bold text-slate-800 truncate">
            {currentAssignee}
          </span>
        </div>

        {onUpdateTask && (
          <button
            type="button"
            onClick={handleHandoff}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-[#0d345e] border border-slate-200 shadow-2xs hover:border-blue-300 transition cursor-pointer shrink-0"
            title={`Passar o bastão agora para ${otherAssignee}`}
          >
            <ArrowRightLeft className="w-2.5 h-2.5 text-blue-600" />
            <span>Passar p/ {otherAssignee}</span>
          </button>
        )}
      </div>

      {/* Empresa / Cliente Badge */}
      {task.company && (
        <div 
          className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-bold text-slate-800 bg-blue-50/60 border border-blue-200/70 px-1.5 py-0.5 rounded-md mb-1.5 w-fit max-w-full truncate"
          title={`Empresa cliente: ${task.company}`}
        >
          <Building2 className="w-3 h-3 text-[#0d345e] shrink-0" />
          <span className="truncate">{task.company}</span>
        </div>
      )}

      {/* Task Title */}
      <h4 
        onClick={() => onEdit(task)}
        className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug mb-1 group-hover:text-[#0d345e] transition break-words cursor-pointer"
      >
        {task.title}
      </h4>

      {/* Observações da Empresa (Simples) */}
      {task.description && (
        <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed mb-2 break-words">
          {task.description}
        </p>
      )}

      {/* CHECKLIST / ETAPAS DO PROCESSO DA EMPRESA */}
      {checklist.length > 0 ? (
        <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-[#0d345e]" />
              <span>Etapas ({completedSteps}/{checklist.length})</span>
            </span>
            <span className="font-bold text-slate-600 font-mono">
              {progressPercent}%
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isAllChecklistDone ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Destaque da Etapa Atual */}
          {currentPendingStep ? (
            <div 
              onClick={(e) => handleToggleStep(e, currentPendingStep.id)}
              className="flex items-center gap-1.5 pt-1 text-[10.5px] font-semibold text-slate-800 hover:text-blue-900 cursor-pointer group/step"
              title="Clique para marcar esta etapa como concluída"
            >
              <Square className="w-3.5 h-3.5 text-blue-600 group-hover/step:text-emerald-600 shrink-0" />
              <span className="truncate">
                <strong>Etapa atual:</strong> {currentPendingStep.text}
              </span>
            </div>
          ) : isAllChecklistDone ? (
            <div className="flex items-center gap-1 pt-1 text-[10.5px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Todas as etapas concluídas!</span>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="text-[10px] font-semibold text-slate-400 hover:text-[#0d345e] hover:underline flex items-center gap-1 mb-2 cursor-pointer"
        >
          <span>+ Adicionar etapas do processo</span>
        </button>
      )}

      {/* BANNER DE PAUSA DE TEMPO (Aguardando Retorno do Cliente) */}
      {task.isPaused && (
        <div className="my-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-1.5 text-[10.5px] text-amber-900 animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold uppercase text-[9px] block text-amber-800">
                Pausado (SLA Congelado)
              </span>
              <span className="truncate block font-medium" title={task.pausedReason}>
                {task.pausedReason || 'Aguardando cliente'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePause}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9.5px] shadow-2xs transition cursor-pointer shrink-0"
            title="Clique para retomar a contagem de tempo e execução"
          >
            <PlayCircle className="w-3 h-3" />
            <span>Retomar</span>
          </button>
        </div>
      )}

      {/* Admin Restricted Timing Metadata */}
      {user?.role === 'admin' && (
        <div 
          className="my-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-[10px] text-slate-600 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              <span>SLA & Tempos</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="text-[9.5px] font-bold text-[#0d345e] hover:text-blue-950 hover:underline flex items-center gap-0.5 cursor-pointer"
              title="Abrir auditoria detalhada de tempos e prazos da administração"
            >
              <span>Auditoria</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9.5px]">
            <span className="flex items-center gap-1 text-blue-900" title="Tempo em A Fazer">
              <Hourglass className="w-2.5 h-2.5 text-blue-600 shrink-0" />
              <span className="font-bold">{formatDuration(getLiveTodoDurationSeconds(task))}</span>
              <span className="text-[8.5px] text-slate-400 font-sans">a fazer</span>
            </span>

            <span className="flex items-center gap-1 text-amber-900" title="Tempo em Fazendo">
              <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
              <span className="font-bold">{formatDuration(getLiveInProgressDurationSeconds(task))}</span>
              <span className="text-[8.5px] text-slate-400 font-sans">fazendo</span>
            </span>

            {getLiveDelayedDurationSeconds(task) > 0 && (
              <span className="col-span-2 flex items-center gap-1 text-rose-700 font-bold" title="Tempo total acumulado em atraso">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span>{formatDuration(getLiveDelayedDurationSeconds(task))} em atraso</span>
              </span>
            )}

            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-600 font-sans">
              <span className="text-[9px] font-semibold text-slate-500">Soma Total:</span>
              <span className="font-mono font-bold text-[#0d345e] text-[10px]">
                {formatDuration(getLiveKanbanDurationSeconds(task))}
                {task.status === 'done' && <span className="ml-1 text-[8.5px] text-emerald-600 font-bold">✓ concluído</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Prazo fatal (SLA), Pausa rápida & Drag handle */}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.dueDate ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDueDate?.(task.dueDate!);
              }}
              className={`
                flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md transition cursor-pointer
                ${isOverdue 
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 font-bold' 
                  : task.isPaused
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                    : slaInfo.status === 'warning'
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 font-semibold'
                      : 'text-slate-600 hover:text-[#0d345e] hover:bg-slate-100'}
              `}
              title={`Até quando deve ser feito: ${slaInfo.deadlineFormatted} (${slaInfo.formattedDiff})`}
            >
              {isOverdue ? (
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
              ) : task.isPaused ? (
                <PauseCircle className="w-3 h-3 text-amber-600 shrink-0" />
              ) : (
                <Calendar className="w-3 h-3 shrink-0" />
              )}
              <span>
                {task.dueDate.split('-').reverse().slice(0, 2).join('/')}
                {task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
              {isOverdue && <span className="text-[9px] font-black text-rose-700">Atrasou!</span>}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Sem prazo fatal
            </span>
          )}

          {/* Botão de pausa rápida se não estiver pausado */}
          {!task.isPaused && task.status !== 'done' && (
            <button
              type="button"
              onClick={handleTogglePause}
              className="text-[10px] font-semibold text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5"
              title="Pausar tempo (caso a empresa demore a responder ou enviar documentos)"
            >
              <PauseCircle className="w-3 h-3" />
              <span>Pausar</span>
            </button>
          )}
        </div>

        <div className="flex items-center text-slate-300 group-hover:text-slate-400 transition" title="Arraste para mover de coluna">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Modal de Auditoria de Tempo e SLA da Administração */}
      <TaskAuditModal
        task={task}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
};
