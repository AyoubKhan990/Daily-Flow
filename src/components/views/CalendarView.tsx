import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, ListTodo, Sparkles } from 'lucide-react';
import { Task, Project } from '../../types.ts';
import { getDaysInMonthGrid, getMonthName, getTodayDateString, formatFriendlyDate } from '../../utils/dateUtils.ts';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  projects,
  onTaskClick,
  onAddTaskClick,
}) => {
  const todayStr = getTodayDateString();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-12
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Get 42 day slots for grid
  const daysGrid = getDaysInMonthGrid(currentYear, currentMonth, 'monday');
  
  // Tasks for the selected date
  const selectedDateTasks = tasks.filter(t => t.date === selectedDate && !t.isArchived);

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      
      {/* Title & month switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-indigo-500" />
            Monthly Calendar
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Map out your schedule visually, track recurrence rules, and analyze monthly priorities.
          </p>
        </div>

        {/* Date controllers */}
        <div className="flex items-center gap-2.5">
          <button
            id="prev-month-btn"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 min-w-[120px] text-center font-display">
            {getMonthName(currentYear, currentMonth)}
          </span>

          <button
            id="next-month-btn"
            onClick={handleNextMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            id="jump-today-btn"
            onClick={handleJumpToToday}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid Section */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-4">
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* 42 grid blocks */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((day, idx) => {
              const dayTasks = tasks.filter(t => t.date === day.dateStr && !t.isArchived);
              const isToday = day.dateStr === todayStr;
              const isSelected = day.dateStr === selectedDate;
              
              const completedCount = dayTasks.filter(t => t.status === 'completed').length;
              const pendingCount = dayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

              return (
                <div
                  id={`calendar-day-slot-${day.dateStr}`}
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`min-h-[75px] p-1.5 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                    day.isCurrentMonth 
                      ? 'bg-zinc-50/20 dark:bg-zinc-950/5' 
                      : 'bg-zinc-50/50 dark:bg-zinc-950/20 opacity-40'
                  } ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/10' 
                      : 'border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-850/40'
                  }`}
                >
                  {/* Top indicator: Day number and Today highlight */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isToday 
                        ? 'w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]' 
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {day.dayNum}
                    </span>
                    
                    {/* Compact bullets for task loads */}
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5">
                        {completedCount > 0 && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                        {pendingCount > 0 && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                      </div>
                    )}
                  </div>

                  {/* Very compact list of task labels (shows first 2 labels) */}
                  <div className="space-y-0.5 mt-1.5 flex-1 flex flex-col justify-end">
                    {dayTasks.slice(0, 2).map(t => (
                      <div 
                        key={t.id} 
                        className={`text-[9px] px-1 py-0.5 rounded-sm truncate leading-none font-medium ${
                          t.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 line-through'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                        }`}
                        style={{ borderLeft: `2.5px solid ${t.taskColor || '#6366f1'}` }}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] text-zinc-400 text-right pr-0.5 font-bold">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Selected date task summary and additions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  {formatFriendlyDate(selectedDate)}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Scheduled Tasks ({selectedDateTasks.length})
                </p>
              </div>
              <button
                id="calendar-quick-add-btn"
                onClick={() => onAddTaskClick(selectedDate)}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-400 rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedDateTasks.length > 0 ? (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {selectedDateTasks.map(t => (
                  <div
                    id={`calendar-subtask-row-${t.id}`}
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-400 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h4 className={`text-xs font-semibold truncate ${t.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {t.title}
                      </h4>
                      {t.startTime && <span className="text-[9px] text-zinc-400 mt-0.5 block">{t.startTime}</span>}
                    </div>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      t.priority === 'urgent' ? 'bg-red-50 text-red-600 dark:bg-red-950/30' :
                      t.priority === 'high' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-zinc-400 dark:text-zinc-500">
                <ListTodo className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-800 mb-2" />
                No tasks scheduled for this day yet. Click the "+" button above to fill this slot!
              </div>
            )}
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl space-y-2 shadow-xs">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-indigo-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Calendar Tips
            </h3>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Clicking any day box updates the side agenda. Use color codes inside task edits to categorize and highlight critical deliverables!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
