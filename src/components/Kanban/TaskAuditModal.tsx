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
  Sparkles,
  Briefcase,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { 
  formatDuration, 
  formatBusinessDuration,
  getTaskStageDualMetrics,
  getChecklistItemTiming,
  calculateBusinessSeconds,
  calculateElapsedSeconds,
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

  const now = new Date();
  const slaInfo = getTaskSlaInfo(task);
  const stageMetrics = getTaskStageDualMetrics(task);
  const history = task.stageHistory || [];
  const checklist = task.checklist || [];

  const completedChecklist = checklist.filter((item) => item.completed);
  const checklistPercent = checklist.length > 0
    ? Math.round((completedChecklist.length / checklist.length) * 100)
    : 0;

  // Totais somados do checklist
  const totalChecklistBusinessSecs = completedChecklist.reduce((acc, item) => {
    const timing = getChecklistItemTiming(item, task.createdAt);
    return acc + timing.businessSeconds;
  }, 0);

  const totalChecklistElapsedSecs = completedChecklist.reduce((acc, item) => {
    const timing = getChecklistItemTiming(item, task.createdAt);
    return acc + timing.elapsedSeconds;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-['Inter',sans-serif]">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com identidade visual azul marinho e dourado */}
        <div className="px-5 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white m-0">
                  Auditoria de Tempo, SLA e To-Do
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-[#0d345e]">
                  Administração
                </span>
              </div>
              <p className="text-[11px] text-blue-200 m-0 mt-0.5">
                Métricas de Tempo Útil (Expediente) e Tempo Corrido para cada transição e item de checklist
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

                {task.assignee && (
                  <span className="text-xs font-semibold text-[#0d345e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Responsável: <strong>{task.assignee}</strong>
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

          {/* Banner Informativo das 2 Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-gradient-to-r from-blue-50/70 to-amber-50/60 p-3 rounded-xl border border-blue-200/80 text-xs">
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-[#0d345e] shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[#0d345e] block">1. Tempo Útil (Business Time)</span>
                <p className="text-[11px] text-slate-600 m-0 leading-tight">
                  Horário de expediente comercial: <strong>Segunda a Sexta, das 08h às 17h</strong> (9h úteis/dia). Desconsidera noites e finais de semana.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-amber-900 block">2. Tempo Total / Corrido (Elapsed Time)</span>
                <p className="text-[11px] text-slate-600 m-0 leading-tight">
                  Tempo real contínuo de relógio <strong>(24h/dia, 7 dias/semana)</strong> entre o momento inicial e a conclusão.
                </p>
              </div>
            </div>
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

          {/* Grid das Métricas de Tempo por Etapa (Dual: Útil vs Corrido) */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0d345e]" />
              <span>Tempo de Execução por Etapa do Quadro</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Etapa 1: A Fazer */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-blue-700 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wide">1. Em "A Fazer"</span>
                    <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  
                  {/* Tempo Útil */}
                  <div className="bg-white/80 p-1.5 rounded-lg border border-blue-200/60 mb-1.5">
                    <span className="text-[9.5px] font-bold text-[#0d345e] uppercase block flex items-center gap-1">
                      <Briefcase className="w-2.5 h-2.5" /> Tempo Útil
                    </span>
                    <div className="text-base font-black text-blue-950 font-mono">
                      {stageMetrics.todo.formattedBusiness}
                    </div>
                  </div>

                  {/* Tempo Corrido */}
                  <div className="bg-white/50 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] font-medium text-slate-500 uppercase block flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Tempo Corrido
                    </span>
                    <div className="text-xs font-bold text-slate-700 font-mono">
                      {stageMetrics.todo.formattedElapsed}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-blue-700/80 m-0 leading-tight">
                  Aguardando ser iniciada
                </p>
              </div>

              {/* Etapa 2: Fazendo (Execução) */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-amber-800 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wide">2. Em "Fazendo"</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>

                  {/* Tempo Útil */}
                  <div className="bg-white/80 p-1.5 rounded-lg border border-amber-300/60 mb-1.5">
                    <span className="text-[9.5px] font-bold text-amber-900 uppercase block flex items-center gap-1">
                      <Briefcase className="w-2.5 h-2.5 text-amber-700" /> Tempo Útil
                    </span>
                    <div className="text-base font-black text-amber-950 font-mono">
                      {stageMetrics.inProgress.formattedBusiness}
                    </div>
                  </div>

                  {/* Tempo Corrido */}
                  <div className="bg-white/50 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] font-medium text-slate-500 uppercase block flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Tempo Corrido
                    </span>
                    <div className="text-xs font-bold text-slate-700 font-mono">
                      {stageMetrics.inProgress.formattedElapsed}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800/80 m-0 leading-tight">
                  Trabalho ativo na tarefa
                </p>
              </div>

              {/* Etapa 3: Atraso Acumulado */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                stageMetrics.delayed.elapsedSeconds > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between text-slate-700 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wide">3. Em Atraso</span>
                    <AlertTriangle className={`w-3.5 h-3.5 ${stageMetrics.delayed.elapsedSeconds > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                  </div>

                  {/* Tempo Útil */}
                  <div className="bg-white/80 p-1.5 rounded-lg border border-rose-200/60 mb-1.5">
                    <span className="text-[9.5px] font-bold text-rose-900 uppercase block flex items-center gap-1">
                      <Briefcase className="w-2.5 h-2.5 text-rose-700" /> Tempo Útil
                    </span>
                    <div className="text-base font-black text-rose-950 font-mono">
                      {stageMetrics.delayed.formattedBusiness}
                    </div>
                  </div>

                  {/* Tempo Corrido */}
                  <div className="bg-white/50 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] font-medium text-slate-500 uppercase block flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Tempo Corrido
                    </span>
                    <div className="text-xs font-bold text-slate-700 font-mono">
                      {stageMetrics.delayed.formattedElapsed}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 m-0 leading-tight">
                  {stageMetrics.delayed.elapsedSeconds > 0 ? 'Tempo em coluna Atrasado' : 'Sem atraso registrado'}
                </p>
              </div>

              {/* Etapa 4: Lead Time Total */}
              <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-slate-700 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wide">Soma Total</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#0d345e]" />
                  </div>

                  {/* Tempo Útil */}
                  <div className="bg-white/90 p-1.5 rounded-lg border border-[#0d345e]/30 mb-1.5 shadow-2xs">
                    <span className="text-[9.5px] font-extrabold text-[#0d345e] uppercase block flex items-center gap-1">
                      <Briefcase className="w-2.5 h-2.5" /> Total Útil
                    </span>
                    <div className="text-base font-black text-[#0d345e] font-mono">
                      {stageMetrics.total.formattedBusiness}
                    </div>
                  </div>

                  {/* Tempo Corrido */}
                  <div className="bg-white/60 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] font-medium text-slate-500 uppercase block flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Total Corrido
                    </span>
                    <div className="text-xs font-bold text-slate-700 font-mono">
                      {stageMetrics.total.formattedElapsed}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 m-0 leading-tight">
                  Lead Time total no sistema
                </p>
              </div>
            </div>
          </div>

          {/* AUDITORIA DO TO-DO / CHECKLIST DAS ETAPAS */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#0d345e]" />
                <span>Auditoria do To-Do / Checklist das Etapas</span>
              </h5>

              {checklist.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    {completedChecklist.length}/{checklist.length} concluídas ({checklistPercent}%)
                  </span>
                </div>
              )}
            </div>

            {checklist.length === 0 ? (
              <p className="text-xs text-slate-500 italic m-0 py-1">
                Nenhum item de to-do cadastrado nesta demanda.
              </p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, idx) => {
                  const timing = getChecklistItemTiming(item, task.createdAt);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs transition ${
                        item.completed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-slate-400 text-[11px] font-bold">{idx + 1}.</span>
                              <span className={`font-bold ${item.completed ? 'text-emerald-900' : 'text-slate-900'}`}>
                                {item.text}
                              </span>
                            </div>

                            {/* Informações de datas de criação e conclusão */}
                            <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              {timing.createdDateStr && (
                                <span>Criado: <strong>{timing.createdDateStr}</strong></span>
                              )}
                              {timing.completedDateStr && (
                                <span className="text-emerald-700 font-semibold">
                                  • Concluído: <strong>{timing.completedDateStr}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges de Tempo Útil e Tempo Corrido */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#0d345e] text-white flex items-center gap-1 shadow-2xs"
                              title="Tempo Útil dentro do horário comercial (08h às 17h, Seg-Sex)"
                            >
                              <Briefcase className="w-2.5 h-2.5 text-amber-300" />
                              <span>Útil: {timing.formattedBusiness}</span>
                            </span>

                            <span 
                              className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                              title="Tempo Corrido total (relógio 24h/7d)"
                            >
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>Corrido: {timing.formattedElapsed}</span>
                            </span>
                          </div>

                          <span className="text-[9.5px] text-slate-400 font-medium">
                            {item.completed ? 'Tempo até concluir' : 'Tempo em aberto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Resumo do To-Do */}
                {completedChecklist.length > 0 && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-600">
                      Total gasto nas etapas concluídas:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#0d345e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        💼 {formatBusinessDuration(totalChecklistBusinessSecs)} úteis
                      </span>
                      <span className="font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        ⏱️ {formatDuration(totalChecklistElapsedSecs)} corridos
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  const endPoint = step.leftAt || (isCurrent ? now.toISOString() : step.enteredAt);

                  const stepElapsed = step.durationSeconds != null
                    ? step.durationSeconds
                    : calculateElapsedSeconds(step.enteredAt, endPoint);

                  const stepBusiness = step.businessSeconds != null
                    ? step.businessSeconds
                    : calculateBusinessSeconds(step.enteredAt, endPoint);

                  return (
                    <div key={idx} className="relative">
                      {/* Bolinha do ponto da timeline */}
                      <span className={`
                        absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs
                        ${isCurrent ? 'bg-[#0d345e] ring-2 ring-blue-300' : 'bg-slate-400'}
                      `} />

                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
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

                        {/* Duas métricas de permanência na transição */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                          <span className="text-[11px] text-slate-500">
                            {isCurrent ? 'Permanência nesta etapa:' : 'Tempo decorrido:'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span 
                              className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0d345e] border border-blue-200 flex items-center gap-1"
                              title="Tempo Útil dentro do horário comercial (08h às 17h, Seg-Sex)"
                            >
                              <Briefcase className="w-2.5 h-2.5 text-amber-600" />
                              <span>Útil: <strong>{formatBusinessDuration(stepBusiness)}</strong></span>
                            </span>

                            <span 
                              className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1"
                              title="Tempo Corrido total (relógio 24h/7d)"
                            >
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>Corrido: <strong>{formatDuration(stepElapsed)}</strong></span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-[#0d345e]" />
            <span>Expediente: Seg a Sex, das 08h00 às 17h00.</span>
          </div>

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
