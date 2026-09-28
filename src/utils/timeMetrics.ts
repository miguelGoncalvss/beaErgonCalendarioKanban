import type { Task, TaskStatus, ChecklistItem, AssigneeTransition, AssigneeAction } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Fazendo',
  done: 'Concluído',
  delayed: 'Atrasado',
};

/**
 * Configuração oficial do Horário de Expediente / Comercial (Segunda a Sexta, das 08h às 17h)
 */
export const BUSINESS_HOURS = {
  startHour: 8,  // 08:00
  endHour: 17,   // 17:00
  dailyHours: 9, // 9 horas úteis por dia de expediente
};

/**
 * Calcula o tempo corrido total (Elapsed Time) em segundos entre duas datas (24h/7d).
 */
export function calculateElapsedSeconds(
  startDate?: string | Date | number | null,
  endDate?: string | Date | number | null
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * Calcula com máxima precisão o tempo útil (Business Time) em segundos entre duas datas.
 * Considera estritamente o expediente comercial: Segunda a Sexta, das 08:00 às 17:00.
 * Desconsidera noites e finais de semana.
 */
export function calculateBusinessSeconds(
  startDate?: string | Date | number | null,
  endDate?: string | Date | number | null,
  startHour = BUSINESS_HOURS.startHour,
  endHour = BUSINESS_HOURS.endHour
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  let totalBusinessMs = 0;
  // Normaliza o ponteiro diário para a meia-noite do dia inicial no fuso horário local
  const currentDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (currentDay <= endDay) {
    const dayOfWeek = currentDay.getDay(); // 0 = Domingo, 6 = Sábado
    // Apenas Segunda (1) a Sexta (5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = currentDay.getFullYear();
      const month = currentDay.getMonth();
      const date = currentDay.getDate();

      const windowStart = new Date(year, month, date, startHour, 0, 0, 0).getTime();
      const windowEnd = new Date(year, month, date, endHour, 0, 0, 0).getTime();

      const overlapStart = Math.max(start.getTime(), windowStart);
      const overlapEnd = Math.min(end.getTime(), windowEnd);

      if (overlapEnd > overlapStart) {
        totalBusinessMs += (overlapEnd - overlapStart);
      }
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return Math.floor(totalBusinessMs / 1000);
}

/**
 * Formata a duração de tempo útil considerando 1 dia útil = 9 horas de expediente (08h às 17h).
 * Ex: "2h 30m", "1d útil 3h", "3d úteis 4h 15m"
 */
export function formatBusinessDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) {
    return '0m';
  }

  const WORKDAY_SECONDS = BUSINESS_HOURS.dailyHours * 3600; // 9 * 3600 = 32400
  const workDays = Math.floor(seconds / WORKDAY_SECONDS);
  const remSeconds = seconds % WORKDAY_SECONDS;
  const hours = Math.floor(remSeconds / 3600);
  const minutes = Math.floor((remSeconds % 3600) / 60);
  const remSecs = Math.floor(remSeconds % 60);

  const parts: string[] = [];
  if (workDays > 0) {
    parts.push(`${workDays}d útil${workDays > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    return `${Math.max(1, remSecs)}s`;
  }

  return parts.join(' ');
}

export interface DualTimeMetric {
  elapsedSeconds: number;
  businessSeconds: number;
  formattedElapsed: string;
  formattedBusiness: string;
}

/**
 * Retorna as métricas combinadas (Tempo Útil e Tempo Corrido) para uma transição ou intervalo
 */
export function getDualTimeMetrics(
  startDate?: string | Date | number | null,
  endDate?: string | Date | number | null
): DualTimeMetric {
  const elapsedSeconds = calculateElapsedSeconds(startDate, endDate);
  const businessSeconds = calculateBusinessSeconds(startDate, endDate);
  return {
    elapsedSeconds,
    businessSeconds,
    formattedElapsed: formatDuration(elapsedSeconds),
    formattedBusiness: formatBusinessDuration(businessSeconds),
  };
}

/**
 * Retorna as métricas de tempo (Útil e Corrido) para um item de to-do / checklist
 */
export function getChecklistItemTiming(
  item: ChecklistItem,
  taskCreatedAt?: string
): {
  isCompleted: boolean;
  elapsedSeconds: number;
  businessSeconds: number;
  formattedElapsed: string;
  formattedBusiness: string;
  createdDateStr?: string;
  completedDateStr?: string;
} {
  const itemStart = item.createdAt || taskCreatedAt || new Date().toISOString();
  const isCompleted = Boolean(item.completed);
  const itemEnd = isCompleted ? (item.completedAt || new Date().toISOString()) : new Date().toISOString();

  const elapsedSeconds = item.elapsedSeconds != null 
    ? item.elapsedSeconds 
    : calculateElapsedSeconds(itemStart, itemEnd);

  const businessSeconds = item.businessSeconds != null
    ? item.businessSeconds
    : calculateBusinessSeconds(itemStart, itemEnd);

  return {
    isCompleted,
    elapsedSeconds,
    businessSeconds,
    formattedElapsed: formatDuration(elapsedSeconds),
    formattedBusiness: formatBusinessDuration(businessSeconds),
    createdDateStr: item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : undefined,
    completedDateStr: item.completedAt ? new Date(item.completedAt).toLocaleString('pt-BR') : undefined,
  };
}

/**
 * Retorna as métricas completas (Útil e Corrido) acumuladas por estágio e o Lead Time total da tarefa
 */
export function getTaskStageDualMetrics(task: Task) {
  const now = new Date();
  const history = task.stageHistory || [];

  let todoElapsed = 0;
  let todoBusiness = 0;
  let inProgressElapsed = 0;
  let inProgressBusiness = 0;
  let delayedElapsed = 0;
  let delayedBusiness = 0;

  if (history.length > 0) {
    for (let i = 0; i < history.length; i++) {
      const step = history[i];
      const start = step.enteredAt;
      const end = step.leftAt || (i === history.length - 1 ? now.toISOString() : step.enteredAt);
      
      const elapsed = step.durationSeconds != null ? step.durationSeconds : calculateElapsedSeconds(start, end);
      const business = step.businessSeconds != null ? step.businessSeconds : calculateBusinessSeconds(start, end);

      const targetStatus = step.toStatus;
      if (targetStatus === 'todo') {
        todoElapsed += elapsed;
        todoBusiness += business;
      } else if (targetStatus === 'in_progress') {
        inProgressElapsed += elapsed;
        inProgressBusiness += business;
      } else if (targetStatus === 'delayed') {
        delayedElapsed += elapsed;
        delayedBusiness += business;
      }
    }
  } else {
    todoElapsed = getLiveTodoDurationSeconds(task);
    todoBusiness = calculateBusinessSeconds(task.createdAt, task.status === 'todo' ? now : (task.startedAt || now));

    inProgressElapsed = getLiveInProgressDurationSeconds(task);
    if (task.startedAt) {
      inProgressBusiness = calculateBusinessSeconds(task.startedAt, task.status === 'in_progress' ? now : (task.completedAt || now));
    }

    delayedElapsed = getLiveDelayedDurationSeconds(task);
    if (task.delayedAt) {
      delayedBusiness = calculateBusinessSeconds(task.delayedAt, task.status === 'delayed' ? now : (task.completedAt || now));
    }
  }

  // Lead time total
  const endPoint = task.status === 'done' && task.completedAt ? task.completedAt : now.toISOString();
  const totalElapsed = calculateElapsedSeconds(task.createdAt, endPoint);
  const totalBusiness = calculateBusinessSeconds(task.createdAt, endPoint);

  return {
    todo: {
      elapsedSeconds: todoElapsed,
      businessSeconds: todoBusiness,
      formattedElapsed: formatDuration(todoElapsed),
      formattedBusiness: formatBusinessDuration(todoBusiness),
    },
    inProgress: {
      elapsedSeconds: inProgressElapsed,
      businessSeconds: inProgressBusiness,
      formattedElapsed: formatDuration(inProgressElapsed),
      formattedBusiness: formatBusinessDuration(inProgressBusiness),
    },
    delayed: {
      elapsedSeconds: delayedElapsed,
      businessSeconds: delayedBusiness,
      formattedElapsed: formatDuration(delayedElapsed),
      formattedBusiness: formatBusinessDuration(delayedBusiness),
    },
    total: {
      elapsedSeconds: totalElapsed,
      businessSeconds: totalBusiness,
      formattedElapsed: formatDuration(totalElapsed),
      formattedBusiness: formatBusinessDuration(totalBusiness),
    },
  };
}

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
 * Retorna os segundos totais que a tarefa passou em pausa (ao vivo se estiver pausada agora)
 */
export function getLivePausedSeconds(task: Task): number {
  let total = task.totalPausedSeconds || 0;
  if (task.isPaused && task.pausedAt) {
    const pauseStart = new Date(task.pausedAt).getTime();
    if (!isNaN(pauseStart)) {
      total += Math.max(0, Math.floor((Date.now() - pauseStart) / 1000));
    }
  }
  return total;
}

/**
 * Retorna os segundos totais que a tarefa passou no Kanban (ao vivo se ainda não concluída)
 * Garante que a soma total reflita o somatório do tempo de permanência de cada etapa.
 */
export function getLiveKanbanDurationSeconds(task: Task): number {
  if (task.completedDurationSeconds != null && task.completedDurationSeconds > 0) {
    return Math.max(0, task.completedDurationSeconds - (task.totalPausedSeconds || 0));
  }

  const todo = getLiveTodoDurationSeconds(task);
  const inProgress = getLiveInProgressDurationSeconds(task);
  const delayed = getLiveDelayedDurationSeconds(task);
  return todo + inProgress + delayed;
}

/**
 * Retorna os segundos totais acumulados no status "A Fazer" (ao vivo se estiver em "todo" agora)
 * Congela quando a tarefa estiver pausada (aguardando cliente)
 */
export function getLiveTodoDurationSeconds(task: Task): number {
  let total = task.timeInTodoSeconds || 0;

  if (task.status === 'todo') {
    const stageStart = task.stageEnteredAt 
      ? new Date(task.stageEnteredAt).getTime() 
      : (task.createdAt ? new Date(task.createdAt).getTime() : Date.now());
    if (!isNaN(stageStart)) {
      const activeEnd = (task.isPaused && task.pausedAt)
        ? new Date(task.pausedAt).getTime()
        : Date.now();
      total += Math.max(0, Math.floor((activeEnd - stageStart) / 1000));
    }
  }

  return total;
}

/**
 * Retorna os segundos totais acumulados no status "Fazendo" (ao vivo se estiver em execução agora)
 * Congela quando a tarefa estiver pausada (aguardando cliente)
 */
export function getLiveInProgressDurationSeconds(task: Task): number {
  let total = task.timeInProgressSeconds || 0;

  if (task.status === 'in_progress') {
    const stageStart = task.stageEnteredAt 
      ? new Date(task.stageEnteredAt).getTime() 
      : (task.startedAt ? new Date(task.startedAt).getTime() : Date.now());
    if (!isNaN(stageStart)) {
      const activeEnd = (task.isPaused && task.pausedAt)
        ? new Date(task.pausedAt).getTime()
        : Date.now();
      total += Math.max(0, Math.floor((activeEnd - stageStart) / 1000));
    }
  }

  return total;
}

/**
 * Retorna os segundos totais que a tarefa acumulou em atraso (ao vivo se estiver atrasada agora)
 * Congela quando a tarefa estiver pausada (aguardando cliente)
 */
export function getLiveDelayedDurationSeconds(task: Task): number {
  let total = task.totalDelayedSeconds || 0;

  if (task.status === 'delayed') {
    const delayedStart = task.delayedAt 
      ? new Date(task.delayedAt).getTime() 
      : (task.stageEnteredAt ? new Date(task.stageEnteredAt).getTime() : Date.now());
    if (!isNaN(delayedStart)) {
      const activeEnd = (task.isPaused && task.pausedAt)
        ? new Date(task.pausedAt).getTime()
        : Date.now();
      total += Math.max(0, Math.floor((activeEnd - delayedStart) / 1000));
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

  // Se a tarefa estiver pausada (aguardando cliente/documentos)
  if (task.isPaused) {
    return {
      hasDeadline: true,
      deadlineFormatted: formattedDate,
      deadlineTimestamp,
      isBreached: false,
      status: 'warning',
      statusLabel: `Pausado: ${task.pausedReason || 'Aguardando Cliente'}`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      diffSeconds: 0,
      formattedDiff: 'Pausa (não conta atraso)',
    };
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

// ==================== AUDITORIA DE RESPONSABILIDADE & PASSAGEM DE BASTÃO ====================

export interface AssigneeMetricsSummary {
  assignee: string;
  businessSeconds: number;
  elapsedSeconds: number;
  formattedBusiness: string;
  formattedElapsed: string;
  transfersCount: number;
}

export interface FormattedAssigneeEvent {
  id: string;
  dateStr: string;       // Ex: "27/09 08:12"
  fullDateStr: string;   // Ex: "27/09/2026 às 08:12"
  assignee: string;
  transferredFrom?: string;
  action: AssigneeAction;
  actionLabel: string;
  durationWithPrevious?: {
    businessSeconds: number;
    elapsedSeconds: number;
    formattedBusiness: string;
    formattedElapsed: string;
  };
  note?: string;
}

export interface TaskAssigneeAudit {
  history: FormattedAssigneeEvent[];
  byAssignee: Record<string, AssigneeMetricsSummary>;
  bea: AssigneeMetricsSummary;
  vini: AssigneeMetricsSummary;
  totalWaitingClient: {
    businessSeconds: number;
    elapsedSeconds: number;
    formattedBusiness: string;
    formattedElapsed: string;
  };
}

/**
 * Cria uma nova transição de responsabilidade (passagem de bastão) entre Bea e Vini,
 * fechando o ciclo do operador anterior com a apuração exata de tempo útil e corrido.
 */
export function createHandoffTransition(
  task: Task,
  newAssignee: string,
  nowIso = new Date().toISOString()
): AssigneeTransition[] {
  const currentHistory: AssigneeTransition[] = task.assigneeHistory?.length
    ? [...task.assigneeHistory]
    : [
        {
          id: `assignee-init-${task.id}`,
          assignee: task.assignee || 'Bea',
          enteredAt: task.createdAt || nowIso,
          action: 'created',
        },
      ];

  const currentAssignee = task.assignee || 'Bea';
  if (currentAssignee === newAssignee) return currentHistory;

  // Fecha o período do responsável anterior
  const lastIndex = currentHistory.length - 1;
  if (lastIndex >= 0) {
    const lastItem = { ...currentHistory[lastIndex] };
    if (!lastItem.leftAt) {
      lastItem.leftAt = nowIso;
      lastItem.durationSeconds = calculateElapsedSeconds(lastItem.enteredAt, nowIso);
      lastItem.businessSeconds = calculateBusinessSeconds(lastItem.enteredAt, nowIso);
      currentHistory[lastIndex] = lastItem;
    }
  }

  // Registra a nova transição de recebimento
  currentHistory.push({
    id: `assignee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    assignee: newAssignee,
    transferredFrom: currentAssignee,
    enteredAt: nowIso,
    action: 'transferred',
  });

  return currentHistory;
}

/**
 * Fecha a última etapa do responsável quando a tarefa é concluída
 */
export function closeAssigneeOnCompletion(
  history: AssigneeTransition[],
  completedAt = new Date().toISOString()
): AssigneeTransition[] {
  if (!history || history.length === 0) return history;
  const updated = [...history];
  const lastIdx = updated.length - 1;
  const last = { ...updated[lastIdx] };

  if (!last.leftAt) {
    last.leftAt = completedAt;
    last.durationSeconds = calculateElapsedSeconds(last.enteredAt, completedAt);
    last.businessSeconds = calculateBusinessSeconds(last.enteredAt, completedAt);
    updated[lastIdx] = last;
  }

  return updated;
}

/**
 * Realiza a auditoria completa de responsabilidade e passagem de bastão da tarefa,
 * totalizando o tempo acumulado com cada pessoa (Bea vs. Vini) e tempo aguardando cliente.
 */
export function getTaskAssigneeAudit(task: Task): TaskAssigneeAudit {
  const now = new Date();
  const nowIso = now.toISOString();

  let rawHistory: AssigneeTransition[] = [];
  if (task.assigneeHistory && task.assigneeHistory.length > 0) {
    rawHistory = [...task.assigneeHistory];
  } else {
    rawHistory = [
      {
        id: `assignee-init-${task.id}`,
        assignee: task.assignee || 'Bea',
        enteredAt: task.createdAt || nowIso,
        action: 'created',
      },
    ];
  }

  const isDone = task.status === 'done';
  const completionTime = task.completedAt || nowIso;

  const totals: Record<string, { businessSeconds: number; elapsedSeconds: number; transfersCount: number }> = {
    Bea: { businessSeconds: 0, elapsedSeconds: 0, transfersCount: 0 },
    Vini: { businessSeconds: 0, elapsedSeconds: 0, transfersCount: 0 },
  };

  const formattedHistory: FormattedAssigneeEvent[] = [];

  for (let i = 0; i < rawHistory.length; i++) {
    const step = rawHistory[i];
    const isLast = i === rawHistory.length - 1;
    const startIso = step.enteredAt;
    const endIso = step.leftAt || (isLast ? (isDone ? completionTime : nowIso) : (rawHistory[i + 1]?.enteredAt || nowIso));

    const elapsed = step.durationSeconds != null
      ? step.durationSeconds
      : calculateElapsedSeconds(startIso, endIso);

    const business = step.businessSeconds != null
      ? step.businessSeconds
      : calculateBusinessSeconds(startIso, endIso);

    const name = step.assignee || 'Bea';
    if (!totals[name]) {
      totals[name] = { businessSeconds: 0, elapsedSeconds: 0, transfersCount: 0 };
    }
    totals[name].businessSeconds += business;
    totals[name].elapsedSeconds += elapsed;
    totals[name].transfersCount += 1;

    // Formatação de data amigável: DD/MM HH:mm
    const d = new Date(startIso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = !isNaN(d.getTime()) 
      ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      : '-';
    const fullDateStr = !isNaN(d.getTime()) ? d.toLocaleString('pt-BR') : '-';

    let actionLabel = '';
    if (step.action === 'created') {
      actionLabel = `${name} recebeu a tarefa`;
    } else if (step.action === 'transferred') {
      actionLabel = `${step.transferredFrom || 'Anterior'} passou para ${name}`;
    } else if (step.action === 'completed') {
      actionLabel = `${name} concluiu`;
    } else if (step.action === 'reopened') {
      actionLabel = `${name} reabriu a tarefa`;
    } else {
      actionLabel = `${name} assumiu a tarefa`;
    }

    formattedHistory.push({
      id: step.id || `handoff-${i}`,
      dateStr,
      fullDateStr,
      assignee: name,
      transferredFrom: step.transferredFrom,
      action: step.action,
      actionLabel,
      durationWithPrevious: {
        businessSeconds: business,
        elapsedSeconds: elapsed,
        formattedBusiness: formatBusinessDuration(business),
        formattedElapsed: formatDuration(elapsed),
      },
      note: step.note,
    });
  }

  // Se a tarefa já foi concluída e o último registro não é de conclusão
  if (isDone) {
    const lastOperator = task.assignee || (rawHistory[rawHistory.length - 1]?.assignee) || 'Bea';
    const compD = new Date(completionTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const compDateStr = !isNaN(compD.getTime())
      ? `${pad(compD.getDate())}/${pad(compD.getMonth() + 1)} ${pad(compD.getHours())}:${pad(compD.getMinutes())}`
      : '-';

    formattedHistory.push({
      id: `completed-event-${task.id}`,
      dateStr: compDateStr,
      fullDateStr: !isNaN(compD.getTime()) ? compD.toLocaleString('pt-BR') : '-',
      assignee: lastOperator,
      action: 'completed',
      actionLabel: `${lastOperator} concluiu a tarefa`,
    });
  }

  const byAssignee: Record<string, AssigneeMetricsSummary> = {};
  for (const [k, v] of Object.entries(totals)) {
    byAssignee[k] = {
      assignee: k,
      businessSeconds: v.businessSeconds,
      elapsedSeconds: v.elapsedSeconds,
      formattedBusiness: formatBusinessDuration(v.businessSeconds),
      formattedElapsed: formatDuration(v.elapsedSeconds),
      transfersCount: v.transfersCount,
    };
  }

  const livePausedSecs = getLivePausedSeconds(task);

  return {
    history: formattedHistory,
    byAssignee,
    bea: byAssignee['Bea'] || {
      assignee: 'Bea',
      businessSeconds: 0,
      elapsedSeconds: 0,
      formattedBusiness: '0m',
      formattedElapsed: '0m',
      transfersCount: 0,
    },
    vini: byAssignee['Vini'] || {
      assignee: 'Vini',
      businessSeconds: 0,
      elapsedSeconds: 0,
      formattedBusiness: '0m',
      formattedElapsed: '0m',
      transfersCount: 0,
    },
    totalWaitingClient: {
      businessSeconds: livePausedSecs,
      elapsedSeconds: livePausedSecs,
      formattedBusiness: formatBusinessDuration(livePausedSecs),
      formattedElapsed: formatDuration(livePausedSecs),
    },
  };
}

