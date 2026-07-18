import React, { useState, useEffect } from 'react';
import { Settings, Save, Sparkles, Sliders, Shield, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SettingsViewProps {
  onProfileUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onProfileUpdated,
}) => {
  const { user, profile, token } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [startOfWeek, setStartOfWeek] = useState<'monday' | 'sunday'>('monday');
  const [defaultPriority, setDefaultPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [defaultDuration, setDefaultDuration] = useState<number>(30);
  const [notificationSounds, setNotificationSounds] = useState(true);
  const [autoCarryOver, setAutoCarryOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prefill settings
  useEffect(() => {
    if (profile) {
      setTheme(profile.theme as any || 'light');
      setStartOfWeek(profile.startOfWeek as any || 'monday');
      setDefaultPriority(profile.defaultPriority as any || 'medium');
      setDefaultDuration(profile.defaultDuration || 30);
      setNotificationSounds(profile.notificationSounds ?? true);
      setAutoCarryOver(profile.autoCarryOver ?? false);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      theme,
      startOfWeek,
      defaultPriority,
      defaultDuration,
      notificationSounds,
      autoCarryOver,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess('Profile settings successfully updated!');
        onProfileUpdated();
        // Sync theme class in document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        throw new Error('Update failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-2xl animate-in fade-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-indigo-500" />
          Settings Panel
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Customize your workspace parameters, defaults, and timezone rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* User profile card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 text-sm">
              <User className="w-4 h-4 text-zinc-400" />
              {user?.displayName || 'DailyFlow User'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Configurations workspace */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-500" /> Workspace Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Theme selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Aesthetic UI Theme</label>
              <select
                id="settings-theme-select"
                value={theme}
                onChange={(e: any) => setTheme(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              >
                <option value="light">Refined Light Theme</option>
                <option value="dark">Professional Slate Dark Theme</option>
              </select>
            </div>

            {/* Start of week */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">First Day of Week</label>
              <select
                id="settings-start-week-select"
                value={startOfWeek}
                onChange={(e: any) => setStartOfWeek(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            {/* Default Priority */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Default Priority of New Tasks</label>
              <select
                id="settings-priority-select"
                value={defaultPriority}
                onChange={(e: any) => setDefaultPriority(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Default Duration */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Default Focus Duration (mins)</label>
              <input
                id="settings-duration-input"
                type="number"
                min="5"
                max="180"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="settings-sounds-checkbox"
                type="checkbox"
                checked={notificationSounds}
                onChange={(e) => setNotificationSounds(e.target.checked)}
                className="w-4.5 h-4.5 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Sound alerts</span>
                <span className="text-[10px] text-zinc-400">Play chimes and waveforms on Pomodoro clock completions</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="settings-carry-checkbox"
                type="checkbox"
                checked={autoCarryOver}
                onChange={(e) => setAutoCarryOver(e.target.checked)}
                className="w-4.5 h-4.5 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Automatic carry-over</span>
                <span className="text-[10px] text-zinc-400">Automatically roll forward yesterday's unfinished tasks to today's timeline at midnight</span>
              </div>
            </label>
          </div>
        </div>

        <button
          id="save-settings-btn"
          type="submit"
          disabled={loading}
          className="w-full max-w-[200px] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Updating...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};
