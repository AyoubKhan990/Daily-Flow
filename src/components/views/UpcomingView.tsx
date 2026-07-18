import React from 'react';
import { CalendarDays, Plus, Calendar, Clock, Check } from 'lucide-react';
import { Task, Project, Category } from '../../types.ts';
import { getTodayDateString, getRelativeDateString, formatFriendlyDate } from '../../utils/dateUtils.ts';

interface UpcomingViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
}

export const UpcomingView: React.FC<UpcomingViewProps> = ({
  tasks,
  projects,
  categories,
  onTaskClick,
  onAddTaskClick,
  onQuickToggleComplete,
}) => {
  const todayStr = getTodayDateString();
  const tomorrowStr = getRelativeDateString(1);
  const weekLimitStr = getRelativeDateString(7);

  // Future tasks
  const futureTasks = tasks.filter(t => t.date && t.date > todayStr && !t.isArchived && t.status !== 'completed');

  const tomorrowTasks = futureTasks.filter(t => t.date === tomorrowStr);
  const next7DaysTasks = futureTasks.filter(t => t.date! > tomorrowStr && t.date! <= weekLimitStr);
  const beyondTasks = futureTasks.filter(t => t.date! > weekLimitStr);

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

  const renderUpcomingCard = (t: Task) => {
    return (
      <div
        id={`upcoming-task-card-${t.id}`}
        key={t.id}
        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-start gap-3 cursor-pointer"
        onClick={() => onTaskClick(t)}
      >
        <button
          id={`upcoming-toggle-complete-btn-${t.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickToggleComplete(t);
          }}
          className="mt-0.5 w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition-colors"
        >
          <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-500" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{t.title}</h4>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{t.date}</span>
          </div>
          {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{t.description}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-zinc-400 font-medium">
            {t.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t.startTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProjectColor(t.projectId) }} />
              {getProjectName(t.projectId)}
            </span>
            {t.categoryId && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.categoryId) }} />
                {getCategoryName(t.categoryId)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-indigo-500" />
            Upcoming Commitments
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Get a birds-eye view of your schedules, workflows, and commitments. Keep preparing!
          </p>
        </div>
        <button
          id="add-upcoming-task-btn"
          onClick={() => onAddTaskClick(tomorrowStr)}
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
        >
          <Plus className="w-4 h-4" /> Schedule Future Task
        </button>
      </div>

      {futureTasks.length > 0 ? (
        <div className="space-y-6">
          
          {/* Tomorrow */}
          {tomorrowTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                🌅 Tomorrow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tomorrowTasks.map(renderUpcomingCard)}
              </div>
            </div>
          )}

          {/* Next 7 days */}
          {next7DaysTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                🗓️ Next 7 Days (Week Ahead)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {next7DaysTasks.map(renderUpcomingCard)}
              </div>
            </div>
          )}

          {/* Beyond */}
          {beyondTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                🚀 Beyond (Distant Future)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {beyondTasks.map(renderUpcomingCard)}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
          <span className="text-4xl">🚀</span>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">Future horizon is clear</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            You don't have any future tasks scheduled. Planning ahead increases peace of mind and output consistency.
          </p>
        </div>
      )}
    </div>
  );
};
