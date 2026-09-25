export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'delayed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface StageTransition {
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  enteredAt: string;
  leftAt?: string;
  durationSeconds?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm - "Até quando deve ser feito?"
  tags: string[];
  company?: string; // Empresa / Cliente (Setor Contábil)
  color?: string; // Faixa de cor / tag visual personalizada (Hex code ou nome)
  createdAt: string;
  updatedAt?: string;
  completedAt?: string; // Data/hora de conclusão
  delayedAt?: string; // Data/hora em que entrou em atraso
  totalDelayedSeconds?: number; // Tempo total acumulado em atraso (segundos)
  completedDurationSeconds?: number; // Tempo total no Kanban até ser concluída (segundos)
  isMonthlyRecurring?: boolean;
  recurringGroupId?: string;
  // Metadados de tempo e auditoria da administração
  stageEnteredAt?: string; // Data/hora em que entrou no estágio atual
  startedAt?: string; // Data/hora do início da execução ("Fazendo")
  timeInTodoSeconds?: number; // Tempo acumulado em "A Fazer"
  timeInProgressSeconds?: number; // Tempo acumulado em "Fazendo"
  stageHistory?: StageTransition[]; // Histórico detalhado de transições
}

export type NoteCategory = 'geral' | 'lembrete' | 'reuniao' | 'ideia' | 'urgente';

export interface DayNote {
  id: string;
  taskId?: string;
  date: string; // YYYY-MM-DD
  title: string;
  content?: string;
  category: NoteCategory;
  company?: string; // Empresa / Cliente (Setor Contábil)
  color?: string; // Faixa de cor / tag visual personalizada (Hex code ou nome)
  time?: string; // HH:mm
  isCompleted?: boolean;
  createdAt: string;
  isMonthlyRecurring?: boolean;
  recurringGroupId?: string;
}

export interface ColumnDefinition {
  id: TaskStatus;
  title: string;
  subtitle: string;
  color: {
    bg: string;
    border: string;
    headerBg: string;
    badge: string;
    accent: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

