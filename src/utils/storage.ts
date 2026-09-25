import type { Task, DayNote } from '../types';

const STORAGE_KEYS = {
  TASKS: 'beaergon_kanban_tasks_v1',
  NOTES: 'beaergon_calendar_notes_v1',
  COMPANIES: 'beaergon_companies_v1',
};

// Fictitious demo names to clean from previous sessions
const DEMO_FICTITIOUS_COMPANIES = [
  'Alfa Comércio de Alimentos Ltda',
  'Beta Tech Inovações ME',
  'Padaria Central ME',
  'Silva & Santos Advocacia',
  'Delta Logística & Transportes',
  'Uso Interno / Escritório',
];

export const DEFAULT_COMPANIES: string[] = [];

export function getInitialTasks(): Task[] {
  return [];
}

export function getInitialNotes(): DayNote[] {
  return [];
}

export function loadCompaniesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((c: string) => !DEMO_FICTITIOUS_COMPANIES.includes(c));
    }
    return [];
  } catch {
    return [];
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t: any) => !['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6'].includes(t.id));
    }
    return [];
  } catch {
    return [];
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((n: any) => !['note-1', 'note-2', 'note-3'].includes(n.id));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveNotesToStorage(notes: DayNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving notes to localStorage:', err);
  }
}
