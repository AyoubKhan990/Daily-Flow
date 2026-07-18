export const getTodayDateString = (timezone = 'UTC'): string => {
  // Respect user timezone if needed, otherwise local ISO date
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const getRelativeDateString = (offsetDays: number, baseDateStr?: string): string => {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  base.setDate(base.getDate() + offsetDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const date = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const formatFriendlyDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Inbox';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const date = parseInt(parts[2]);
  
  const d = new Date(year, month, date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getMonthName = (year: number, monthZeroIndexed: number): string => {
  const d = new Date(year, monthZeroIndexed, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getDaysInMonthGrid = (year: number, monthZeroIndexed: number, startOfWeek = 'monday') => {
  const firstDayOfMonth = new Date(year, monthZeroIndexed, 1);
  let startDayOffset = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday
  
  if (startOfWeek === 'monday') {
    // If start of week is Monday, we want Monday to be index 0
    // Standard: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    // Shifted: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    startDayOffset = startDayOffset === 0 ? 6 : startDayOffset - 1;
  }
  
  const totalSlots = 42; // 6 rows of 7 days
  const startDate = new Date(year, monthZeroIndexed, 1 - startDayOffset);
  const grid = [];
  
  for (let i = 0; i < totalSlots; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    
    grid.push({
      dateStr: `${y}-${m}-${d}`,
      dayNum: current.getDate(),
      isCurrentMonth: current.getMonth() === monthZeroIndexed,
      dateObj: current
    });
  }
  return grid;
};

export const getDaysInWeek = (dateStr: string, startOfWeek = 'monday') => {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const date = parseInt(parts[2]);
  const current = new Date(year, month, date);
  
  let currentDay = current.getDay();
  let offset = 0;
  
  if (startOfWeek === 'monday') {
    offset = currentDay === 0 ? -6 : 1 - currentDay;
  } else {
    offset = -currentDay;
  }
  
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() + offset);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    days.push({
      dateStr: `${y}-${m}-${day}`,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: `${y}-${m}-${day}` === getTodayDateString()
    });
  }
  
  return days;
};

export const isOverdue = (dateStr: string | null, status: string): boolean => {
  if (!dateStr) return false;
  if (status === 'completed' || status === 'skipped' || status === 'cancelled') return false;
  
  const todayStr = getTodayDateString();
  return dateStr < todayStr;
};
