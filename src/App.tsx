import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  Sun, 
  Moon,
  Inbox, 
  CalendarDays, 
  Calendar as CalendarIcon, 
  Folder, 
  BookOpen, 
  Timer, 
  Activity, 
  CheckCircle2, 
  Archive, 
  Settings,
  Sparkles,
  ClipboardList,
  Users
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { BottomNav } from './components/BottomNav.tsx';

// Views
import { DashboardView } from './components/views/DashboardView.tsx';
import { TodayView } from './components/views/TodayView.tsx';
import { InboxView } from './components/views/InboxView.tsx';
import { UpcomingView } from './components/views/UpcomingView.tsx';
import { CalendarView } from './components/views/CalendarView.tsx';
import { ProjectsView } from './components/views/ProjectsView.tsx';
import { TemplatesView } from './components/views/TemplatesView.tsx';
import { FocusView } from './components/views/FocusView.tsx';
import { AnalyticsView } from './components/views/AnalyticsView.tsx';
import { CompletedView } from './components/views/CompletedView.tsx';
import { ArchiveView } from './components/views/ArchiveView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { TeamView } from './components/views/TeamView.tsx';

// Modals
import { TaskModal } from './components/TaskModal.tsx';
import { DailyPlannerModal } from './components/DailyPlannerModal.tsx';
import { DailyReviewModal } from './components/DailyReviewModal.tsx';

import { Task, Project, Category, Template } from './types.ts';
import { getTodayDateString, getRelativeDateString } from './utils/dateUtils.ts';

function MainLayout() {
  const { user, profile, token, loginWithGoogle, logout, refreshProfile, updateProfile } = useAuth();
  
  const isDark = profile?.theme === 'dark';

  const toggleTheme = async () => {
    try {
      const nextTheme = isDark ? 'light' : 'dark';
      await updateProfile({ theme: nextTheme });
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to toggle theme', e);
    }
  };

  // Navigation
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [streakInfo, setStreakInfo] = useState({ current: 0, longest: 0 });
  const [loadingData, setLoadingData] = useState(false);

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | null>(null);
  const [modalInitialProjectId, setModalInitialProjectId] = useState<number | null>(null);
  const [modalInitialCategoryId, setModalInitialCategoryId] = useState<number | null>(null);

  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Load backend details
  const fetchAllData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      // Parallel fetch for snappiness
      const [resTasks, resProjects, resCategories, resTemplates, resStreak] = await Promise.all([
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/templates', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/streak', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (resTasks.ok) setTasks(await resTasks.json());
      if (resProjects.ok) setProjects(await resProjects.json());
      if (resCategories.ok) setCategories(await resCategories.json());
      if (resTemplates.ok) setTemplates(await resTemplates.json());
      if (resStreak.ok) setStreakInfo(await resStreak.json());
    } catch (err) {
      console.error('Failed to load workspace data', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // Sync theme initially
  useEffect(() => {
    if (profile?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile]);

  // Listen to NLP Parsing custom draft creations
  useEffect(() => {
    const handleNlpDraft = (e: Event) => {
      const parsed = (e as CustomEvent).detail;
      // Convert NLP parsed details into a draft task (id = 0)
      const draftTask: Task = {
        id: 0,
        userId: user?.uid || '',
        title: parsed.title || 'Parsed Task',
        description: parsed.description || '',
        date: parsed.date || getTodayDateString(),
        startTime: parsed.startTime || '',
        dueTime: parsed.dueTime || '',
        isAllDay: parsed.isAllDay || false,
        priority: parsed.priority || 'medium',
        status: 'pending',
        projectId: parsed.projectId || null,
        categoryId: parsed.categoryId || null,
        tags: parsed.tags || [],
        estDuration: parsed.estDuration || 30,
        actDuration: 0,
        notes: '',
        checklist: parsed.checklistPreset?.map((c: string) => ({ id: Math.random().toString(36).substr(2,9), title: c, completed: false })) || [],
        reminderTime: '',
        recurrenceRule: parsed.recurrenceRule || 'none',
        taskColor: '#6366f1',
        isArchived: false,
        parentTaskId: null,
        taskOrder: 0,
        completionDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedTask(draftTask);
      setIsTaskModalOpen(true);
    };
    window.addEventListener('openPrefilledTask', handleNlpDraft);
    return () => window.removeEventListener('openPrefilledTask', handleNlpDraft);
  }, []);

  // --- Core CRUD Handlers passed to views ---

  const handleAddTaskClick = (prefilledDate?: string | null) => {
    setSelectedTask(null);
    setModalInitialDate(prefilledDate !== undefined ? prefilledDate : getTodayDateString());
    setModalInitialProjectId(null);
    setModalInitialCategoryId(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleQuickToggleComplete = async (task: Task) => {
    if (!token) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRescheduleTask = async (task: Task, newDate: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...task, date: newDate })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelTask = async (task: Task) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...task, status: 'cancelled' })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreTask = async (task: Task) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...task, isArchived: false, status: 'pending' })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermanentDeleteTask = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${id}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProject = async (projectData: any) => {
    if (!token) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(projectData)
    });
    if (res.ok) {
      fetchAllData();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save project');
    }
  };

  const handleArchiveProject = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to archive this project? Linked tasks will remain available in general timelines.')) return;
    const res = await fetch(`/api/projects/${id}/archive`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchAllData();
    }
  };

  const handleSaveTemplate = async (tmplData: any) => {
    if (!token) return;
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tmplData)
    });
    if (res.ok) {
      fetchAllData();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this template preset?')) return;
    const res = await fetch(`/api/templates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchAllData();
    }
  };

  const handleApplyTemplate = async (templateId: number, dateStr: string) => {
    if (!token) return;
    const res = await fetch(`/api/templates/${templateId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ date: dateStr })
    });
    if (res.ok) {
      fetchAllData();
      alert('🎉 Template checklist successfully copied to today!');
    }
  };

  const handleSavePlanner = async (plannerData: any) => {
    if (!token) return;
    const todayStr = getTodayDateString();
    
    // Save daily notes / goals
    const resNotes = await fetch(`/api/daily-notes/${todayStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        dailyGoal: plannerData.dailyGoal,
        content: plannerData.content,
        topThreeTasks: plannerData.topThreeTasks,
      })
    });

    if (!resNotes.ok) {
      throw new Error('Failed to save core daily goals');
    }

    // Process carries forward
    if (plannerData.carryForwardIds?.length > 0) {
      await Promise.all(
        plannerData.carryForwardIds.map((id: number) => {
          const t = tasks.find(item => item.id === id);
          if (t) {
            return fetch(`/api/tasks/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ ...t, date: todayStr })
            });
          }
          return Promise.resolve();
        })
      );
    }

    // Process template application inside planner if checked
    if (plannerData.appliedTemplateId) {
      await fetch(`/api/templates/${plannerData.appliedTemplateId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: todayStr })
      });
    }

    fetchAllData();
    alert('🎉 Planning workspace successfully configured for the day!');
  };

  const handleSaveReview = async (reviewData: any) => {
    if (!token) return;
    const todayStr = getTodayDateString();

    const resReview = await fetch(`/api/daily-reviews/${todayStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        biggestAchievement: reviewData.biggestAchievement,
        unfinishedReason: reviewData.unfinishedReason,
        notesForTomorrow: reviewData.notesForTomorrow,
      })
    });

    if (!resReview.ok) {
      throw new Error('Failed to submit reflection note');
    }

    // Reschedule unfinished tasks to tomorrow
    if (reviewData.moveToTomorrowIds?.length > 0) {
      const tomorrowStr = getRelativeDateString(1);
      await Promise.all(
        reviewData.moveToTomorrowIds.map((id: number) => {
          const t = tasks.find(item => item.id === id);
          if (t) {
            return fetch(`/api/tasks/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ ...t, date: tomorrowStr })
            });
          }
          return Promise.resolve();
        })
      );
    }

    fetchAllData();
    alert('🎉 end-of-day review successfully compiled! Sleep well.');
  };

  // Render proper View
  const renderViewContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            tasks={tasks}
            projects={projects}
            categories={categories}
            streakInfo={streakInfo}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleAddTaskClick}
            onQuickToggleComplete={handleQuickToggleComplete}
            onRescheduleTask={handleRescheduleTask}
            onCancelTask={handleCancelTask}
            token={token}
          />
        );
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            projects={projects}
            categories={categories}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleAddTaskClick}
            onQuickToggleComplete={handleQuickToggleComplete}
            onTriggerPlanner={() => setIsPlannerOpen(true)}
            onTriggerReview={() => setIsReviewOpen(true)}
          />
        );
      case 'inbox':
        return (
          <InboxView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleAddTaskClick}
            onQuickToggleComplete={handleQuickToggleComplete}
            onRescheduleTask={handleRescheduleTask}
          />
        );
      case 'upcoming':
        return (
          <UpcomingView
            tasks={tasks}
            projects={projects}
            categories={categories}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleAddTaskClick}
            onQuickToggleComplete={handleQuickToggleComplete}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={tasks}
            projects={projects}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleAddTaskClick}
          />
        );
      case 'projects':
        return (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            onSaveProject={handleSaveProject}
            onArchiveProject={handleArchiveProject}
          />
        );
      case 'templates':
        return (
          <TemplatesView
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onApplyTemplate={handleApplyTemplate}
          />
        );
      case 'focus':
        return (
          <FocusView
            tasks={tasks}
            token={token}
            onSessionComplete={fetchAllData}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            tasks={tasks}
            projects={projects}
            categories={categories}
          />
        );
      case 'completed':
        return (
          <CompletedView
            tasks={tasks}
            projects={projects}
            categories={categories}
            onTaskClick={handleTaskClick}
            onQuickToggleComplete={handleQuickToggleComplete}
          />
        );
      case 'archive':
        return (
          <ArchiveView
            tasks={tasks}
            onRestoreTask={handleRestoreTask}
            onPermanentDeleteTask={handlePermanentDeleteTask}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onProfileUpdated={refreshProfile}
          />
        );
      case 'team':
        return (
          <TeamView />
        );
      default:
        return <div className="text-sm">Page not found</div>;
    }
  };

  // --- RENDERING VIEWS ---

  // 1. Loading screen
  if (loadingData && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-500">
        <RefreshCwIcon className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider mt-4">Assembling workspace...</p>
      </div>
    );
  }

  // 2. Landing Auth screen
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between py-12 px-6 lg:px-20 font-sans">
        
        {/* Brand Header */}
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-sm">D</span>
            <span className="font-display font-black text-lg tracking-tight text-zinc-900 dark:text-white">DailyFlow</span>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Get Started
          </button>
        </div>

        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center space-y-8 my-auto">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> High-Performance Workspace
            </span>
            <h1 className="text-5xl sm:text-6xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
              Craft beautiful daily routines, effortlessly.
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              DailyFlow is a premium editorial workspace for planner routines, Pomodoro ambient focus sessions, and predictive analytics metrics.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={loginWithGoogle}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer hover:scale-[1.01] transition-all"
            >
              Sign in with Google
            </button>
          </div>

          {/* Three column features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-zinc-150 dark:border-zinc-800">
            <div className="text-left space-y-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" /> Timeline Planning
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Build morning structures, roll forward yesterday's unfinished work, and organize tasks by period.
              </p>
            </div>
            <div className="text-left space-y-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" /> Ambient Focus Rooms
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Synthesize rain or alpha wave noise using native browser signals to focus and log work.
              </p>
            </div>
            <div className="text-left space-y-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Deep Analytics
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Track weekly completion rates, category stats, and streaks to improve consistency.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="max-w-7xl mx-auto w-full text-center text-[11px] text-zinc-400">
          <span>&copy; {new Date().getFullYear()} DailyFlow Inc. All rights reserved. Secure Cloud Workspace.</span>
        </div>

      </div>
    );
  }

  // 3. Main Workspace application layout
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col md:flex-row">
      
      {/* Desktop sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} streakInfo={streakInfo} />

      {/* Mobile top header */}
      <header className="md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 h-16 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">D</span>
          <span className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white">DailyFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="mobile-theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-64 h-full p-6 flex flex-col justify-between animate-in slide-in-from-left duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">D</span>
                <span className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white">DailyFlow</span>
              </div>

              {/* Navigation list */}
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'today', label: 'Today', icon: Sun },
                  { id: 'inbox', label: 'Inbox', icon: Inbox },
                  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
                  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
                  { id: 'projects', label: 'Projects', icon: Folder },
                  { id: 'templates', label: 'Templates', icon: BookOpen },
                  { id: 'focus', label: 'Focus Space', icon: Timer },
                  { id: 'analytics', label: 'Analytics', icon: Activity },
                  { id: 'team', label: 'Team Hub', icon: Users },
                  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
                  { id: 'archive', label: 'Archive', icon: Archive },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      id={`mobile-drawer-btn-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-xs font-bold rounded-xl"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body viewport */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full">
        {renderViewContent()}
      </main>

      {/* Mobile persistent Bottom Navigation tabs bar */}
      <BottomNav currentView={currentView} onViewChange={setCurrentView} />

      {/* CENTRALIZED MODALS */}
      
      {/* 1. Task Creation / Detail Modification Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        initialDate={modalInitialDate}
        initialProjectId={modalInitialProjectId}
        initialCategoryId={modalInitialCategoryId}
        onSave={fetchAllData}
        projects={projects}
        categories={categories}
      />

      {/* 2. Today's planning modal */}
      <DailyPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        dateStr={getTodayDateString()}
        tasks={tasks}
        templates={templates}
        onSavePlanner={handleSavePlanner}
      />

      {/* 3. Today's review modal */}
      <DailyReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        dateStr={getTodayDateString()}
        tasks={tasks}
        onSaveReview={handleSaveReview}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

// Simple helper icon
const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);
