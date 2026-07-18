import React, { useState, useEffect } from 'react';
import { X, Check, Award, HelpCircle, ArrowRight, BrainCircuit, Sparkles, ChevronRight } from 'lucide-react';
import { Task } from '../types.ts';
import { formatFriendlyDate } from '../utils/dateUtils.ts';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  tasks: Task[];
  onSaveReview: (data: {
    biggestAchievement: string;
    unfinishedReason: string;
    notesForTomorrow: string;
    moveToTomorrowIds: number[];
  }) => Promise<void>;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  tasks,
  onSaveReview,
}) => {
  const [biggestAchievement, setBiggestAchievement] = useState('');
  const [unfinishedReason, setUnfinishedReason] = useState('');
  const [notesForTomorrow, setNotesForTomorrow] = useState('');
  const [moveToTomorrowIds, setMoveToTomorrowIds] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Filter tasks belonging to this review date
  const dayTasks = tasks.filter(t => t.date === dateStr && !t.isArchived);
  const completed = dayTasks.filter(t => t.status === 'completed');
  const unfinished = dayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const skipped = dayTasks.filter(t => t.status === 'skipped');
  const cancelled = dayTasks.filter(t => t.status === 'cancelled');

  // Math
  const totalTasksCount = dayTasks.filter(t => t.status !== 'cancelled').length;
  const completionPercentage = totalTasksCount > 0 
    ? Math.round((completed.length / totalTasksCount) * 100) 
    : 0;
  
  const totalFocusSpent = dayTasks.reduce((acc, t) => acc + (t.actDuration || 0), 0);

  useEffect(() => {
    if (isOpen) {
      setBiggestAchievement('');
      setUnfinishedReason('');
      setNotesForTomorrow('');
      // Default: select all unfinished to carry to tomorrow
      setMoveToTomorrowIds(unfinished.map(t => t.id));
      setStep(1);
    }
  }, [isOpen, dateStr]);

  const handleToggleMoveToTomorrow = (id: number) => {
    if (moveToTomorrowIds.includes(id)) {
      setMoveToTomorrowIds(moveToTomorrowIds.filter(item => item !== id));
    } else {
      setMoveToTomorrowIds([...moveToTomorrowIds, id]);
    }
  };

  const handleSubmitReview = async () => {
    setLoading(true);
    try {
      await onSaveReview({
        biggestAchievement,
        unfinishedReason,
        notesForTomorrow,
        moveToTomorrowIds,
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
    <div id="review-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
      <div id="review-modal-content" className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Daily Review Workspace
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Summarizing work for {formatFriendlyDate(dateStr)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex bg-zinc-50 dark:bg-zinc-950/40 px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-400 dark:text-zinc-500 gap-4">
          <span className={step === 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>1. Performance metrics</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={step === 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Reflection & Rescheduling</span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Scorecard */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl text-center">
                  <span className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400">{completionPercentage}%</span>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Completion rate</p>
                </div>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl text-center">
                  <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{totalFocusSpent} mins</span>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Total focus time</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Activity Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-xl text-center">
                    <span className="text-sm font-bold text-emerald-600">{completed.length}</span>
                    <span className="block text-[10px] text-zinc-400">Completed</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-xl text-center">
                    <span className="text-sm font-bold text-amber-500">{unfinished.length}</span>
                    <span className="block text-[10px] text-zinc-400">Unfinished</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-xl text-center">
                    <span className="text-sm font-bold text-blue-500">{skipped.length}</span>
                    <span className="block text-[10px] text-zinc-400">Skipped</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-xl text-center">
                    <span className="text-sm font-bold text-zinc-400">{cancelled.length}</span>
                    <span className="block text-[10px] text-zinc-400">Cancelled</span>
                  </div>
                </div>
              </div>

              {/* Reflection Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" /> What was your biggest achievement today?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Completed the website SEO plan"
                    value={biggestAchievement}
                    onChange={(e) => setBiggestAchievement(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Any blockers or reasons for unfinished items?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unplanned meeting delayed content work"
                    value={unfinishedReason}
                    onChange={(e) => setUnfinishedReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>
              </div>

            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" /> Notes / Guidance for Tomorrow
                </label>
                <textarea
                  placeholder="What is your focus tomorrow morning? Any pre-commitments?"
                  value={notesForTomorrow}
                  onChange={(e) => setNotesForTomorrow(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                />
              </div>

              {/* Carry forward options */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Move Unfinished Tasks to Tomorrow?</h4>
                </div>
                
                {unfinished.length > 0 ? (
                  <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/20 max-h-52 overflow-y-auto">
                    {unfinished.map(t => {
                      const isSelected = moveToTomorrowIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleToggleMoveToTomorrow(t.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-50/30 border-indigo-200 text-zinc-800 dark:bg-indigo-950/25 dark:border-indigo-900/60 dark:text-zinc-100'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm font-semibold truncate block max-w-[280px]">{t.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-zinc-500">
                    ✨ No unfinished tasks remaining. Excellent work!
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 rounded-b-2xl">
          <button
            onClick={() => step === 2 && setStep(1)}
            disabled={step === 1}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-850 text-sm font-semibold rounded-xl disabled:opacity-40 transition-all"
          >
            Back
          </button>

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Reflection Notes
            </button>
          ) : (
            <button
              onClick={handleSubmitReview}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              {loading ? 'Submitting...' : 'Complete Review'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
