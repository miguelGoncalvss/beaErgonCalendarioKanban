import React from 'react';
import { 
  X, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  Hourglass,
  Layers,
  Sparkles
} from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { 
  formatDuration, 
  formatDurationLong, 
  getLiveKanbanDurationSeconds, 
  getLiveTodoDurationSeconds, 
  getLiveInProgressDurationSeconds, 
  getLiveDelayedDurationSeconds,
  getTaskSlaInfo,
  STATUS_LABELS
} from '../../utils/timeMetrics';

interface TaskAuditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  todo: <Hourglass className="w-3.5 h-3.5 text-blue-600" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  delayed: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
};

const STATUS_PILL_CLASS: Record<TaskStatus, string> = {
  todo: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delayed: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const TaskAuditModal: React.FC<TaskAuditModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !task) return null;

  const slaInfo = getTaskSlaInfo(task);
  const totalKanbanSeconds = getLiveKanbanDurationSeconds(task);
  const todoSeconds = getLiveTodoDurationSeconds(task);
  const inProgressSeconds = getLiveInProgressDurationSeconds(task);
  const delayedSeconds = getLiveDelayedDurationSeconds(task);

  const history = task.stageHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-['Inter',sans-serif]">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com identidade visual azul marinho e dourado */}
        <div className="px-5 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white m-0">
                  Auditoria de Tempo e SLA
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-[#0d345e]">
                  Administração
                </span>
              </div>
              <p className="text-[11px] text-blue-200 m-0 mt-0.5">
                Controle do tempo de cada ação e monitoramento do cumprimento de prazos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Card Resumo da Tarefa */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${STATUS_PILL_CLASS[task.status]}`}>
                  {STATUS_ICONS[task.status]}
                  <span>Status atual: {STATUS_LABELS[task.status]}</span>
                </span>

                {task.company && (
                  <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#0d345e]" />
                    <span>{task.company}</span>
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-500">
                Criada em: <strong>{new Date(task.createdAt).toLocaleString('pt-BR')}</strong>
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug m-0">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-slate-600 mt-1 m-0 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Destaque: Até quando deve ser feito? (SLA e Prazo Limite) */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${slaInfo.badgeClass}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Até quando deve ser feito? (Prazo Estabelecido)</span>
              </div>
              <div className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>{slaInfo.deadlineFormatted}</span>
              </div>
              <p className="text-xs opacity-90 m-0">
                {task.status === 'done' 
                  ? (slaInfo.isBreached 
                      ? `A tarefa ultrapassou o prazo fatal estipulado em ${slaInfo.formattedDiff}.` 
                      : `A tarefa foi concluída com sucesso dentro do prazo (${slaInfo.formattedDiff}).`)
                  : (slaInfo.isBreached 
                      ? `⚠️ Prazo fatal ultrapassado! ${slaInfo.formattedDiff}. Requer intervenção da equipe.` 
                      : `⏱️ Dentro do prazo: ${slaInfo.formattedDiff}.`)}
              </p>
            </div>

            <div className="shrink-0 self-stretch sm:self-center flex sm:flex-col items-center justify-between sm:justify-center p-2 rounded-lg bg-white/70 border border-current/20 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold tracking-wider">Situação SLA</span>
              <span className="text-xs font-black">{slaInfo.statusLabel}</span>
            </div>
          </div>

          {/* Grid das Métricas de Tempo por Etapa */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0d345e]" />
              <span>Tempo de Execução por Etapa</span>
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Etapa 1: A Fazer */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wide">1. Em "A Fazer"</span>
                    <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-lg font-black text-blue-950 font-mono">
                    {formatDuration(todoSeconds)}
                  </div>
                </div>
                <p className="text-[10px] text-blue-700/80 m-0 mt-1 leading-tight">
                  Tempo aguardando ser iniciada
                </p>
              </div>

              {/* Etapa 2: Fazendo (Execução) */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wide">2. Em "Fazendo"</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-lg font-black text-amber-950 font-mono">
                    {formatDuration(inProgressSeconds)}
                  </div>
                </div>
                <p className="text-[10px] text-amber-800/80 m-0 mt-1 leading-tight">
                  Tempo de execução/trabalho ativo
                </p>
              </div>

              {/* Etapa 3: Atraso Acumulado */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                delayedSeconds > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between text-slate-700 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wide">3. Em Atraso</span>
                    <AlertTriangle className={`w-3.5 h-3.5 ${delayedSeconds > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                  </div>
                  <div className={`text-lg font-black font-mono ${delayedSeconds > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatDuration(delayedSeconds)}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 m-0 mt-1 leading-tight">
                  {delayedSeconds > 0 ? 'Tempo em coluna Atrasado' : 'Sem atraso registrado'}
                </p>
              </div>

              {/* Etapa 4: Lead Time Total */}
              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-700 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wide">Soma Total</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#0d345e]" />
                  </div>
                  <div className="text-lg font-black text-[#0d345e] font-mono">
                    {formatDuration(totalKanbanSeconds)}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 m-0 mt-1 leading-tight">
                  Somatório de todas as etapas
                </p>
              </div>
            </div>
          </div>

          {/* Linha do Tempo de Transições (Audit Trail Detalhado) */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0d345e]" />
                Histórico de Transições e Movimentações
              </span>
              <span className="text-[10.5px] font-medium text-slate-500 normal-case">
                {history.length} {history.length === 1 ? 'evento registrado' : 'eventos registrados'}
              </span>
            </h5>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 italic m-0">
                Nenhuma transição adicional registrada. A tarefa permanece no estado inicial.
              </p>
            ) : (
              <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {history.map((step, idx) => {
                  const isCurrent = idx === history.length - 1;
                  const enteredDate = new Date(step.enteredAt);
                  const durationText = step.durationSeconds 
                    ? formatDurationLong(step.durationSeconds) 
                    : (isCurrent ? 'Em andamento nesta etapa' : '');

                  return (
                    <div key={idx} className="relative">
                      {/* Bolinha do ponto da timeline */}
                      <span className={`
                        absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs
                        ${isCurrent ? 'bg-[#0d345e] ring-2 ring-blue-300' : 'bg-slate-400'}
                      `} />

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            {step.fromStatus ? (
                              <>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {STATUS_LABELS[step.fromStatus]}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-[11px] font-black text-slate-900">
                                  {STATUS_LABELS[step.toStatus]}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] font-black text-slate-900">
                                Criada em {STATUS_LABELS[step.toStatus]}
                              </span>
                            )}

                            {isCurrent && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                Estágio Atual
                              </span>
                            )}
                          </div>

                          <span className="text-[10.5px] font-mono text-slate-500">
                            {enteredDate.toLocaleDateString('pt-BR')} às {enteredDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {durationText && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-100 mt-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Tempo de permanência: <strong>{durationText}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0d345e] hover:bg-blue-900 rounded-lg shadow-xs transition cursor-pointer"
          >
            Fechar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
