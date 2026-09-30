import type { Task } from '../types';
import { formatDateKey } from './dateUtils.ts';

export interface KnownOperatorInfo {
  id?: string;
  name: string;
  displayName?: string;
  roleTitle?: string;
  departmentName?: string;
  avatarUrl?: string;
  colorTheme?: string;
}

export interface OperatorWorkload {
  operator: string;
  displayName?: string;
  roleTitle?: string;
  departmentName?: string;
  avatarUrl?: string;
  colorTheme?: string;
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
  operators: OperatorWorkload[];
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
    knownOperators?: (string | KnownOperatorInfo)[];
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
  const totalActiveCount = activeTasks.length;

  // Mapa de operadores cadastrados / identificados
  const operatorMap = new Map<string, KnownOperatorInfo>();
  operatorMap.set('Bea', {
    name: 'Bea',
    displayName: 'Beatriz (Bea)',
    roleTitle: 'Operadora Contábil & Fiscal',
    colorTheme: 'purple',
  });
  operatorMap.set('Vini', {
    name: 'Vini',
    displayName: 'Vinicius (Vini)',
    roleTitle: 'Operador Contábil & Fiscal',
    colorTheme: 'sky',
  });

  // Registra operadores fornecidos explicitamente (ex: membros da organização / chefes)
  if (options?.knownOperators && Array.isArray(options.knownOperators)) {
    for (const op of options.knownOperators) {
      if (typeof op === 'string') {
        const trimmed = op.trim();
        if (trimmed && !operatorMap.has(trimmed)) {
          operatorMap.set(trimmed, {
            name: trimmed,
            displayName: trimmed,
            roleTitle: 'Membro da Equipe',
          });
        }
      } else if (op && typeof op === 'object' && 'name' in op && op.name) {
        const opObj = op as KnownOperatorInfo;
        const trimmedName = opObj.name.trim();
        if (trimmedName) {
          const existing = operatorMap.get(trimmedName) || { name: trimmedName, roleTitle: 'Membro da Equipe' };
          operatorMap.set(trimmedName, {
            ...existing,
            ...opObj,
            name: trimmedName,
            displayName: opObj.displayName || trimmedName,
            roleTitle: opObj.roleTitle || existing.roleTitle || 'Membro da Equipe',
          });
        }
      }
    }
  }

  // Registra operadores presentes nas tarefas que ainda não estejam no mapa
  for (const t of safeTasks) {
    const rawAssignee = t.assignee?.trim();
    if (rawAssignee && !operatorMap.has(rawAssignee)) {
      operatorMap.set(rawAssignee, {
        name: rawAssignee,
        displayName: rawAssignee,
        roleTitle: 'Membro da Equipe',
      });
    }
  }

  // Paleta de temas de cores para operadores adicionais
  const extraThemes = ['emerald', 'amber', 'indigo', 'rose', 'teal', 'cyan', 'violet'];
  let colorIdx = 0;

  // Calcula estatísticas para todos os operadores identificados
  const operators: OperatorWorkload[] = Array.from(operatorMap.values()).map((info) => {
    const opName = info.name;

    // Tarefas ativas e concluídas deste operador (tarefas sem assignee contam para Bea por padrão)
    const opActive = activeTasks.filter((t) => {
      const assigned = t.assignee?.trim() || 'Bea';
      return assigned === opName;
    });

    const opCompleted = completedTasks.filter((t) => {
      const assigned = t.assignee?.trim() || 'Bea';
      return assigned === opName;
    });

    const opActiveCount = opActive.length;
    const percentage = totalActiveCount > 0 
      ? Math.round((opActiveCount / totalActiveCount) * 100) 
      : 0;

    const theme = info.colorTheme || extraThemes[colorIdx++ % extraThemes.length];

    return {
      operator: opName,
      displayName: info.displayName || opName,
      roleTitle: info.roleTitle || 'Membro da Equipe',
      departmentName: info.departmentName,
      avatarUrl: info.avatarUrl,
      colorTheme: theme,
      totalActive: opActiveCount,
      todoCount: opActive.filter((t) => t.status === 'todo').length,
      inProgressCount: opActive.filter((t) => t.status === 'in_progress').length,
      delayedCount: opActive.filter((t) => t.status === 'delayed' || (t.dueDate && t.dueDate < todayKey)).length,
      pausedCount: opActive.filter((t) => t.isPaused).length,
      completedCount: opCompleted.length,
      percentageOfActive: percentage,
    };
  });

  // Garante objetos de compatibilidade legada para Bea e Vini
  const beaWorkload = operators.find((o) => o.operator === 'Bea') || {
    operator: 'Bea',
    displayName: 'Beatriz (Bea)',
    roleTitle: 'Operadora Contábil & Fiscal',
    colorTheme: 'purple',
    totalActive: 0,
    todoCount: 0,
    inProgressCount: 0,
    delayedCount: 0,
    pausedCount: 0,
    completedCount: 0,
    percentageOfActive: 0,
  };

  const viniWorkload = operators.find((o) => o.operator === 'Vini') || {
    operator: 'Vini',
    displayName: 'Vinicius (Vini)',
    roleTitle: 'Operador Contábil & Fiscal',
    colorTheme: 'sky',
    totalActive: 0,
    todoCount: 0,
    inProgressCount: 0,
    delayedCount: 0,
    pausedCount: 0,
    completedCount: 0,
    percentageOfActive: 0,
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
    if (beaWorkload.percentageOfActive >= 65) {
      workloadBalance = 'bea_heavy';
    } else if (viniWorkload.percentageOfActive >= 65) {
      workloadBalance = 'vini_heavy';
    }
  }

  return {
    totalActive: totalActiveCount,
    totalCompleted: completedTasks.length,
    operators,
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
