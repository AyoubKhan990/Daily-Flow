import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, LayoutList, CheckSquare, Sparkles } from 'lucide-react';
import { Template } from '../../types.ts';
import { getTodayDateString } from '../../utils/dateUtils.ts';

interface TemplatesViewProps {
  templates: Template[];
  onSaveTemplate: (data: { name: string; description: string; checklistPreset: string[] }) => Promise<void>;
  onDeleteTemplate: (id: number) => Promise<void>;
  onApplyTemplate: (templateId: number, dateStr: string) => Promise<void>;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [checklistPreset, setChecklistPreset] = useState<string[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPresetItem = () => {
    if (newItemTitle.trim() && !checklistPreset.includes(newItemTitle.trim())) {
      setChecklistPreset([...checklistPreset, newItemTitle.trim()]);
      setNewItemTitle('');
    }
  };

  const handleRemovePresetItem = (item: string) => {
    setChecklistPreset(checklistPreset.filter(i => i !== item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSaveTemplate({
        name,
        description,
        checklistPreset,
      });
      setName('');
      setDescription('');
      setChecklistPreset([]);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = getTodayDateString();

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-indigo-500" />
            Routine Templates
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Build structural routines (e.g. "Morning Routine", "Weekly Review") with task presets, and apply them with one click.
          </p>
        </div>
        <button
          id="toggle-add-template-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          {showAddForm ? 'Close panel' : 'Create Template'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 max-w-xl animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <LayoutList className="w-4 h-4 text-indigo-500" /> New Routine Preset
          </h3>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">Template Name *</label>
            <input
              id="template-name-input"
              type="text"
              placeholder="e.g. Standard Morning Routine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">Short Description</label>
            <input
              id="template-desc-input"
              type="text"
              placeholder="What tasks does this standard checklist copy over?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
            />
          </div>

          {/* Checklist subtasks compiler */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <label className="text-xs font-semibold text-zinc-500">Preset Task Titles</label>
            <div className="flex gap-2">
              <input
                id="template-item-input"
                type="text"
                placeholder="e.g. Stretch and meditate (10m)"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPresetItem())}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              />
              <button
                id="add-preset-item-btn"
                type="button"
                onClick={handleAddPresetItem}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl"
              >
                Add Preset
              </button>
            </div>

            {checklistPreset.length > 0 && (
              <div className="space-y-1.5 p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-100 dark:border-zinc-850">
                {checklistPreset.map(item => (
                  <div key={item} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-none">
                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{item}</span>
                    <button type="button" onClick={() => handleRemovePresetItem(item)} className="text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            id="save-template-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
          >
            {loading ? 'Saving...' : 'Deploy Preset'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <div
            id={`template-card-${t.id}`}
            key={t.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white truncate max-w-[150px]">{t.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.checklistPreset?.length || 0} tasks configured</p>
                </div>
                <button
                  id={`delete-template-btn-${t.id}`}
                  onClick={() => onDeleteTemplate(t.id)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {t.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.description}
                </p>
              )}

              {/* Collapsed task list */}
              {t.checklistPreset && t.checklistPreset.length > 0 && (
                <div className="space-y-1 pt-1">
                  {t.checklistPreset.slice(0, 3).map(i => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />
                      <span className="truncate">{i}</span>
                    </div>
                  ))}
                  {t.checklistPreset.length > 3 && (
                    <span className="text-[10px] text-indigo-500 font-bold block pt-0.5">
                      +{t.checklistPreset.length - 3} more preset tasks
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick deployment */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <button
                id={`apply-template-btn-${t.id}`}
                onClick={() => onApplyTemplate(t.id, todayStr)}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply to Today
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
            <span className="text-4xl">📚</span>
            <h4 className="text-sm font-bold text-zinc-800 mt-4">No routines configured</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Speed up daily setups! Define preset workflows (morning steps, workout regimes, sprint retros) to copy them onto any day with a single tap.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
