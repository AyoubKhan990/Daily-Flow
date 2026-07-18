export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  timezone: string;
  startOfWeek: string;
  theme: string;
  streakRule: string;
  streakPercent: number;
  defaultPriority: string;
  defaultDuration: number;
  defaultReminder: string;
  dailyPlanningReminder: string;
  endOfDayReviewReminder: string;
  role: string;
  adminId: number | null;
  createdAt: string;
}

export interface Project {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  deadline: string | null;
  isArchived: boolean;
  createdAt: string;
  taskCount?: { pending: number; completed: number };
}

export interface Category {
  id: number;
  userId: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  date: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  dueTime: string | null; // HH:MM
  isAllDay: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  projectId: number | null;
  categoryId: number | null;
  tags: string[];
  estDuration: number; // in minutes
  actDuration: number; // in minutes
  notes: string | null;
  checklist: Subtask[];
  reminderTime: string | null; // YYYY-MM-DD HH:MM
  recurrenceRule: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
  parentTaskId: number | null;
  taskColor: string | null;
  taskOrder: number;
  completionDate: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: number;
  taskId: number;
  userId: number;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface DailyNote {
  id: number;
  userId: number;
  date: string;
  content: string | null;
  topThreeTasks: number[]; // task IDs
  dailyGoal: string | null;
  createdAt: string;
}

export interface DailyReview {
  id: number;
  userId: number;
  date: string;
  biggestAchievement: string | null;
  unfinishedReason: string | null;
  notesForTomorrow: string | null;
  createdAt: string;
}

export interface FocusSession {
  id: number;
  userId: number;
  taskId: number | null;
  duration: number;
  type: 'pomodoro' | 'short_break' | 'long_break';
  createdAt: string;
}

export interface Template {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface TemplateTask {
  id: number;
  templateId: number;
  title: string;
  description: string | null;
  priority: string;
  projectId: number | null;
  categoryId: number | null;
  estDuration: number;
  checklist: Subtask[];
  createdAt: string;
}
