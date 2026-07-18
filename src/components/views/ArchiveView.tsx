import React from 'react';
import { Archive, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Task } from '../../types.ts';
import { formatFriendlyDate } from '../../utils/dateUtils.ts';

interface ArchiveViewProps {
  tasks: Task[];
  onRestoreTask: (task: Task) => Promise<void>;
  onPermanentDeleteTask: (id: number) => Promise<void>;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  tasks,
  onRestoreTask,
  onPermanentDeleteTask,
}) => {
  const archivedList = tasks.filter(t => t.isArchived);

  const handlePermanentDelete = (id: number) => {
    if (confirm('🚨 Warning: This operation is permanent and irreversible! It will erase this task and its logs from the database completely. Are you sure you want to proceed?')) {
      onPermanentDeleteTask(id);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Archive className="w-8 h-8 text-amber-500" />
          Soft-Deleted Archive
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Archived tasks are retained to ensure consistent productivity and focus stats. You can safely restore or clear them here.
        </p>
      </div>

      {archivedList.length > 0 ? (
        <div className="space-y-3.5 max-w-2xl">
          {archivedList.map(t => (
            <div
              id={`archived-task-row-${t.id}`}
              key={t.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 truncate">{t.title}</h3>
                <div className="flex gap-2 text-[10px] text-zinc-400 mt-1">
                  {t.date && <span>Scheduled: {formatFriendlyDate(t.date)}</span>}
                  <span>•</span>
                  <span className="uppercase font-bold">{t.priority}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id={`restore-archived-task-btn-${t.id}`}
                  onClick={() => onRestoreTask(t)}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl transition-colors"
                  title="Restore Task"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  id={`permanent-delete-btn-${t.id}`}
                  onClick={() => handlePermanentDelete(t.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl transition-colors"
                  title="Permanently Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
          <span className="text-4xl">🗑️</span>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">Archive is empty</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            You don't have any archived or soft-deleted tasks at the moment.
          </p>
        </div>
      )}
    </div>
  );
};
