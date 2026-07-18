import React, { useState } from 'react';
import { Folder, Plus, FolderPlus, Trash2, Calendar, Target, Archive, RefreshCw } from 'lucide-react';
import { Project, Task } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onSaveProject: (data: { name: string; description: string; color: string; deadline: string | null; targetHours: number | null }) => Promise<void>;
  onArchiveProject: (id: number) => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onSaveProject,
  onArchiveProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [deadline, setDeadline] = useState('');
  const [targetHours, setTargetHours] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSaveProject({
        name,
        description,
        color,
        deadline: deadline || null,
        targetHours: targetHours ? parseInt(targetHours) : null,
      });
      setName('');
      setDescription('');
      setColor('#6366f1');
      setDeadline('');
      setTargetHours('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  const colorsList = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Folder className="w-8 h-8 text-indigo-500" />
            Projects Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Group your tasks, monitor milestones, and allocate hours to your personal & professional goals.
          </p>
        </div>
        <button
          id="toggle-add-project-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
        >
          {showAddForm ? 'Close panel' : 'Create Project'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 max-w-xl animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-indigo-500" /> New Project Workspace
          </h3>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Project Name *</label>
              <input
                id="project-name-input"
                type="text"
                placeholder="e.g. DailyFlow Marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Hex Theme Color</label>
              <div className="flex gap-1.5 pt-1">
                {colorsList.map(c => (
                  <button
                    id={`project-color-dot-${c}`}
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border transition-all ${color === c ? 'scale-110 ring-2 ring-indigo-500/30 border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">Description</label>
            <textarea
              id="project-desc-input"
              placeholder="Record context, core objectives, and goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Target Hours</label>
              <input
                id="project-hours-input"
                type="number"
                placeholder="e.g. 40"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Target Deadline</label>
              <input
                id="project-deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-200"
              />
            </div>
          </div>

          <button
            id="save-project-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
          >
            {loading ? 'Creating...' : 'Launch Project'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id && !t.isArchived);
          const completedCount = projectTasks.filter(t => t.status === 'completed').length;
          const completionPercentage = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

          return (
            <div
              id={`project-item-card-${p.id}`}
              key={p.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Upper banner */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4.5 h-4.5 rounded-lg flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: p.color || '#6366f1' }}>
                      <Folder className="w-2.5 h-2.5 text-white" />
                    </span>
                    <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white truncate max-w-[150px]">{p.name}</h3>
                  </div>

                  {/* Archive button */}
                  <button
                    id={`archive-project-btn-${p.id}`}
                    onClick={() => onArchiveProject(p.id)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600"
                    title="Archive Project"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>

                {p.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}

                {/* Meta list */}
                <div className="space-y-1 pt-1 text-[10px] text-zinc-400 font-medium">
                  {p.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" /> Deadline: {p.deadline}
                    </div>
                  )}
                  {p.targetHours && (
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-zinc-400" /> Target: {p.targetHours} hours
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar info */}
              <div className="space-y-1.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                  <span>Task completion</span>
                  <span>{completedCount}/{projectTasks.length} ({completionPercentage}%)</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-500" style={{ backgroundColor: p.color || '#6366f1', width: `${completionPercentage}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
            <span className="text-4xl">📁</span>
            <h4 className="text-sm font-bold text-zinc-800 mt-4">No active projects</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Allocate your activities to project tracks to get precise metrics, deadlines, and dashboard groupings!
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
