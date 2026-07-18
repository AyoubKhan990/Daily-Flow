import React from 'react';
import { 
  LayoutDashboard, 
  Sun, 
  Moon,
  Inbox, 
  CalendarDays, 
  Calendar, 
  FolderOpen, 
  Copy, 
  Timer, 
  BarChart2, 
  CheckCircle2, 
  Archive, 
  Settings, 
  LogOut, 
  Zap, 
  User as UserIcon,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  streakInfo: { current: number; longest: number };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, streakInfo }) => {
  const { profile, logout, updateProfile } = useAuth();

  const isDark = profile?.theme === 'dark';

  const toggleTheme = async () => {
    try {
      const nextTheme = isDark ? 'light' : 'dark';
      await updateProfile({ theme: nextTheme });
      // Apply class on document element
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to toggle theme', e);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'today', label: 'Today', icon: Sun },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'templates', label: 'Templates', icon: Copy },
    { id: 'focus', label: 'Focus Timer', icon: Timer },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'team', label: 'Team Hub', icon: Users },
    { id: 'completed', label: 'Completed', icon: CheckCircle2 },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside id="app-sidebar" className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-display font-bold text-lg">
            D
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            DailyFlow
          </span>
        </div>
        {/* Streak indicator */}
        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{streakInfo.current}d</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              id={`nav-btn-${item.id}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-950 dark:hover:text-slate-100'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Settings */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-3">
          {profile?.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name || 'User'}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-850"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile?.name || 'Flow User'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
              {profile?.email}
            </p>
          </div>
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1.5 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <button
            id="logout-btn"
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
