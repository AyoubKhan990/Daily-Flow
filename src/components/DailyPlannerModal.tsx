import React, { useState, useEffect } from 'react';
import { X, Check, Target, ChevronRight, FileText, LayoutList, RefreshCw } from 'lucide-react';
import { Task, Template } from '../types.ts';
import { formatFriendlyDate } from '../utils/dateUtils.ts';

interface DailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  tasks: Task[];
  templates: Template[];
  onSavePlanner: (data: {
    dailyGoal: string;
    content: string;
    topThreeTasks: number[];
    carryForwardIds: number[];
    appliedTemplateId: number | null;
  }) => Promise<void>;
}

export const DailyPlannerModal: React.FC<DailyPlannerModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  tasks,
  templates,
  onSavePlanner,
}) => {
  const [dailyGoal, setDailyGoal] = useState('');
  const [content, setContent] = useState('');
  const [topThreeTasks, setTopThreeTasks] = useState<number[]>([]);
  const [carryForwardIds, setCarryForwardIds] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 1. Unfinished tasks from previous dates
  const unfinishedPrevious = tasks.filter(t => 
    t.date && t.date < dateStr && t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'cancelled' && !t.isArchived
  );

  // 2. Tasks scheduled for today
  const todaysTasks = tasks.filter(t => t.date === dateStr && !t.isArchived);

  useEffect(() => {
    if (isOpen) {
      setDailyGoal('');
      setContent('');
      setTopThreeTasks([]);
      setCarryForwardIds(unfinishedPrevious.map(t => t.id)); // Default select all to carry forward
      setSelectedTemplateId(null);
      setStep(1);
    }
  }, [isOpen, dateStr]);

  const handleToggleTopThree = (id: number) => {
    if (topThreeTasks.includes(id)) {
      setTopThreeTasks(topThreeTasks.filter(item => item !== id));
    } else {
      if (topThreeTasks.length >= 3) return; // Max 3
      setTopThreeTasks([...topThreeTasks, id]);
    }
  };

  const handleToggleCarryForward = (id: number) => {
    if (carryForwardIds.includes(id)) {
      setCarryForwardIds(carryForwardIds.filter(item => item !== id));
    } else {
      setCarryForwardIds([...carryForwardIds, id]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSavePlanner({
        dailyGoal,
        content,
        topThreeTasks,
        carryForwardIds,
        appliedTemplateId: selectedTemplateId,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="planner-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
      <div id="planner-modal-content" className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin-slow" />
              Daily Planning Workspace
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Organize workflow for {formatFriendlyDate(dateStr)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps navigation */}
        <div className="flex bg-zinc-50 dark:bg-zinc-950/40 px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-400 dark:text-zinc-500 gap-4">
          <span className={step === 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>1. Carry Forward</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={step === 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Daily Goals & Templates</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={step === 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>3. Top Priority</span>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Review Unfinished Tasks</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You have {unfinishedPrevious.length} unfinished tasks from previous days. Select which ones to move forward to today.
              </p>

              {unfinishedPrevious.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/20">
                  {unfinishedPrevious.map(t => {
                    const isSelected = carryForwardIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleToggleCarryForward(t.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-200 text-zinc-800 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-zinc-100'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="text-sm font-semibold truncate block max-w-[250px]">{t.title}</span>
                            <span className="text-[10px] text-zinc-400">{formatFriendlyDate(t.date)}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          t.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          t.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                        }`}>
                          {t.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-zinc-500">
                  🎉 Amazing! No unfinished tasks from yesterday. Pure clean slate!
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Daily Mission & Templates</h3>
              </div>

              {/* Daily Goal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Daily Core Goal</label>
                <input
                  type="text"
                  placeholder="What is your biggest focus point for today?"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                />
              </div>

              {/* Daily Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Pre-planning Note</label>
                <textarea
                  placeholder="Draft ideas, motivation, outline or general schedules..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                />
              </div>

              {/* Templates Option */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Apply a Routine Template</label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="">No template applied</option>
                  {templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">Applying a template will copy its standard checklist items and tasks directly onto this day.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">The Rule of Three</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                To maximize focus, select the **Top Three Most Important Tasks** of the day. This keeps your mind centered on what drives maximum impact.
              </p>

              {todaysTasks.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/20">
                  {todaysTasks.map(t => {
                    const isSelected = topThreeTasks.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleToggleTopThree(t.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-50/40 border-amber-200 text-zinc-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-zinc-100'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-zinc-300'}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-semibold truncate block max-w-[280px]">{t.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-zinc-500">
                  No tasks scheduled for today yet. Go back to add some first, or carry forward previous ones!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 rounded-b-2xl">
          <button
            onClick={() => step > 1 && setStep((step - 1) as any)}
            disabled={step === 1}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 text-sm font-semibold rounded-xl disabled:opacity-40 transition-all"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              {loading ? 'Saving...' : 'Finish Planning'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
