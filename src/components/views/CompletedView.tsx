import React, { useState } from 'react';
import { CheckCircle2, Search, Trash2, Calendar, Folder, Tag, AlertCircle } from 'lucide-react';
import { Task, Project, Category } from '../../types.ts';
import { formatFriendlyDate } from '../../utils/dateUtils.ts';

interface CompletedViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  onTaskClick: (task: Task) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  tasks,
  projects,
  categories,
  onTaskClick,
  onQuickToggleComplete,
}) => {
  const completedList = tasks.filter(t => t.status === 'completed' && !t.isArchived);

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const filtered = completedList.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectId === null || t.projectId === projectId;
    const matchesCategory = categoryId === null || t.categoryId === categoryId;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const getProjectName = (projId: number | null) => {
    return projects.find(p => p.id === projId)?.name || 'General';
  };

  const getProjectColor = (projId: number | null) => {
    return projects.find(p => p.id === projId)?.color || '#a1a1aa';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          Completed Archive
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Review all your achievements, statistics, and completed daily notes historic pipelines.
        </p>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-3 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            id="completed-search-input"
            type="text"
            placeholder="Search completed backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-2 md:flex gap-3">
          <select
            id="completed-project-filter"
            value={projectId || ''}
            onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            id="completed-category-filter"
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <div
              id={`completed-task-card-${t.id}`}
              key={t.id}
              onClick={() => onTaskClick(t)}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3.5 hover:border-indigo-400 cursor-pointer transition-all"
            >
              {/* Completed check */}
              <button
                id={`completed-uncheck-btn-${t.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickToggleComplete(t); // Toggles back to pending/in-progress
                }}
                className="mt-0.5 w-5 h-5 bg-emerald-500 border border-emerald-500 rounded-full flex items-center justify-center shrink-0 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-zinc-400 dark:text-zinc-500 line-through truncate">{t.title}</h3>
                {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{t.description}</p>}
                
                <div className="flex flex-wrap items-center gap-2.5 mt-3 text-[10px] text-zinc-400 font-medium">
                  {t.date && (
                    <span className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-100 dark:border-zinc-850">
                      <Calendar className="w-3 h-3" /> {formatFriendlyDate(t.date)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProjectColor(t.projectId) }} />
                    {getProjectName(t.projectId)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
          <span className="text-4xl">🏅</span>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">No matching completed tasks</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Try adjusting search queries or select different project/category combinations!
          </p>
        </div>
      )}
    </div>
  );
};
