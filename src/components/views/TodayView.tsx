import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Target, 
  Sparkles, 
  Plus, 
  Check, 
  Timer,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { Task, Project, Category, DailyNote, DailyReview } from '../../types.ts';
import { getTodayDateString, formatFriendlyDate } from '../../utils/dateUtils.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
  onTriggerPlanner: () => void;
  onTriggerReview: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  projects,
  categories,
  onTaskClick,
  onAddTaskClick,
  onQuickToggleComplete,
  onTriggerPlanner,
  onTriggerReview,
}) => {
  const { token } = useAuth();
  const todayStr = getTodayDateString();

  const [dailyNote, setDailyNote] = useState<DailyNote | null>(null);
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null);

  // Fetch daily notes and goals for today
  useEffect(() => {
    if (!token) return;
    const loadDailyDetails = async () => {
      try {
        const resNotes = await fetch(`/api/daily-notes/${todayStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resNotes.ok) {
          const notesData = await resNotes.json();
          setDailyNote(notesData);
        }

        const resReview = await fetch(`/api/daily-reviews/${todayStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resReview.ok) {
          const reviewData = await resReview.json();
          setDailyReview(reviewData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDailyDetails();
  }, [token, tasks]); // Refresh when tasks are edited

  // Today's tasks
  const todayTasks = tasks.filter(t => t.date === todayStr && !t.isArchived);
  
  // Top 3 tasks
  const topThreeList = todayTasks.filter(t => dailyNote?.topThreeTasks?.includes(t.id));
  const otherTasks = todayTasks.filter(t => !dailyNote?.topThreeTasks?.includes(t.id));

  // Math
  const completed = todayTasks.filter(t => t.status === 'completed');
  const completionPercent = todayTasks.length > 0 ? Math.round((completed.length / todayTasks.length) * 100) : 0;
  const focusSpent = todayTasks.reduce((acc, t) => acc + (t.actDuration || 0), 0);
  const estTotal = todayTasks.reduce((acc, t) => acc + (t.estDuration || 0), 0);

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

  const renderTaskRow = (t: Task, isTopThree = false) => {
    const isComp = t.status === 'completed';
    return (
      <div 
        id={`today-task-row-${t.id}`}
        key={t.id}
        onClick={() => onTaskClick(t)}
        className={`group p-4 bg-white dark:bg-slate-900 border ${
          isTopThree 
            ? 'border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/5' 
            : 'border-slate-200 dark:border-slate-800'
        } rounded-xl hover:shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            id={`today-toggle-complete-btn-${t.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickToggleComplete(t);
            }}
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
              isComp 
                ? 'bg-emerald-500 border-emerald-500 text-white' 
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            {isComp && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="min-w-0">
            <h4 className={`text-sm font-semibold truncate ${isComp ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
              {t.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {t.startTime && <span>{t.startTime}</span>}
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
              {t.estDuration > 0 && <span>Est: {t.estDuration}m</span>}
            </div>
          </div>
        </div>

        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
          t.priority === 'urgent' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
          t.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-slate-150 text-slate-600 dark:bg-slate-800'
        }`}>
          {t.priority}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10">
      
      {/* Header with Planner and Review Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Sun className="w-8 h-8 text-amber-500" />
            Today's Timeline
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {formatFriendlyDate(todayStr)}
          </p>
        </div>

        {/* Workflows buttons */}
        <div className="flex gap-2.5">
          <button
            id="planner-workflow-btn"
            onClick={onTriggerPlanner}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all"
          >
            <ClipboardList className="w-4 h-4" /> Daily Planner
          </button>
          <button
            id="review-workflow-btn"
            onClick={onTriggerReview}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4" /> Daily Review
          </button>
        </div>
      </div>

      {/* Daily Goal Banner */}
      {dailyNote?.dailyGoal && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 dark:from-amber-950/15 dark:to-indigo-950/15 border border-amber-200/50 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 dark:bg-amber-505/20 text-amber-500 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Core Daily Focus Goal</h4>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{dailyNote.dailyGoal}</p>
          </div>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-center">
          <span className="text-xl font-display font-bold text-zinc-900 dark:text-white">{todayTasks.length}</span>
          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Total Tasks</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-center">
          <span className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">{completed.length}</span>
          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Completed</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-center">
          <span className="text-xl font-display font-bold text-indigo-600 dark:text-indigo-400">{completionPercent}%</span>
          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Completion rate</span>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-center">
          <span className="text-xl font-display font-bold text-amber-500">{focusSpent}/{estTotal}m</span>
          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Focus vs Est.</span>
        </div>
      </div>

      {/* Dashboard Lists layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scheduled / Tasks Timeline list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Three Priorities Card */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-500" /> Top Three Priorities
            </h3>
            {topThreeList.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {topThreeList.map(t => renderTaskRow(t, true))}
              </div>
            ) : (
              <div className="text-xs p-4 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-xl text-center text-zinc-500">
                You haven't designated any top priorities for today yet. Use the Daily Planner to commit!
              </div>
            )}
          </div>

          {/* Other Tasks list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-500" /> Scheduled Activities
              </h3>
              <button
                id="add-task-today-view-btn"
                onClick={() => onAddTaskClick(todayStr)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>
            
            {otherTasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {otherTasks.map(t => renderTaskRow(t, false))}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <span className="text-3xl">📝</span>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">Empty scheduled list</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Get organized! Select the planner or add individual tasks above.
                </p>
              </div>
            ) : (
              <div className="text-xs text-center py-6 text-zinc-400">All today's tasks are in your Top Priorities!</div>
            )}
          </div>

        </div>

        {/* Right column: Daily Planning notes */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Planning Notes
            </h3>
            {dailyNote?.content ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                {dailyNote.content}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No planning notes written for today. Use the planner to journal your outline!
              </div>
            )}
          </div>

          {/* Review reflections if submitted */}
          {dailyReview?.biggestAchievement && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/40 space-y-3 animate-in fade-in">
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Submitted Daily Reflection</h3>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase">Biggest Achievement</span>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{dailyReview.biggestAchievement}</p>
              </div>
              {dailyReview.unfinishedReason && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase">Blockers / Obstacles</span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{dailyReview.unfinishedReason}</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
