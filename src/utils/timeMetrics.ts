import type { Task, TaskStatus } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Fazendo',
  done: 'Concluído',
  delayed: 'Atrasado',
};

/**
 * Converte segundos em formato amigável em português (ex: "3d 4h", "2h 30m", "45m", "35s")
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) {
    return '0m';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remSeconds = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) {
    return `${Math.max(1, remSeconds)}s`;
  }

  return parts.join(' ');
}

/**
 * Converte segundos em formato descritivo por extenso (ex: "3 dias e 4 horas", "2 horas e 30 minutos")
 */
export function formatDurationLong(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) {
    return '0 minutos';
  }

  if (seconds < 60) {
    return `${Math.max(1, Math.floor(seconds))} ${Math.floor(seconds) === 1 ? 'segundo' : 'segundos'}`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);

  if (parts.length === 0) return 'Menos de 1 minuto';
  return parts.join(' e ');
}

/**
 * Retorna os segundos totais que a tarefa passou no Kanban (ao vivo se ainda não concluída)
 * Garante que a soma total reflita o somatório do tempo de permanência de cada etapa.
 */
export function getLiveKanbanDurationSeconds(task: Task): number {
  if (task.completedDurationSeconds != null && task.completedDurationSeconds > 0) {
    return task.completedDurationSeconds;
  }

  const todo = getLiveTodoDurationSeconds(task);
  const inProgress = getLiveInProgressDurationSeconds(task);
  const delayed = getLiveDelayedDurationSeconds(task);
  const sumStages = todo + inProgress + delayed;

  if (task.createdAt) {
    const start = new Date(task.createdAt).getTime();
    if (!isNaN(start)) {
      const elapsedSinceCreation = Math.max(0, Math.floor((Date.now() - start) / 1000));
      return Math.max(sumStages, elapsedSinceCreation);
    }
  }

  return sumStages;
}

/**
 * Retorna os segundos totais acumulados no status "A Fazer" (ao vivo se estiver em "todo" agora)
 */
export function getLiveTodoDurationSeconds(task: Task): number {
  let total = task.timeInTodoSeconds || 0;

  if (task.status === 'todo') {
    const stageStart = task.stageEnteredAt 
      ? new Date(task.stageEnteredAt).getTime() 
      : (task.createdAt ? new Date(task.createdAt).getTime() : Date.now());
    if (!isNaN(stageStart)) {
      total += Math.max(0, Math.floor((Date.now() - stageStart) / 1000));
    }
  }

  return total;
}

/**
 * Retorna os segundos totais acumulados no status "Fazendo" (ao vivo se estiver em execução agora)
 */
export function getLiveInProgressDurationSeconds(task: Task): number {
  let total = task.timeInProgressSeconds || 0;

  if (task.status === 'in_progress') {
    const stageStart = task.stageEnteredAt 
      ? new Date(task.stageEnteredAt).getTime() 
      : (task.startedAt ? new Date(task.startedAt).getTime() : Date.now());
    if (!isNaN(stageStart)) {
      total += Math.max(0, Math.floor((Date.now() - stageStart) / 1000));
    }
  }

  return total;
}

/**
 * Retorna os segundos totais que a tarefa acumulou em atraso (ao vivo se estiver atrasada agora)
 */
export function getLiveDelayedDurationSeconds(task: Task): number {
  let total = task.totalDelayedSeconds || 0;

  if (task.status === 'delayed') {
    const delayedStart = task.delayedAt 
      ? new Date(task.delayedAt).getTime() 
      : (task.stageEnteredAt ? new Date(task.stageEnteredAt).getTime() : Date.now());
    if (!isNaN(delayedStart)) {
      total += Math.max(0, Math.floor((Date.now() - delayedStart) / 1000));
    }
  }

  return total;
}

export interface TaskSlaInfo {
  hasDeadline: boolean;
  deadlineFormatted: string;
  deadlineTimestamp: number | null;
  isBreached: boolean;
  status: 'on_time' | 'warning' | 'overdue' | 'completed_on_time' | 'completed_overdue';
  statusLabel: string;
  badgeClass: string;
  diffSeconds: number;
  formattedDiff: string;
}

/**
 * Analisa o cumprimento de SLA e o prazo fatal "Até quando deve ser feito?"
 */
export function getTaskSlaInfo(task: Task): TaskSlaInfo {
  if (!task.dueDate) {
    return {
      hasDeadline: false,
      deadlineFormatted: 'Sem prazo fatal definido',
      deadlineTimestamp: null,
      isBreached: false,
      status: 'on_time',
      statusLabel: 'Sem prazo estabelecido',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      diffSeconds: 0,
      formattedDiff: 'Livre',
    };
  }

  const [y, m, d] = task.dueDate.split('-').map(Number);
  let deadlineDate: Date;
  let formattedTime = '';

  if (task.dueTime) {
    const [hh, mm] = task.dueTime.split(':').map(Number);
    deadlineDate = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
    formattedTime = ` às ${task.dueTime}`;
  } else {
    deadlineDate = new Date(y, m - 1, d, 23, 59, 59);
  }

  const deadlineTimestamp = deadlineDate.getTime();
  const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}${formattedTime}`;

  // Se a tarefa já foi concluída
  if (task.status === 'done') {
    const completedTimestamp = task.completedAt 
      ? new Date(task.completedAt).getTime() 
      : (task.stageEnteredAt ? new Date(task.stageEnteredAt).getTime() : Date.now());

    if (completedTimestamp <= deadlineTimestamp) {
      const earlyDiff = Math.max(0, Math.floor((deadlineTimestamp - completedTimestamp) / 1000));
      return {
        hasDeadline: true,
        deadlineFormatted: formattedDate,
        deadlineTimestamp,
        isBreached: false,
        status: 'completed_on_time',
        statusLabel: 'Entregue no Prazo',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        diffSeconds: earlyDiff,
        formattedDiff: earlyDiff > 60 ? `${formatDuration(earlyDiff)} antes` : 'No prazo exato',
      };
    } else {
      const lateDiff = Math.max(0, Math.floor((completedTimestamp - deadlineTimestamp) / 1000));
      return {
        hasDeadline: true,
        deadlineFormatted: formattedDate,
        deadlineTimestamp,
        isBreached: true,
        status: 'completed_overdue',
        statusLabel: 'Entregue com Atraso',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
        diffSeconds: lateDiff,
        formattedDiff: `${formatDuration(lateDiff)} após o prazo`,
      };
    }
  }

  // Tarefa ainda não concluída
  const now = Date.now();
  if (now > deadlineTimestamp) {
    const breachDiff = Math.max(0, Math.floor((now - deadlineTimestamp) / 1000));
    return {
      hasDeadline: true,
      deadlineFormatted: formattedDate,
      deadlineTimestamp,
      isBreached: true,
      status: 'overdue',
      statusLabel: 'Prazo Expirado',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-400 font-bold',
      diffSeconds: breachDiff,
      formattedDiff: `Atrasado há ${formatDuration(breachDiff)}`,
    };
  } else {
    const remainingDiff = Math.max(0, Math.floor((deadlineTimestamp - now) / 1000));
    const isWarning = remainingDiff <= 86400; // Menos de 24 horas

    return {
      hasDeadline: true,
      deadlineFormatted: formattedDate,
      deadlineTimestamp,
      isBreached: false,
      status: isWarning ? 'warning' : 'on_time',
      statusLabel: isWarning ? 'Vence em breve' : 'No Prazo',
      badgeClass: isWarning 
        ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold' 
        : 'bg-blue-50 text-blue-700 border-blue-200',
      diffSeconds: remainingDiff,
      formattedDiff: `Resta ${formatDuration(remainingDiff)}`,
    };
  }
}

