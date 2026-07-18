import React from 'react';
import { Inbox, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Task } from '../../types.ts';
import { getTodayDateString } from '../../utils/dateUtils.ts';

interface InboxViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
  onRescheduleTask: (task: Task, newDate: string) => Promise<void>;
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  onTaskClick,
  onAddTaskClick,
  onQuickToggleComplete,
  onRescheduleTask,
}) => {
  const todayStr = getTodayDateString();
  const inboxTasks = tasks.filter(t => !t.date && !t.isArchived && t.status !== 'completed');

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-8 h-8 text-indigo-500" />
            Inbox / Quick Capture
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Capture raw ideas, scratchpads, or tasks without dates. Organize them when you are ready.
          </p>
        </div>
        <button
          id="add-inbox-task-btn"
          onClick={() => onAddTaskClick(null)}
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
        >
          <Plus className="w-4 h-4" /> Quick Capture
        </button>
      </div>

      {inboxTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inboxTasks.map((t) => (
            <div
              id={`inbox-task-card-${t.id}`}
              key={t.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-start gap-3"
            >
              <button
                id={`inbox-toggle-complete-btn-${t.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickToggleComplete(t);
                }}
                className="mt-0.5 w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition-colors"
              >
                <Check className="w-3.5 h-3.5 fill-current" />
              </button>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(t)}>
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{t.title}</h3>
                {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{t.description}</p>}
                
                {/* Organize buttons */}
                <div className="flex gap-1.5 mt-3 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                  <button
                    id={`inbox-schedule-today-btn-${t.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRescheduleTask(t, todayStr);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <Calendar className="w-3 h-3" /> Schedule Today
                  </button>
                  <button
                    id={`inbox-schedule-tomorrow-btn-${t.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const parts = todayStr.split('-');
                      const tomorrow = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])+1);
                      const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
                      onRescheduleTask(t, tStr);
                    }}
                    className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-colors"
                  >
                    Schedule Tomorrow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
          <span className="text-4xl">📥</span>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">Inbox is completely clean</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Everything is scheduled! Catch quick ideas, task fragments, or brainstorming points before you forget them.
          </p>
        </div>
      )}
    </div>
  );
};

// Simple embedded Check SVG component
const Check = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
