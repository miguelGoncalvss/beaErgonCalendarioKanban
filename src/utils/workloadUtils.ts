import type { Task } from '../types';
import { formatDateKey } from './dateUtils';

export interface OperatorWorkload {
  operator: 'Bea' | 'Vini';
  totalActive: number;
  todoCount: number;
  inProgressCount: number;
  delayedCount: number;
  pausedCount: number;
  completedCount: number;
  percentageOfActive: number;
}

export interface DueDatesRadar {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  futureDays: Task[];
}

export interface ClientWorkload {
  company: string;
  totalActive: number;
  beaCount: number;
  viniCount: number;
  delayedCount: number;
  pausedCount: number;
  percentageOfTotal: number;
}

export interface WorkloadSummary {
  totalActive: number;
  totalCompleted: number;
  bea: OperatorWorkload;
  vini: OperatorWorkload;
  dueDates: DueDatesRadar;
  byClient: ClientWorkload[];
  workloadBalance: 'balanced' | 'bea_heavy' | 'vini_heavy';
}

/**
 * Retorna true se a tarefa pertence a um mês futuro que ainda não chegou
 * e que ainda não foi iniciada (ex: repetições futuras em 'todo' de meses seguintes)
 */
export function isFutureUnstartedTask(task: Task, refDate = new Date()): boolean {
  if (!task || !task.dueDate) return false;
  // Se já foi iniciada ou concluída, representa trabalho real do operador
  if (task.status === 'done' || task.status === 'in_progress') return false;

  const refYear = refDate.getFullYear();
  const refMonth = String(refDate.getMonth() + 1).padStart(2, '0');
  const refYearMonth = `${refYear}-${refMonth}`;

  const taskYearMonth = typeof task.dueDate === 'string' ? task.dueDate.substring(0, 7) : '';
  return Boolean(taskYearMonth) && taskYearMonth > refYearMonth;
}

/**
 * Gera representação textual visual de barra de progresso / carga
 * Ex: ████████████████░░░░ 18 tarefas
 */
export function generateProgressBar(value: number, max: number, totalChars = 20): string {
  if (max <= 0 || value <= 0) {
    return '░'.repeat(totalChars);
  }
  const filled = Math.min(totalChars, Math.max(0, Math.round((value / max) * totalChars)));
  const empty = Math.max(0, totalChars - filled);
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Calcula o resumo consolidado de carga de trabalho para a gestão diária da Equipe Ergon
 */
export function getWorkloadSummary(
  tasks: Task[],
  options?: {
    includeFuture?: boolean;
    currentYear?: number;
    currentMonth?: number;
  }
): WorkloadSummary {
  const now = new Date();
  const todayKey = formatDateKey(now);

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrow);

  // Próximos 7 dias para a janela de "Esta semana"
  const next7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const next7DaysKey = formatDateKey(next7Days);

  const safeTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];

  // Filtra meses futuros agendados se includeFuture for false (padrão)
  const effectiveTasks = options?.includeFuture
    ? safeTasks
    : safeTasks.filter((t) => !isFutureUnstartedTask(t, now));

  // Separa tarefas ativas (não concluídas) e concluídas
  const activeTasks = effectiveTasks.filter((t) => t.status !== 'done');
  const completedTasks = effectiveTasks.filter((t) => t.status === 'done');

  // Carga Bea
  const beaActive = activeTasks.filter((t) => (t.assignee || 'Bea') === 'Bea');
  const beaCompleted = completedTasks.filter((t) => (t.assignee || 'Bea') === 'Bea');

  // Carga Vini
  const viniActive = activeTasks.filter((t) => t.assignee === 'Vini');
  const viniCompleted = completedTasks.filter((t) => t.assignee === 'Vini');

  const totalActiveCount = activeTasks.length;
  const beaActiveCount = beaActive.length;
  const viniActiveCount = viniActive.length;

  const beaPercent = totalActiveCount > 0 ? Math.round((beaActiveCount / totalActiveCount) * 100) : 50;
  const viniPercent = totalActiveCount > 0 ? 100 - beaPercent : 50;

  const beaWorkload: OperatorWorkload = {
    operator: 'Bea',
    totalActive: beaActiveCount,
    todoCount: beaActive.filter((t) => t.status === 'todo').length,
    inProgressCount: beaActive.filter((t) => t.status === 'in_progress').length,
    delayedCount: beaActive.filter((t) => t.status === 'delayed' || (t.dueDate && t.dueDate < todayKey)).length,
    pausedCount: beaActive.filter((t) => t.isPaused).length,
    completedCount: beaCompleted.length,
    percentageOfActive: beaPercent,
  };

  const viniWorkload: OperatorWorkload = {
    operator: 'Vini',
    totalActive: viniActiveCount,
    todoCount: viniActive.filter((t) => t.status === 'todo').length,
    inProgressCount: viniActive.filter((t) => t.status === 'in_progress').length,
    delayedCount: viniActive.filter((t) => t.status === 'delayed' || (t.dueDate && t.dueDate < todayKey)).length,
    pausedCount: viniActive.filter((t) => t.isPaused).length,
    completedCount: viniCompleted.length,
    percentageOfActive: viniPercent,
  };

  // Radar de Vencimentos
  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrowList: Task[] = [];
  const thisWeek: Task[] = [];
  const futureDays: Task[] = [];

  for (const t of activeTasks) {
    if (!t.dueDate) {
      if (t.status === 'delayed') {
        overdue.push(t);
      } else {
        futureDays.push(t);
      }
      continue;
    }

    if (t.status === 'delayed' || t.dueDate < todayKey) {
      overdue.push(t);
    } else if (t.dueDate === todayKey) {
      today.push(t);
    } else if (t.dueDate === tomorrowKey) {
      tomorrowList.push(t);
    } else if (t.dueDate <= next7DaysKey) {
      thisWeek.push(t);
    } else {
      futureDays.push(t);
    }
  }

  // Agrupamento por Cliente / Empresa
  const clientMap = new Map<string, { totalActive: number; beaCount: number; viniCount: number; delayedCount: number; pausedCount: number }>();

  for (const t of activeTasks) {
    const comp = t.company?.trim() || 'Sem Empresa Vinculada';
    const isBea = (t.assignee || 'Bea') === 'Bea';
    const isDelayed = t.status === 'delayed' || (Boolean(t.dueDate) && t.dueDate! < todayKey);
    const isPaused = Boolean(t.isPaused);

    const current = clientMap.get(comp) || {
      totalActive: 0,
      beaCount: 0,
      viniCount: 0,
      delayedCount: 0,
      pausedCount: 0,
    };

    current.totalActive += 1;
    if (isBea) current.beaCount += 1;
    else current.viniCount += 1;
    if (isDelayed) current.delayedCount += 1;
    if (isPaused) current.pausedCount += 1;

    clientMap.set(comp, current);
  }

  const byClient: ClientWorkload[] = Array.from(clientMap.entries())
    .map(([company, data]) => ({
      company,
      totalActive: data.totalActive,
      beaCount: data.beaCount,
      viniCount: data.viniCount,
      delayedCount: data.delayedCount,
      pausedCount: data.pausedCount,
      percentageOfTotal: totalActiveCount > 0 ? Math.round((data.totalActive / totalActiveCount) * 100) : 0,
    }))
    .sort((a, b) => b.totalActive - a.totalActive);

  // Balanço de carga
  let workloadBalance: 'balanced' | 'bea_heavy' | 'vini_heavy' = 'balanced';
  if (totalActiveCount >= 6) {
    if (beaPercent >= 65) {
      workloadBalance = 'bea_heavy';
    } else if (viniPercent >= 65) {
      workloadBalance = 'vini_heavy';
    }
  }

  return {
    totalActive: totalActiveCount,
    totalCompleted: completedTasks.length,
    bea: beaWorkload,
    vini: viniWorkload,
    dueDates: {
      overdue,
      today,
      tomorrow: tomorrowList,
      thisWeek,
      futureDays,
    },
    byClient,
    workloadBalance,
  };
}
