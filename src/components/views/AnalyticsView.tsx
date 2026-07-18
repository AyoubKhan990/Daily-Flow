import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, Hourglass, Star, Activity } from 'lucide-react';
import { Task, Project, Category } from '../../types.ts';

interface AnalyticsViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  tasks,
  projects,
  categories,
}) => {
  const activeTasks = tasks.filter(t => !t.isArchived);
  const completedTasks = tasks.filter(t => t.status === 'completed' && !t.isArchived);

  // 1. Completion rate
  const totalCount = activeTasks.length;
  const completedCount = completedTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 2. Total focus hours spent
  const totalFocusMins = activeTasks.reduce((acc, t) => acc + (t.actDuration || 0), 0);
  const totalFocusHrs = (totalFocusMins / 60).toFixed(1);

  // 3. Weekly Task Completion Trend (group tasks by date for the last 7 days)
  const getPastNDays = (n: number) => {
    const list = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${y}-${m}-${day}`);
    }
    return list;
  };

  const last7Days = getPastNDays(7);
  const trendData = last7Days.map(dateStr => {
    const dayTasks = tasks.filter(t => t.date === dateStr && !t.isArchived);
    const dayCompleted = dayTasks.filter(t => t.status === 'completed');
    
    // Nice friendly label like "Mon", "Tue"
    const dObj = new Date(dateStr);
    const label = dObj.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      date: label,
      "Total Tasks": dayTasks.length,
      "Completed": dayCompleted.length,
    };
  });

  // 4. Focus Time Trend (grouped by last 7 days)
  const focusTrendData = last7Days.map(dateStr => {
    const dayTasks = tasks.filter(t => t.date === dateStr && !t.isArchived);
    const dayFocus = dayTasks.reduce((acc, t) => acc + (t.actDuration || 0), 0);
    const dObj = new Date(dateStr);
    const label = dObj.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      date: label,
      "Minutes Focused": dayFocus,
    };
  });

  // 5. Priorities Breakdown
  const priorityBreakdown = [
    { name: 'Urgent', value: activeTasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
    { name: 'High', value: activeTasks.filter(t => t.priority === 'high').length, color: '#f59e0b' },
    { name: 'Medium', value: activeTasks.filter(t => t.priority === 'medium').length, color: '#3b82f6' },
    { name: 'Low', value: activeTasks.filter(t => t.priority === 'low').length, color: '#10b981' },
  ].filter(p => p.value > 0);

  // 6. Category Performance
  const categoryData = categories.map(cat => {
    const catTasks = tasks.filter(t => t.categoryId === cat.id && !t.isArchived);
    const completed = catTasks.filter(t => t.status === 'completed').length;
    return {
      name: cat.name,
      Tasks: catTasks.length,
      Completed: completed,
    };
  }).filter(c => c.Tasks > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-indigo-500" />
          Analytics & Metrics
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Deep-dive insights on task compilation rates, daily focused hours, category splits, and trend velocities.
        </p>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-display font-bold text-zinc-900 dark:text-white">{completionRate}%</span>
            <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Average Completion</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-display font-bold text-zinc-900 dark:text-white">{totalFocusHrs} hrs</span>
            <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Total Focus Invested</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-xl font-display font-bold text-zinc-900 dark:text-white">{completedCount}</span>
            <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Total Tasks Solved</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-500 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-display font-bold text-zinc-900 dark:text-white">{totalCount}</span>
            <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Active Pipelines</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Task completion trend */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            7-Day Task Completion Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800" />
                <XAxis dataKey="date" className="text-[10px] font-bold text-zinc-400" />
                <YAxis className="text-[10px] font-bold text-zinc-400" />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="Total Tasks" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Focus time */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Hourglass className="w-4 h-4 text-amber-500" />
            7-Day Productive Focus Minutes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800" />
                <XAxis dataKey="date" className="text-[10px] font-bold text-zinc-400" />
                <YAxis className="text-[10px] font-bold text-zinc-400" />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="Minutes Focused" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Priorities Split */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-red-500" />
            Active Priority Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            {priorityBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400">No active priorities tracked yet.</div>
            )}
          </div>
        </div>

        {/* Chart 4: Categories Breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Category Performance
          </h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800" />
                  <XAxis type="number" className="text-[10px] font-bold text-zinc-400" />
                  <YAxis dataKey="name" type="category" className="text-[10px] font-bold text-zinc-400" width={100} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="Tasks" fill="#e4e4e7" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-center py-20 text-zinc-400">No category statistics available. Assign categories to unlock!</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
