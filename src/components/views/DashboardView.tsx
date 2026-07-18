import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Folder,
  Tag,
  Check,
  ChevronRight,
  Repeat,
  Bell,
  CheckSquare
} from 'lucide-react';
import { Task, Project, Category } from '../../types.ts';
import { formatFriendlyDate, getTodayDateString, isOverdue } from '../../utils/dateUtils.ts';

interface DashboardViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  streakInfo: { current: number; longest: number };
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
  onRescheduleTask: (task: Task, newDate: string) => Promise<void>;
  onCancelTask: (task: Task) => Promise<void>;
  token: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  projects,
  categories,
  streakInfo,
  onTaskClick,
  onAddTaskClick,
  onQuickToggleComplete,
  onRescheduleTask,
  onCancelTask,
  token,
}) => {
  const [nlpText, setNlpText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  // Filter categories of tasks
  const todayTasks = tasks.filter(t => t.date === todayStr && !t.isArchived);
  const completedToday = todayTasks.filter(t => t.status === 'completed');
  const pendingToday = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  
  const allOverdue = tasks.filter(t => isOverdue(t.date, t.status) && !t.isArchived);

  // Focus time sum today
  const totalFocusSpent = todayTasks.reduce((acc, t) => acc + (t.actDuration || 0), 0);
  
  // Completion percentage
  const completionPercent = todayTasks.length > 0 
    ? Math.round((completedToday.length / todayTasks.length) * 100) 
    : 0;

  // Group today's tasks
  const getTaskPeriod = (task: Task) => {
    if (task.isAllDay || !task.startTime) return 'anytime';
    const hour = parseInt(task.startTime.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const morningTasks = todayTasks.filter(t => getTaskPeriod(t) === 'morning');
  const afternoonTasks = todayTasks.filter(t => getTaskPeriod(t) === 'afternoon');
  const eveningTasks = todayTasks.filter(t => getTaskPeriod(t) === 'evening');
  const anytimeTasks = todayTasks.filter(t => getTaskPeriod(t) === 'anytime');

  // Handle Natural Language Input
  const handleNlpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim() || !token) return;
    setParsing(true);
    setNlpError(null);

    try {
      const res = await fetch('/api/parse-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: nlpText })
      });
      if (res.ok) {
        const parsed = await res.json();
        // Open task modal with prefilled data
        setNlpText('');
        onAddTaskClick(parsed.date || todayStr);
        // We can pass details to the parent App component to open with prefilled fields
        // To keep the code extremely clean and robust, we can simply save it or trigger prefilled modal.
        // Let's allow the user to see the modal open up prefilled!
        // We'll expose this by storing "prefilled task draft" in App.tsx!
        // For now we pre-open TaskModal. Let's send details back:
        const customEvent = new CustomEvent('openPrefilledTask', { detail: parsed });
        window.dispatchEvent(customEvent);
      } else {
        const err = await res.json();
        setNlpError(err.error || 'Failed to parse natural language.');
      }
    } catch (error) {
      console.error('NLP parse failed:', error);
      setNlpError('Parsing failed. Creating a manual task...');
      onAddTaskClick(todayStr);
    } finally {
      setParsing(false);
    }
  };

  const getProjectName = (projId: number | null) => {
    return projects.find(p => p.id === projId)?.name || 'General';
  };

  const getProjectColor = (projId: number | null) => {
    return projects.find(p => p.id === projId)?.color || '#a1a1aa';
  };

  const getCategoryName = (catId: number | null) => {
    return categories.find(c => c.id === catId)?.name;
  };

  const getCategoryColor = (catId: number | null) => {
    return categories.find(c => c.id === catId)?.color || '#10b981';
  };

  const renderTaskCard = (t: Task) => {
    const isComp = t.status === 'completed';
    const subtaskCompletedCount = t.checklist?.filter(c => c.completed).length || 0;
    const subtaskTotalCount = t.checklist?.length || 0;

    return (
      <div 
        id={`task-card-${t.id}`}
        key={t.id} 
        className={`group bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/85 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all flex items-start gap-3.5`}
      >
        {/* Complete Checkbox Circle */}
        <button
          id={`toggle-task-complete-btn-${t.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickToggleComplete(t);
          }}
          className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
            isComp 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-transparent hover:text-emerald-500'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Task Details Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(t)}>
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-sm truncate ${isComp ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
              {t.title}
            </h4>
            
            {/* Priority Badge */}
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
              t.priority === 'urgent' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
              t.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
              t.priority === 'low' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
            }`}>
              {t.priority}
            </span>
          </div>

          {/* Description preview */}
          {t.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
              {t.description}
            </p>
          )}

          {/* Indicators row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {/* Time */}
            {t.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {t.startTime} {t.dueTime && ` - ${t.dueTime}`}
              </span>
            )}
            
            {/* Project Indicator */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProjectColor(t.projectId) }} />
              {getProjectName(t.projectId)}
            </span>

            {/* Category Indicator */}
            {t.categoryId && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.categoryId) }} />
                {getCategoryName(t.categoryId)}
              </span>
            )}

            {/* Checklist count */}
            {subtaskTotalCount > 0 && (
              <span className="flex items-center gap-1 text-indigo-500 font-semibold bg-indigo-50/50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded-md">
                <CheckSquare className="w-3 h-3" />
                {subtaskCompletedCount}/{subtaskTotalCount}
              </span>
            )}

            {/* Recurrence Indicator */}
            {t.recurrenceRule !== 'none' && (
              <span className="flex items-center gap-1 text-amber-500">
                <Repeat className="w-3 h-3" />
                {t.recurrenceRule}
              </span>
            )}

            {/* Reminder Indicator */}
            {t.reminderTime && (
              <span className="flex items-center gap-1 text-purple-500">
                <Bell className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10">
      
      {/* Upper header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
            DailyFlow Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatFriendlyDate(todayStr)}
          </p>
        </div>
        
        {/* NLP Input Quick Capture */}
        <form onSubmit={handleNlpSubmit} className="flex-1 max-w-lg w-full">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <input
              id="nlp-capture-input"
              type="text"
              placeholder="e.g. Call dentist tomorrow at 2 PM (AI Parse)..."
              value={nlpText}
              disabled={parsing}
              onChange={(e) => setNlpText(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs"
            />
            <button
              id="nlp-submit-btn"
              type="submit"
              disabled={parsing || !nlpText.trim()}
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-all"
            >
              {parsing ? 'Parsing...' : 'Capture'}
            </button>
          </div>
          {nlpError && <p className="text-[11px] text-red-500 mt-1 pl-1">{nlpError}</p>}
        </form>
      </div>

      {/* Productivity Scoreboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/85 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-2xl font-display font-bold text-slate-900 dark:text-white">{todayTasks.length}</span>
            <h3 className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Today's Tasks</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/85 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{completedToday.length}</span>
            <h3 className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Completed</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/85 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400">{completionPercent}%</span>
            <h3 className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Completion Rate</h3>
          </div>
          <div className="relative w-10 h-10 shrink-0">
            {/* SVG circle progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="20" cy="20" r="16" className="stroke-slate-100 dark:stroke-slate-800 fill-transparent stroke-[3.5]" />
              <circle cx="20" cy="20" r="16" className="stroke-indigo-500 fill-transparent stroke-[3.5]" strokeDasharray={100} strokeDashoffset={100 - completionPercent} />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/85 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-2xl font-display font-bold text-amber-500">{streakInfo.current} days</span>
            <h3 className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Active Streak</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
            <Zap className="w-5 h-5 fill-current" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left column (Today's Scheduled Tasks) / Right Column (Overdue and Summary Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scheduled list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Today's Schedule</h3>
            <button
              id="add-task-today-btn"
              onClick={() => onAddTaskClick(todayStr)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 px-3 py-1.5 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {todayTasks.length > 0 ? (
            <div className="space-y-6">
              {/* Morning (before 12 PM) */}
              {morningTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    🌅 Morning Routine
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {morningTasks.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {/* Afternoon (12 PM - 5 PM) */}
              {afternoonTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    ☀️ Afternoon Focus
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {afternoonTasks.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {/* Evening (after 5 PM) */}
              {eveningTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    🌆 Evening Winddown
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {eveningTasks.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {/* Anytime tasks */}
              {anytimeTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    🧠 Anytime / Unscheduled
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {anytimeTasks.map(renderTaskCard)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6">
              <span className="text-4xl">🗓️</span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">Your day is entirely clear</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Prepare your morning routine, import an execution template, or capture a natural-language task!
              </p>
              <button
                id="get-started-add-task-btn"
                onClick={() => onAddTaskClick(todayStr)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
              >
                Plan your first task
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar columns: Overdue list & stats */}
        <div className="space-y-6">
          {/* Overdue Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              Overdue Backlog ({allOverdue.length})
            </h3>
            
            {allOverdue.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {allOverdue.map(t => (
                  <div key={t.id} className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 cursor-pointer" onClick={() => onTaskClick(t)}>
                        {t.title}
                      </h4>
                      <span className="text-[9px] text-red-600 font-bold shrink-0">{t.date}</span>
                    </div>

                    {/* Quick recovery buttons */}
                    <div className="flex gap-1 pt-1.5">
                      <button
                        id={`overdue-complete-btn-${t.id}`}
                        onClick={() => onQuickToggleComplete(t)}
                        className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        id={`overdue-today-btn-${t.id}`}
                        onClick={() => onRescheduleTask(t, todayStr)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        id={`overdue-tomorrow-btn-${t.id}`}
                        onClick={() => {
                          const tomorrowStr = getTodayDateString(); // we can calculate relative
                          const parts = tomorrowStr.split('-');
                          const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                          d.setDate(d.getDate() + 1);
                          const tomorrowFormatted = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                          onRescheduleTask(t, tomorrowFormatted);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Tomorrow
                      </button>
                      <button
                        id={`overdue-cancel-btn-${t.id}`}
                        onClick={() => onCancelTask(t)}
                        className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl">
                <span className="text-xl">✨</span>
                <p className="text-xs text-slate-500 mt-1">Excellent! No overdue tasks.</p>
              </div>
            )}
          </div>

          {/* Quick Stats overview */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-md">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-indigo-100">Productive Daily Score</h3>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-5xl font-display font-extrabold">{completionPercent}</span>
              <span className="text-indigo-200 text-lg">pts</span>
            </div>
            <p className="text-xs text-indigo-100 mt-2">
              Based on completed items and active daily streaks. Complete high-priority items to secure points!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
