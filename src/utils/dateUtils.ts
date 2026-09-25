export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_FULL_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string; // "YYYY-MM-DD"
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isDateOverdue(dueDateString?: string): boolean {
  if (!dueDateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dueDateString.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export function getDaysForMonth(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const totalDaysCurrentMonth = lastDayOfMonth.getDate();

  const days: CalendarDay[] = [];

  // Trailing days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date: d,
      dayNumber: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dateKey: formatDateKey(d),
    });
  }

  // Days of the current month
  for (let day = 1; day <= totalDaysCurrentMonth; day++) {
    const d = new Date(year, month, day);
    days.push({
      date: d,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      dateKey: formatDateKey(d),
    });
  }

  // Leading days of the next month to complete standard grid (multiple of 7, up to 35 or 42)
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const d = new Date(year, month + 1, day);
    days.push({
      date: d,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dateKey: formatDateKey(d),
    });
  }

  // If grid is only 5 rows (35 days) or less, make it 6 rows (42) for consistent layout height
  if (days.length === 35) {
    const lastDayNext = days[days.length - 1].dayNumber;
    for (let day = 1; day <= 7; day++) {
      const d = new Date(year, month + 1, lastDayNext + day);
      days.push({
        date: d,
        dayNumber: lastDayNext + day,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        dateKey: formatDateKey(d),
      });
    }
  }

  return days;
}

export function formatFriendlyDate(dateKey: string): string {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${day} de ${MONTH_NAMES_PT[date.getMonth()]} de ${year}`;
}
