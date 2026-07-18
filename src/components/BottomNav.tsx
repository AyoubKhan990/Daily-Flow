import React from 'react';
import { LayoutDashboard, Sun, Timer, Calendar, Settings } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'today', label: 'Today', icon: Sun },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-850 h-16 flex items-center justify-around px-2 z-50 shadow-lg">
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            id={`mobile-nav-btn-${item.id}`}
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
              isActive 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <IconComponent className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
