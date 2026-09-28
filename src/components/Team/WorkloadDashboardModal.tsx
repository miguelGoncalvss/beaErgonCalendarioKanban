import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Users, 
  Clock, 
  AlertTriangle, 
  CalendarDays, 
  Building2, 
  Calendar, 
  ArrowRightLeft, 
  Filter, 
  ChevronRight,
  Sparkles,
  PauseCircle,
  Briefcase
} from 'lucide-react';
import type { Task } from '../../types';
import { getWorkloadSummary, generateProgressBar } from '../../utils/workloadUtils';
import { createHandoffTransition } from '../../utils/timeMetrics';

interface WorkloadDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  currentYear?: number;
  currentMonth?: number;
}

type DrilldownFilter = 'all' | 'bea' | 'vini' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'paused' | 'client';

export const WorkloadDashboardModal: React.FC<WorkloadDashboardModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  onUpdateTask,
  currentYear,
  currentMonth,
}) => {
  const [includeFuture, setIncludeFuture] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter>('all');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Escuta tecla Escape para fechar a sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resumo de carga de trabalho consolidado
  const summary = useMemo(() => {
    return getWorkloadSummary(tasks, {
      includeFuture,
      currentYear,
      currentMonth,
    });
  }, [tasks, includeFuture, currentYear, currentMonth]);

  // Filtragem da lista de detalhamento (Drilldown)
  // IMPORTANTE: Este hook DEVE estar no topo antes de qualquer "if (!isOpen) return null;"
  const displayTasks = useMemo(() => {
    const baseTasks = includeFuture
      ? tasks
      : tasks.filter((t) => {
          if (!t.dueDate) return true;
          if (t.status === 'done' || t.status === 'in_progress') return true;
          const refYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const taskYm = typeof t.dueDate === 'string' ? t.dueDate.substring(0, 7) : '';
          return taskYm ? taskYm <= refYearMonth : true;
        });

    const activeList = baseTasks.filter((t) => t.status !== 'done');

    if (activeFilter === 'bea') {
      return activeList.filter((t) => (t.assignee || 'Bea') === 'Bea');
    }
    if (activeFilter === 'vini') {
      return activeList.filter((t) => t.assignee === 'Vini');
    }
    if (activeFilter === 'overdue') {
      return summary.dueDates.overdue;
    }
    if (activeFilter === 'today') {
      return summary.dueDates.today;
    }
    if (activeFilter === 'tomorrow') {
      return summary.dueDates.tomorrow;
    }
    if (activeFilter === 'this_week') {
      return summary.dueDates.thisWeek;
    }
    if (activeFilter === 'paused') {
      return activeList.filter((t) => t.isPaused);
    }
    if (activeFilter === 'client' && selectedClient) {
      return activeList.filter((t) => (t.company?.trim() || 'Sem Empresa Vinculada') === selectedClient);
    }

    return activeList;
  }, [tasks, includeFuture, activeFilter, selectedClient, summary]);

  const handleSelectFilter = (filter: DrilldownFilter, clientName?: string) => {
    setActiveFilter(filter);
    if (clientName) {
      setSelectedClient(clientName);
    } else if (filter !== 'client') {
      setSelectedClient(null);
    }
  };

  const maxClientActive = summary.byClient.length > 0 ? Math.max(summary.byClient[0].totalActive, 1) : 1;

  // Retorno antecipado após todos os hooks terem sido invocados
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn font-['Inter',sans-serif]"
      onClick={onClose}
    >
      {/* Sidebar Drawer Panel */}
      <div 
        className="w-full sm:w-[500px] md:w-[580px] xl:w-[640px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slideInRight overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header da Sidebar */}
        <div className="px-5 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0d345e] flex items-center justify-center shadow-md font-black shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white m-0 tracking-tight">
                  Equipe Ergon
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-[#0d345e] uppercase tracking-wider">
                  Gestão Diária
                </span>
              </div>
              <p className="text-xs text-blue-200/90 m-0">
                Carga operacional Bea vs. Vini, vencimentos e clientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle de Escopo: Ignorar ou Incluir Meses Futuros Agendados */}
            <div className="flex items-center gap-1 bg-[#08223f] p-1 rounded-lg border border-blue-900/80 text-[10.5px]">
              <button
                type="button"
                onClick={() => setIncludeFuture(false)}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  !includeFuture 
                    ? 'bg-amber-400 text-[#0d345e] shadow-xs' 
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Foca apenas no ciclo atual (exclui agendamentos de meses futuros)"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => setIncludeFuture(true)}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  includeFuture 
                    ? 'bg-amber-400 text-[#0d345e] shadow-xs' 
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Inclui todas as repetições futuras geradas pelo sistema"
              >
                Todos
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
              title="Fechar painel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body da Sidebar com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-slate-700 bg-slate-50/50">

          {/* 1. SEÇÃO PRINCIPAL: CARGA DE TRABALHO OPERACIONAL (BEA vs VINI) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0d345e]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">
                  Carga da Dupla (Demandas em Aberto)
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-black text-sm text-[#0d345e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                  {summary.totalActive} {summary.totalActive === 1 ? 'tarefa' : 'tarefas'}
                </span>
                {summary.workloadBalance !== 'balanced' && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                    <span>{summary.workloadBalance === 'bea_heavy' ? 'Bea +' : 'Vini +'}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* CARD BEA */}
              <div 
                onClick={() => handleSelectFilter(activeFilter === 'bea' ? 'all' : 'bea')}
                className={`p-3.5 rounded-xl border transition cursor-pointer relative overflow-hidden ${
                  activeFilter === 'bea'
                    ? 'bg-blue-50/90 border-[#0d345e] shadow-md ring-2 ring-[#0d345e]/20'
                    : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0d345e] text-white flex items-center justify-center font-black text-xs shadow-xs">
                      B
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-sm">BEA</span>
                        <span className="text-[9.5px] font-bold text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded-full">
                          {summary.bea.percentageOfActive}%
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-medium">
                        Operacional Contábil
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-[#0d345e] font-mono leading-none">
                      {summary.bea.totalActive}
                    </div>
                    <span className="text-[9.5px] font-semibold text-slate-500">
                      {summary.bea.totalActive === 1 ? 'ativa' : 'ativas'}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso Visual / Carga */}
                <div className="space-y-1 my-2">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 flex">
                    <div 
                      className="bg-[#0d345e] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, summary.bea.percentageOfActive))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 px-0.5">
                    <span className="tracking-tight">{generateProgressBar(summary.bea.totalActive, Math.max(summary.totalActive, 1), 14)}</span>
                    <span className="font-bold text-[#0d345e]">{summary.bea.totalActive} tarefas</span>
                  </div>
                </div>

                {/* Breakdown de Status da Bea */}
                <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-100 text-center">
                  <div className="p-1 bg-slate-50 rounded">
                    <span className="block text-[8.5px] font-bold text-slate-400 uppercase">A Fazer</span>
                    <span className="font-bold text-slate-800 text-[11px] font-mono">{summary.bea.todoCount}</span>
                  </div>
                  <div className="p-1 bg-amber-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-amber-700 uppercase">Fazendo</span>
                    <span className="font-bold text-amber-950 text-[11px] font-mono">{summary.bea.inProgressCount}</span>
                  </div>
                  <div className="p-1 bg-rose-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-rose-700 uppercase">Atraso</span>
                    <span className="font-bold text-rose-950 text-[11px] font-mono">{summary.bea.delayedCount}</span>
                  </div>
                  <div className="p-1 bg-emerald-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-emerald-700 uppercase">Feitas</span>
                    <span className="font-bold text-emerald-950 text-[11px] font-mono">{summary.bea.completedCount}</span>
                  </div>
                </div>
              </div>

              {/* CARD VINI */}
              <div 
                onClick={() => handleSelectFilter(activeFilter === 'vini' ? 'all' : 'vini')}
                className={`p-3.5 rounded-xl border transition cursor-pointer relative overflow-hidden ${
                  activeFilter === 'vini'
                    ? 'bg-indigo-50/90 border-indigo-900 shadow-md ring-2 ring-indigo-900/20'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      V
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-sm">VINI</span>
                        <span className="text-[9.5px] font-bold text-indigo-900 bg-indigo-100 px-1.5 py-0.2 rounded-full">
                          {summary.vini.percentageOfActive}%
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-medium">
                        Operacional Contábil
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-indigo-950 font-mono leading-none">
                      {summary.vini.totalActive}
                    </div>
                    <span className="text-[9.5px] font-semibold text-slate-500">
                      {summary.vini.totalActive === 1 ? 'ativa' : 'ativas'}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso Visual / Carga */}
                <div className="space-y-1 my-2">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 flex">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, summary.vini.percentageOfActive))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 px-0.5">
                    <span className="tracking-tight">{generateProgressBar(summary.vini.totalActive, Math.max(summary.totalActive, 1), 14)}</span>
                    <span className="font-bold text-indigo-900">{summary.vini.totalActive} tarefas</span>
                  </div>
                </div>

                {/* Breakdown de Status do Vini */}
                <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-100 text-center">
                  <div className="p-1 bg-slate-50 rounded">
                    <span className="block text-[8.5px] font-bold text-slate-400 uppercase">A Fazer</span>
                    <span className="font-bold text-slate-800 text-[11px] font-mono">{summary.vini.todoCount}</span>
                  </div>
                  <div className="p-1 bg-amber-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-amber-700 uppercase">Fazendo</span>
                    <span className="font-bold text-amber-950 text-[11px] font-mono">{summary.vini.inProgressCount}</span>
                  </div>
                  <div className="p-1 bg-rose-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-rose-700 uppercase">Atraso</span>
                    <span className="font-bold text-rose-950 text-[11px] font-mono">{summary.vini.delayedCount}</span>
                  </div>
                  <div className="p-1 bg-emerald-50/70 rounded">
                    <span className="block text-[8.5px] font-bold text-emerald-700 uppercase">Feitas</span>
                    <span className="font-bold text-emerald-950 text-[11px] font-mono">{summary.vini.completedCount}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. RADAR DE VENCIMENTOS (GESTÃO DIÁRIA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Clock className="w-3.5 h-3.5 text-[#0d345e]" />
                <span>Radar de Vencimentos</span>
              </h3>
              <span className="text-[10px] text-slate-400">
                Clique para filtrar
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* ATRASADOS */}
              <button
                type="button"
                onClick={() => handleSelectFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  activeFilter === 'overdue'
                    ? 'bg-rose-100/90 border-rose-600 shadow-md ring-2 ring-rose-500/20'
                    : 'bg-rose-50/60 border-rose-200 hover:bg-rose-100/60 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-rose-700 mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Atrasados</span>
                  </span>
                </div>
                <div className="text-xl font-black text-rose-950 font-mono">
                  {summary.dueDates.overdue.length}
                </div>
                <p className="text-[9.5px] text-rose-700/90 m-0">
                  Prazo expirado
                </p>
              </button>

              {/* HOJE */}
              <button
                type="button"
                onClick={() => handleSelectFilter(activeFilter === 'today' ? 'all' : 'today')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  activeFilter === 'today'
                    ? 'bg-amber-100/90 border-amber-600 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-amber-800 mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>Hoje</span>
                  </span>
                </div>
                <div className="text-xl font-black text-amber-950 font-mono">
                  {summary.dueDates.today.length}
                </div>
                <p className="text-[9.5px] text-amber-800/90 m-0">
                  Vence no dia
                </p>
              </button>

              {/* AMANHÃ */}
              <button
                type="button"
                onClick={() => handleSelectFilter(activeFilter === 'tomorrow' ? 'all' : 'tomorrow')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  activeFilter === 'tomorrow'
                    ? 'bg-blue-100/90 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-blue-50/60 border-blue-200 hover:bg-blue-100/60 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-[#0d345e] mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-blue-700" />
                    <span>Amanhã</span>
                  </span>
                </div>
                <div className="text-xl font-black text-[#0d345e] font-mono">
                  {summary.dueDates.tomorrow.length}
                </div>
                <p className="text-[9.5px] text-blue-900/80 m-0">
                  Próximas 24h
                </p>
              </button>

              {/* ESTA SEMANA */}
              <button
                type="button"
                onClick={() => handleSelectFilter(activeFilter === 'this_week' ? 'all' : 'this_week')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  activeFilter === 'this_week'
                    ? 'bg-indigo-100/90 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100/60 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-indigo-900 mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-indigo-600" />
                    <span>Esta Semana</span>
                  </span>
                </div>
                <div className="text-xl font-black text-indigo-950 font-mono">
                  {summary.dueDates.thisWeek.length}
                </div>
                <p className="text-[9.5px] text-indigo-900/80 m-0">
                  Próximos 7 dias
                </p>
              </button>

            </div>
          </div>

          {/* 3. CONCENTRAÇÃO POR CLIENTE / EMPRESA */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0d345e]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">
                  Por Cliente (Top Demandas)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                {summary.byClient.length} {summary.byClient.length === 1 ? 'empresa' : 'empresas'}
              </span>
            </div>

            {summary.byClient.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center m-0">
                Nenhuma tarefa ativa cadastrada para empresas no período.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {summary.byClient.slice(0, 8).map((client, idx) => {
                  const isSelected = activeFilter === 'client' && selectedClient === client.company;
                  const ratio = Math.max(8, Math.round((client.totalActive / maxClientActive) * 100));

                  return (
                    <div
                      key={client.company}
                      onClick={() => handleSelectFilter(isSelected ? 'all' : 'client', client.company)}
                      className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/90 border-[#0d345e] shadow-2xs ring-2 ring-[#0d345e]/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-blue-50/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-slate-400 text-[11px] font-bold w-4 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {client.company}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9.5px] font-mono text-slate-400">
                                B: {client.beaCount} | V: {client.viniCount}
                              </span>
                              <span className="font-black text-xs font-mono text-[#0d345e] bg-white border border-slate-200 px-1.5 py-0.2 rounded shadow-2xs">
                                {client.totalActive} {client.totalActive === 1 ? 'tarefa' : 'tarefas'}
                              </span>
                            </div>
                          </div>

                          {/* Barra de Proporção Relativa */}
                          <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden flex">
                            <div
                              className="bg-[#0d345e] h-full rounded-full transition-all duration-300"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. LISTA RÁPIDA DE AÇÃO (DRILLDOWN INTERATIVO) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#0d345e]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">
                  {activeFilter === 'all' && 'Todas as Demandas em Aberto'}
                  {activeFilter === 'bea' && 'Demandas da BEA'}
                  {activeFilter === 'vini' && 'Demandas do VINI'}
                  {activeFilter === 'overdue' && '⚠️ Demandas Atrasadas'}
                  {activeFilter === 'today' && '🎯 Vencem HOJE'}
                  {activeFilter === 'tomorrow' && '📅 Vencem AMANHÃ'}
                  {activeFilter === 'this_week' && '🗓️ Demandas para ESTA SEMANA'}
                  {activeFilter === 'client' && `🏢 Cliente: ${selectedClient}`}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {displayTasks.length} {displayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
                {activeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleSelectFilter('all')}
                    className="text-[10px] font-bold text-[#0d345e] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition"
                  >
                    Ver todas
                  </button>
                )}
              </div>
            </div>

            {displayTasks.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">
                Nenhuma tarefa pendente com o filtro selecionado.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {displayTasks.map((task) => {
                  const isBea = (task.assignee || 'Bea') === 'Bea';
                  const isDelayed = task.status === 'delayed' || (Boolean(task.dueDate) && typeof task.dueDate === 'string' && task.dueDate < new Date().toISOString().substring(0, 10));

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition cursor-pointer ${
                        isDelayed
                          ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
                          : task.isPaused
                          ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
                          : 'bg-white border-slate-200 hover:bg-blue-50/40 hover:border-blue-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold truncate text-slate-900 ${isDelayed ? 'text-rose-900' : ''}`}>
                            {task.title}
                          </span>
                          {task.company && (
                            <span className="text-[9.5px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium truncate max-w-[120px]">
                              {task.company}
                            </span>
                          )}
                          {task.isPaused && (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                              <PauseCircle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Pausada</span>
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[10.5px] text-slate-500 m-0 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Prazo */}
                        <div className="text-right">
                          <span className={`text-[10px] font-mono font-bold block ${
                            isDelayed ? 'text-rose-600' : 'text-slate-600'
                          }`}>
                            {typeof task.dueDate === 'string' && task.dueDate ? task.dueDate.split('-').reverse().slice(0, 2).join('/') : 'Sem data'}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {task.dueTime || 'Até 17h'}
                          </span>
                        </div>

                        {/* Passagem de bastão rápida */}
                        {onUpdateTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const other = isBea ? 'Vini' : 'Bea';
                              const nowIso = new Date().toISOString();
                              const newHist = createHandoffTransition(task, other, nowIso);
                              onUpdateTask({
                                ...task,
                                assignee: other,
                                assigneeHistory: newHist,
                                updatedAt: nowIso,
                              });
                            }}
                            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#0d345e] text-[9.5px] font-bold transition cursor-pointer border border-slate-200"
                            title={`Passar bastão diretamente para ${isBea ? 'Vini' : 'Bea'}`}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5 text-[#0d345e]" />
                            <span>p/ {isBea ? 'Vini' : 'Bea'}</span>
                          </button>
                        )}

                        {/* Operador Avatar */}
                        <div 
                          className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-[11px] shadow-2xs ${
                            isBea ? 'bg-[#0d345e]' : 'bg-indigo-600'
                          }`}
                          title={`Custódia: ${isBea ? 'Bea' : 'Vini'}`}
                        >
                          {isBea ? 'B' : 'V'}
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer da Sidebar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gestão diária de entregas contábeis.</span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#0d345e] hover:bg-blue-900 text-amber-300 font-bold rounded-lg transition cursor-pointer shadow-xs text-xs"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
};
