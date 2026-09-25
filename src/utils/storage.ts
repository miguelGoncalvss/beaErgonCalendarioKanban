import type { Task, DayNote } from '../types';
import { formatDateKey } from './dateUtils';

const STORAGE_KEYS = {
  TASKS: 'beaergon_kanban_tasks_v1',
  NOTES: 'beaergon_calendar_notes_v1',
  COMPANIES: 'beaergon_companies_v1',
};

export const DEFAULT_COMPANIES: string[] = [
  'Alfa Comércio de Alimentos Ltda',
  'Beta Tech Inovações ME',
  'Padaria Central ME',
  'Silva & Santos Advocacia',
  'Delta Logística & Transportes',
  'Uso Interno / Escritório',
];

export function getInitialTasks(): Task[] {
  const today = new Date();
  const todayStr = formatDateKey(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrow);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  const yesterdayStr = formatDateKey(yesterday);

  return [
    {
      id: 'task-1',
      title: 'Fechamento da Folha de Pagamento',
      description: 'Lançamento de horas extras, benefícios e emissão dos holerites mensais.',
      status: 'todo',
      priority: 'high',
      dueDate: tomorrowStr,
      company: 'Alfa Comércio de Alimentos Ltda',
      tags: ['DP', 'Folha'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Apuração e Emissão de DAS (Simples Nacional)',
      description: 'Conferir faturamento fiscal do mês anterior e emitir guia de arrecadação.',
      status: 'todo',
      priority: 'medium',
      dueDate: tomorrowStr,
      company: 'Padaria Central ME',
      tags: ['Fiscal', 'Simples'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Conciliação Bancária e Extratos Financeiros',
      description: 'Cruzar extratos bancários com notas fiscais de entrada e saída.',
      status: 'in_progress',
      priority: 'high',
      dueDate: todayStr,
      company: 'Beta Tech Inovações ME',
      tags: ['Contábil', 'Conciliação'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: 'Apuração de ICMS e Envio do SPED Fiscal',
      description: 'Validar livros fiscais de entradas e saídas de transportes interestaduais.',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: todayStr,
      company: 'Delta Logística & Transportes',
      tags: ['Fiscal', 'SPED'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-5',
      title: 'Transmissão da DCTFWeb e Guia FGTS Digital',
      description: 'Transmissão realizada com sucesso após fechamento do eSocial.',
      status: 'done',
      priority: 'medium',
      dueDate: yesterdayStr,
      company: 'Silva & Santos Advocacia',
      tags: ['DP', 'DCTFWeb'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-6',
      title: 'Envio do Balancete Mensal e Relatório DRE',
      description: 'Prazo estipulado em contrato encerrou ontem; contatar cliente para assinar.',
      status: 'delayed',
      priority: 'urgent',
      dueDate: yesterdayStr,
      company: 'Alfa Comércio de Alimentos Ltda',
      tags: ['Contábil', 'Urgente'],
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getInitialNotes(): DayNote[] {
  const today = new Date();
  const todayStr = formatDateKey(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrow);

  return [
    {
      id: 'note-1',
      date: todayStr,
      title: 'Conciliação Bancária e Extratos Financeiros',
      content: 'Cruzar extratos bancários com notas fiscais de entrada e saída.',
      category: 'reuniao',
      company: 'Beta Tech Inovações ME',
      time: '10:00',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'note-2',
      date: todayStr,
      title: 'Apuração de ICMS e Envio do SPED Fiscal',
      content: 'Validar livros fiscais de entradas e saídas de transportes interestaduais.',
      category: 'urgente',
      company: 'Delta Logística & Transportes',
      time: '15:30',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'note-3',
      date: tomorrowStr,
      title: 'Fechamento da Folha de Pagamento',
      content: 'Lançamento de horas extras, benefícios e emissão dos holerites mensais.',
      category: 'lembrete',
      company: 'Alfa Comércio de Alimentos Ltda',
      time: '14:00',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function loadCompaniesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) {
      saveCompaniesToStorage(DEFAULT_COMPANIES);
      return DEFAULT_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_COMPANIES;
  } catch {
    return DEFAULT_COMPANIES;
  }
}

export function saveCompaniesToStorage(companies: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch (err) {
    console.error('Error saving companies to localStorage:', err);
  }
}

export function loadTasksFromStorage(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      const initial = getInitialTasks();
      saveTasksToStorage(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialTasks();
  }
}

export function saveTasksToStorage(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error saving tasks to localStorage:', err);
  }
}

export function loadNotesFromStorage(): DayNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) {
      const initial = getInitialNotes();
      saveNotesToStorage(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialNotes();
  }
}

export function saveNotesToStorage(notes: DayNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving notes to localStorage:', err);
  }
}
