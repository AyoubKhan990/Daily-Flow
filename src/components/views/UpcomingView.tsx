import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  Check, 
  Mail, 
  BellRing, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Calendar
} from 'lucide-react';
import { Task, Project, Category, EmailLog } from '../../types.ts';
import { getTodayDateString, getRelativeDateString, formatFriendlyDate } from '../../utils/dateUtils.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface UpcomingViewProps {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: (prefilledDate?: string | null) => void;
  onQuickToggleComplete: (task: Task) => Promise<void>;
}

export const UpcomingView: React.FC<UpcomingViewProps> = ({
  tasks,
  projects,
  categories,
  onTaskClick,
  onAddTaskClick,
  onQuickToggleComplete,
}) => {
  const { profile, token, refreshProfile } = useAuth();
  
  const todayStr = getTodayDateString();
  const tomorrowStr = getRelativeDateString(1);
  const weekLimitStr = getRelativeDateString(7);

  // Future tasks
  const futureTasks = tasks.filter(t => t.date && t.date > todayStr && !t.isArchived && t.status !== 'completed');

  const tomorrowTasks = futureTasks.filter(t => t.date === tomorrowStr);
  const next7DaysTasks = futureTasks.filter(t => t.date! > tomorrowStr && t.date! <= weekLimitStr);
  const beyondTasks = futureTasks.filter(t => t.date! > weekLimitStr);

  // Email Notification States
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailTime, setEmailTime] = useState('09:00');
  
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [triggeringTest, setTriggeringTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Sync profile details
  useEffect(() => {
    if (profile) {
      setEmailEnabled(profile.upcomingTasksEmailEnabled ?? false);
      setEmailAddress(profile.upcomingTasksEmailAddress || profile.email || '');
      setEmailTime(profile.upcomingTasksEmailTime || '09:00');
    }
  }, [profile]);

  // Fetch email history log
  const fetchEmailLogs = async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/user/emails', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch email logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, [token]);

  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingSettings(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          upcomingTasksEmailEnabled: emailEnabled,
          upcomingTasksEmailAddress: emailAddress || null,
          upcomingTasksEmailTime: emailTime,
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Email settings saved successfully!' });
        await refreshProfile();
      } else {
        setFeedback({ type: 'error', message: 'Failed to update email settings.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Connection failed updating settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger test email summary
  const handleTriggerTest = async () => {
    if (!token) return;
    setTriggeringTest(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/user/emails/test-trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          message: `Digest generated! Status: ${data.sentStatus === 'sent' ? 'Actual Email Sent' : 'Simulated Email Logged'}` 
        });
        await fetchEmailLogs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to send test digest.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Connection error sending test digest.' });
    } finally {
      setTriggeringTest(false);
    }
  };

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

  const renderUpcomingCard = (t: Task) => {
    return (
      <div
        id={`upcoming-task-card-${t.id}`}
        key={t.id}
        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-start gap-3 cursor-pointer"
        onClick={() => onTaskClick(t)}
      >
        <button
          id={`upcoming-toggle-complete-btn-${t.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickToggleComplete(t);
          }}
          className="mt-0.5 w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition-colors"
        >
          <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-500" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{t.title}</h4>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{t.date}</span>
          </div>
          {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{t.description}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-zinc-400 font-medium">
            {t.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t.startTime}
              </span>
            )}
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-indigo-500" />
            Upcoming Commitments
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Get a birds-eye view of your schedules, workflows, and morning email reminder controls.
          </p>
        </div>
        <button
          id="add-upcoming-task-btn"
          onClick={() => onAddTaskClick(tomorrowStr)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Schedule Future Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Future Tasks Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {futureTasks.length > 0 ? (
            <div className="space-y-6">
              
              {/* Tomorrow Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  🌅 Tomorrow's Scheduled Tasks
                </h3>
                {tomorrowTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tomorrowTasks.map(renderUpcomingCard)}
                  </div>
                ) : (
                  <div className="text-xs p-4 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-xl text-zinc-400">
                    No tasks scheduled for tomorrow.
                  </div>
                )}
              </div>

              {/* Next 7 Days Section */}
              {next7DaysTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    🗓️ Next 7 Days (Week Ahead)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {next7DaysTasks.map(renderUpcomingCard)}
                  </div>
                </div>
              )}

              {/* Beyond Section */}
              {beyondTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    🚀 Beyond (Distant Future)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beyondTasks.map(renderUpcomingCard)}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6">
              <span className="text-4xl">🚀</span>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4">Future horizon is clear</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                You don't have any future tasks scheduled. Planning ahead increases peace of mind and output consistency.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Email Notification Management and Log Panel */}
        <div className="space-y-6">
          
          {/* Settings card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-500" />
              Email Alerts & Reminders
            </h3>
            
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              Apni scheduled tasks ki subha <strong>9:00 AM</strong> (ya customized time) par email notification set karein. Jis din ka task hoga, us subha ye email khud apko digest notification bhejega aur wo tasks <strong>Today's Tasks</strong> mein shamil ho jayenge!
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              {/* Toggle switch */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-850">
                <div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Enable Daily Alerts</span>
                  <span className="text-[10px] text-zinc-400">Receive task summaries</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {emailEnabled && (
                <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                  {/* Email address field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Recipient Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. user@example.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  {/* Trigger time field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Daily Digest Time (Local Time)</label>
                    <select
                      value={emailTime}
                      onChange={(e) => setEmailTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden text-zinc-800 dark:text-zinc-100 font-medium"
                    >
                      <option value="06:00">06:00 AM (Early Bird)</option>
                      <option value="07:00">07:00 AM</option>
                      <option value="08:00">08:00 AM</option>
                      <option value="09:00">09:00 AM (Default)</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                    </select>
                  </div>
                </div>
              )}

              {feedback && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-start gap-1.5 border ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span className="leading-tight">{feedback.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer text-center"
                >
                  {savingSettings ? 'Saving...' : 'Save Configuration'}
                </button>
                
                <button
                  type="button"
                  onClick={handleTriggerTest}
                  disabled={triggeringTest}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-150 dark:border-indigo-800 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
                  title="Trigger a test summary of today's tasks immediately to see how it looks"
                >
                  {triggeringTest ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1.5">Test Now</span>
                </button>
              </div>

            </form>
          </div>

          {/* Logs History card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" />
              Digest Sent Logs & Statuses
            </h4>

            {loadingLogs ? (
              <div className="text-center py-6 text-[11px] text-zinc-400 font-medium">
                Retrieving reminder outbox logs...
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-dashed border-zinc-150 dark:border-zinc-850 text-zinc-400 dark:text-zinc-500 text-xs">
                No notification alerts triggered yet. Enable notifications and add future tasks, or click "Test Now"!
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {emailLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const sendDate = new Date(log.sentAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={log.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl text-[11px] transition-all">
                      <div 
                        className="flex items-center justify-between gap-2 cursor-pointer"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{log.subject}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{log.recipientEmail} • {sendDate}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            log.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
                            log.status === 'simulated' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                            'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                          }`}>
                            {log.status}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-150 dark:border-zinc-850 space-y-1.5 animate-in fade-in duration-200 text-zinc-600 dark:text-zinc-400">
                          <p className="font-semibold text-[10px] text-zinc-400 block uppercase">Log Content Summary</p>
                          <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[150px]">
                            {log.content.replace(/<[^>]*>/g, '').trim().slice(0, 350) + '...'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
