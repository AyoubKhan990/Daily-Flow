import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// 1. Users / Profiles Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  photoUrl: text('photo_url'),
  timezone: text('timezone').default('UTC'),
  startOfWeek: text('start_of_week').default('monday'), // 'monday', 'sunday'
  theme: text('theme').default('system'), // 'light', 'dark', 'system'
  
  // Streak Rules
  streakRule: text('streak_rule').default('one_completed'), // 'one_completed', 'percent_completed'
  streakPercent: integer('streak_percent').default(80), // e.g. 80% completion rate for streak eligibility

  // Default Task Settings
  defaultPriority: text('default_priority').default('medium'),
  defaultDuration: integer('default_duration').default(30), // in minutes
  defaultReminder: text('default_reminder').default('none'), // 'none', 'at_time', '15_min', '30_min', '1_hour'
  
  // Reminders Config
  dailyPlanningReminder: text('daily_planning_reminder').default('08:00'), // HH:MM or 'none'
  endOfDayReviewReminder: text('end_of_day_review_reminder').default('18:00'), // HH:MM or 'none'
  
  // Upcoming Tasks Email Settings
  upcomingTasksEmailEnabled: boolean('upcoming_tasks_email_enabled').default(false),
  upcomingTasksEmailAddress: text('upcoming_tasks_email_address'),
  upcomingTasksEmailTime: text('upcoming_tasks_email_time').default('09:00'), // HH:MM
  
  // Admin & Team Roles
  role: text('role').default('member').notNull(), // 'admin', 'member'
  adminId: integer('admin_id'), // References users.id (the admin/manager)

  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Projects Table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6366f1'), // hex code
  icon: text('icon').default('Folder'), // lucide icon name
  deadline: text('deadline'), // YYYY-MM-DD
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Categories Table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color').default('#10b981'), // hex code
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Tasks Table
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  
  // Dates and Times
  date: text('date'), // YYYY-MM-DD (null means Inbox/Quick Capture)
  startTime: text('start_time'), // HH:MM
  dueTime: text('due_time'), // HH:MM
  isAllDay: boolean('is_all_day').default(false).notNull(),
  
  // Categorization / Settings
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'urgent'
  status: text('status').default('pending').notNull(), // 'pending', 'in_progress', 'completed', 'skipped', 'cancelled'
  
  projectId: integer('project_id')
    .references(() => projects.id, { onDelete: 'set null' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  
  tags: jsonb('tags').default('[]'), // JSON Array of strings
  estDuration: integer('est_duration').default(0).notNull(), // in minutes
  actDuration: integer('act_duration').default(0).notNull(), // in minutes
  notes: text('notes'),
  
  // Checklist / Subtasks: JSON array of { id: string, title: string, completed: boolean }
  checklist: jsonb('checklist').default('[]'),
  
  reminderTime: text('reminder_time'), // YYYY-MM-DD HH:MM
  
  // Recurrence rule: 'none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'
  recurrenceRule: text('recurrence_rule').default('none').notNull(),
  parentTaskId: integer('parent_task_id'), // Self-reference for recurring copies or templates
  
  taskColor: text('task_color'), // override color
  taskOrder: integer('task_order').default(0).notNull(),
  
  completionDate: text('completion_date'), // YYYY-MM-DD HH:MM
  
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  action: text('action').notNull(), // 'created', 'status_changed', 'edited', 'date_changed', 'priority_changed', etc.
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Daily Notes Table (planning / daily goals)
export const dailyNotes = pgTable('daily_notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  content: text('content'),
  topThreeTasks: jsonb('top_three_tasks').default('[]'), // array of task ids
  dailyGoal: text('daily_goal'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Daily Reviews Table (end-of-day review)
export const dailyReviews = pgTable('daily_reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  biggestAchievement: text('biggest_achievement'),
  unfinishedReason: text('unfinished_reason'),
  notesForTomorrow: text('notes_for_tomorrow'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Focus Sessions Table
export const focusSessions = pgTable('focus_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: integer('task_id')
    .references(() => tasks.id, { onDelete: 'set null' }),
  duration: integer('duration').notNull(), // in minutes
  type: text('type').default('pomodoro').notNull(), // 'pomodoro', 'short_break', 'long_break'
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Task Templates Table
export const templates = pgTable('templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Template Tasks Table
export const templateTasks = pgTable('template_tasks', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id')
    .references(() => templates.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').default('medium').notNull(),
  projectId: integer('project_id'),
  categoryId: integer('category_id'),
  estDuration: integer('est_duration').default(0).notNull(),
  checklist: jsonb('checklist').default('[]'), // JSON array of subtasks
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Email Logs Table
export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  status: text('status').default('sent').notNull(), // 'sent', 'failed', 'simulated'
});

// Relations Definitions
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  categories: many(categories),
  tasks: many(tasks),
  dailyNotes: many(dailyNotes),
  dailyReviews: many(dailyReviews),
  focusSessions: many(focusSessions),
  templates: many(templates),
  emailLogs: many(emailLogs),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  category: one(categories, { fields: [tasks.categoryId], references: [categories.id] }),
  activityLogs: many(activityLogs),
  focusSessions: many(focusSessions),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  task: one(tasks, { fields: [activityLogs.taskId], references: [tasks.id] }),
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const dailyNotesRelations = relations(dailyNotes, ({ one }) => ({
  user: one(users, { fields: [dailyNotes.userId], references: [users.id] }),
}));

export const dailyReviewsRelations = relations(dailyReviews, ({ one }) => ({
  user: one(users, { fields: [dailyReviews.userId], references: [users.id] }),
}));

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, { fields: [focusSessions.userId], references: [users.id] }),
  task: one(tasks, { fields: [focusSessions.taskId], references: [tasks.id] }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
  templateTasks: many(templateTasks),
}));

export const templateTasksRelations = relations(templateTasks, ({ one }) => ({
  template: one(templates, { fields: [templateTasks.templateId], references: [templates.id] }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, { fields: [emailLogs.userId], references: [users.id] }),
}));
