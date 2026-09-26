import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Filter,
  Briefcase
} from 'lucide-react';
import type { Task } from '../../types';
import { 
  formatDuration, 
  formatBusinessDuration,
  formatDurationLong, 
  getLiveKanbanDurationSeconds, 
  getLiveDelayedDurationSeconds,
  calculateBusinessSeconds
} from '../../utils/timeMetrics';
interface AdminMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  companies: string[];
}

export const AdminMetricsModal: React.FC<AdminMetricsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  companies,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (!isOpen) return null;

  // Filtragem
  const filteredTasks = tasks.filter((t) => {
    const matchComp = selectedCompany === 'all' || t.company === selectedCompany;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchComp && matchStatus;
  });

  // Estatísticas calculadas
  const completedTasks = filteredTasks.filter((t) => t.status === 'done');
  const delayedTasks = filteredTasks.filter((t) => t.status === 'delayed' || (t.totalDelayedSeconds || 0) > 0);

  // Média de Lead Time (tempo até conclusão)
  const totalCompletedSecs = completedTasks.reduce(
    (acc, t) => acc + (t.completedDurationSeconds || getLiveKanbanDurationSeconds(t)),
    0
  );
  const avgCompletionSecs = completedTasks.length > 0 ? Math.round(totalCompletedSecs / completedTasks.length) : 0;

  const totalCompletedBusinessSecs = completedTasks.reduce(
    (acc, t) => acc + calculateBusinessSeconds(t.createdAt, t.completedAt || new Date().toISOString()),
    0
  );
  const avgCompletionBusinessSecs = completedTasks.length > 0 ? Math.round(totalCompletedBusinessSecs / completedTasks.length) : 0;

  // Média de tempo em atraso
  const totalDelaySecs = filteredTasks.reduce(
    (acc, t) => acc + getLiveDelayedDurationSeconds(t),
    0
  );
  const avgDelaySecs = delayedTasks.length > 0 ? Math.round(totalDelaySecs / delayedTasks.length) : 0;

  // Taxa de entrega sem atraso
  const onTimeCompleted = completedTasks.filter((t) => (t.totalDelayedSeconds || 0) === 0).length;
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCompleted / completedTasks.length) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white m-0">Métricas de Tempo & SLA do Kanban</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Área Administrativa
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">
                Auditoria de tempo útil comercial (08h às 17h, Seg-Sex) e tempo corrido total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">

          {/* Cards de Métricas Principais (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#0d345e] mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Tempo Médio até Conclusão</span>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-black text-[#0d345e] flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>{avgCompletionBusinessSecs > 0 ? `${formatBusinessDuration(avgCompletionBusinessSecs)} útil` : 'N/D'}</span>
                </div>
                {avgCompletionSecs > 0 && (
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    ⏱️ {formatDuration(avgCompletionSecs)} corrido (24h/7d)
                  </div>
                )}
              </div>
              <p className="text-[11px] text-blue-900/80 m-0">
                {completedTasks.length} {completedTasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Tempo Médio em Atraso</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-rose-950 mt-1">
                {avgDelaySecs > 0 ? formatDuration(avgDelaySecs) : '0m'}
              </div>
              <p className="text-[11px] text-rose-600/80 mt-1">
                {delayedTasks.length} {delayedTasks.length === 1 ? 'tarefa com atraso' : 'tarefas com atraso'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Taxa de Pontualidade</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                {onTimeRate}%
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">
                Concluídas sem nunca atrasar
              </p>
            </div>

          </div>

          {/* Filtros da Tabela */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="all">Todas as Empresas</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="todo">A Fazer</option>
                  <option value="in_progress">Fazendo</option>
                  <option value="done">Concluído</option>
                  <option value="delayed">Atrasado</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500">
              Total: {filteredTasks.length} {filteredTasks.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {/* Tabela de Tarefas e Metadados de Tempo */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Tarefa & Cliente</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Tempo no Kanban</th>
                    <th className="px-3 py-2.5">Tempo em Atraso</th>
                    <th className="px-3 py-2.5">Criada em</th>
                    <th className="px-3 py-2.5">Concluída em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const kanbanSecs = getLiveKanbanDurationSeconds(task);
                      const delaySecs = getLiveDelayedDurationSeconds(task);
                      const isDone = task.status === 'done';
                      const isDelayed = task.status === 'delayed';

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={task.title}>
                              {task.title}
                            </div>
                            {task.company && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                                <Building2 className="w-2.5 h-2.5 text-[#0d345e] shrink-0" />
                                <span>{task.company}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                                isDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isDelayed
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {task.status === 'todo'
                                ? 'A Fazer'
                                : task.status === 'in_progress'
                                ? 'Fazendo'
                                : isDone
                                ? 'Concluído'
                                : 'Atrasado'}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 font-medium text-slate-700">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-[#0d345e] flex items-center gap-1 text-xs">
                                <Briefcase className="w-2.5 h-2.5 text-amber-600" />
                                {formatBusinessDuration(calculateBusinessSeconds(task.createdAt, task.completedAt || new Date().toISOString()))} útil
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{formatDuration(kanbanSecs)} corrido</span>
                                {isDone && <span className="text-[9px] text-emerald-600 font-semibold">(final)</span>}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            {delaySecs > 0 ? (
                              <span
                                className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit text-[11px]"
                                title={formatDurationLong(delaySecs)}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {formatDuration(delaySecs)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Nenhum atraso</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                            {task.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : '-'}
                          </td>

                          <td className="px-3 py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Dados operacionais para geração de relatórios e auditoria contábil.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
