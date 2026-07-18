import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Copy, 
  CheckSquare, 
  Plus, 
  Clock, 
  Tag, 
  Calendar, 
  Folder, 
  Activity, 
  Bell, 
  Repeat, 
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Task, Project, Category, Subtask, ActivityLog } from '../types.ts';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  initialDate: string | null;
  initialProjectId: number | null;
  initialCategoryId: number | null;
  onSave: () => void;
  projects: Project[];
  categories: Category[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  initialDate,
  initialProjectId,
  initialCategoryId,
  onSave,
  projects,
  categories,
}) => {
  const { token, profile } = useAuth();
  
  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [estDuration, setEstDuration] = useState<number>(30);
  const [actDuration, setActDuration] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [recurrenceRule, setRecurrenceRule] = useState<Task['recurrenceRule']>('none');
  const [taskColor, setTaskColor] = useState<string>('#6366f1');
  
  // Logs & Tabs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'subtasks' | 'logs' | 'notes'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Task values or set defaults
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setActiveTab('general');
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setDate(task.date || '');
        setStartTime(task.startTime || '');
        setDueTime(task.dueTime || '');
        setIsAllDay(task.isAllDay);
        setPriority(task.priority);
        setStatus(task.status);
        setProjectId(task.projectId);
        setCategoryId(task.categoryId);
        setTags(task.tags || []);
        setEstDuration(task.estDuration || profile?.defaultDuration || 30);
        setActDuration(task.actDuration || 0);
        setNotes(task.notes || '');
        setChecklist(task.checklist || []);
        setReminderTime(task.reminderTime || '');
        setRecurrenceRule(task.recurrenceRule || 'none');
        setTaskColor(task.taskColor || '#6366f1');
        
        // Fetch activity logs
        if (task.id !== 0) {
          fetchActivityLogs(task.id);
        }
      } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || '');
        setStartTime('');
        setDueTime('');
        setIsAllDay(false);
        setPriority((profile?.defaultPriority as any) || 'medium');
        setStatus('pending');
        setProjectId(initialProjectId);
        setCategoryId(initialCategoryId);
        setTags([]);
        setEstDuration(profile?.defaultDuration || 30);
        setActDuration(0);
        setNotes('');
        setChecklist([]);
        setReminderTime('');
        setRecurrenceRule('none');
        setTaskColor('#6366f1');
        setActivityLogs([]);
      }
    }
  }, [isOpen, task, initialDate, initialProjectId, initialCategoryId, profile]);

  const fetchActivityLogs = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tToRemove: string) => {
    setTags(tags.filter(t => t !== tToRemove));
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newItem: Subtask = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSubtaskTitle.trim(),
        completed: false,
      };
      setChecklist([...checklist, newItem]);
      setNewSubtaskTitle('');
    }
  };

  const handleToggleSubtask = (id: string) => {
    setChecklist(
      checklist.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleSave = async (editOccurrenceOption?: 'only_this' | 'all') => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    setLoading(true);
    setError(null);

    const payload: any = {
      title,
      description,
      date: date || null,
      startTime: startTime || null,
      dueTime: dueTime || null,
      isAllDay,
      priority,
      status,
      projectId,
      categoryId,
      tags,
      estDuration,
      actDuration,
      notes,
      checklist,
      reminderTime: reminderTime || null,
      recurrenceRule,
      taskColor,
    };

    try {
      let url = '/api/tasks';
      let method = 'POST';

      if (task && task.id !== 0) {
        if (task.recurrenceRule !== 'none' && editOccurrenceOption === 'only_this') {
          // Creates a standalone copies of this recurring task for this date, clears recurrence from this copy
          url = '/api/tasks';
          method = 'POST';
          payload.recurrenceRule = 'none';
          payload.parentTaskId = task.id;
        } else {
          url = `/api/tasks/${task.id}`;
          method = 'PUT';
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save task.');
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `${task.title} (Copy)`,
          description: task.description,
          date: task.date,
          startTime: task.startTime,
          dueTime: task.dueTime,
          isAllDay: task.isAllDay,
          priority: task.priority,
          status: 'pending',
          projectId: task.projectId,
          categoryId: task.categoryId,
          tags: task.tags,
          estDuration: task.estDuration,
          notes: task.notes,
          checklist: task.checklist?.map(c => ({ ...c, completed: false })) || [],
          recurrenceRule: task.recurrenceRule,
          taskColor: task.taskColor,
        })
      });
      if (res.ok) {
        onSave();
        onClose();
      } else {
        throw new Error('Duplication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Duplication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('Are you sure you want to delete this task? It will be archived to retain productivity statistics.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onSave();
        onClose();
      } else {
        throw new Error('Deletion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="task-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
      <div id="task-modal-content" className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="task-modal-title" className="text-xl font-display font-bold text-zinc-900 dark:text-white">
              {task ? 'Edit Task' : 'Add New Task'}
            </h2>
            {task && task.parentTaskId && (
              <p className="text-xs text-indigo-500 font-medium">Occurrence of a recurring series</p>
            )}
          </div>
          <button 
            id="close-task-modal-btn"
            onClick={onClose} 
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6">
          <button 
            id="tab-general"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
          >
            General
          </button>
          <button 
            id="tab-subtasks"
            onClick={() => setActiveTab('subtasks')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'subtasks' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
          >
            Subtasks
            {checklist.length > 0 && (
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {checklist.filter(c => c.completed).length}/{checklist.length}
              </span>
            )}
          </button>
          <button 
            id="tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
          >
            Notes / Details
          </button>
          {task && (
            <button 
              id="tab-logs"
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'}`}
            >
              Activity Logs
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Task Title *</label>
                <input
                  id="task-title-input"
                  type="text"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Description</label>
                <textarea
                  id="task-description-input"
                  placeholder="Add additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent resize-none"
                />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date
                  </label>
                  <input
                    id="task-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Start Time
                  </label>
                  <input
                    id="task-starttime-input"
                    type="time"
                    disabled={isAllDay}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* All Day, Priority, Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Priority</label>
                  <select
                    id="task-priority-select"
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</label>
                  <select
                    id="task-status-select"
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recurrence</label>
                  <select
                    id="task-recurrence-select"
                    value={recurrenceRule}
                    onChange={(e: any) => setRecurrenceRule(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="none">No Recurrence</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Projects & Categories & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5" /> Project
                  </label>
                  <select
                    id="task-project-select"
                    value={projectId || ''}
                    onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Category
                  </label>
                  <select
                    id="task-category-select"
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Est. Duration (mins)</label>
                  <input
                    id="task-estduration-input"
                    type="number"
                    min="0"
                    value={estDuration}
                    onChange={(e) => setEstDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tags</label>
                <div className="flex gap-2">
                  <input
                    id="task-tags-input"
                    type="text"
                    placeholder="add-tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none"
                  />
                  <button
                    id="add-tag-btn"
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-400 font-medium text-xs rounded-xl"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        #{t}
                        <button type="button" onClick={() => handleRemoveTag(t)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subtasks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Checklist / Subtasks</h3>
              
              {/* Add checklist item */}
              <div className="flex gap-2">
                <input
                  id="subtask-title-input"
                  type="text"
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                  className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                />
                <button
                  id="add-subtask-btn"
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Checklist list */}
              {checklist.length > 0 ? (
                <div className="space-y-2 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/20">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-none">
                      <button
                        id={`toggle-subtask-${item.id}`}
                        type="button"
                        onClick={() => handleToggleSubtask(item.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500'}`}>
                          {item.completed && <CheckSquare className="w-3.5 h-3.5 fill-current" />}
                        </div>
                        <span className={`text-sm ${item.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {item.title}
                        </span>
                      </button>
                      <button
                        id={`remove-subtask-${item.id}`}
                        type="button"
                        onClick={() => handleRemoveSubtask(item.id)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-500 text-sm">
                  No subtasks configured yet. Breakdown complex tasks into smaller check-items!
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Extended Notes & Links
                </label>
                <textarea
                  id="task-notes-textarea"
                  placeholder="Record execution logs, markdown summaries, links, or draft comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> Reminder Time
                  </label>
                  <input
                    id="task-remindertime-input"
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Actual Spent Duration (mins)</label>
                  <input
                    id="task-actduration-input"
                    type="number"
                    min="0"
                    value={actDuration}
                    onChange={(e) => setActDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Activity History Log
              </h3>
              {activityLogs.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="text-xs flex items-start gap-3 p-2 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 rounded-xl">
                      <div className="text-indigo-500 font-bold shrink-0 uppercase tracking-wider text-[9px] mt-0.5">
                        {log.action.replace('_', ' ')}
                      </div>
                      <div className="flex-1 text-zinc-600 dark:text-zinc-400">
                        {log.details}
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-500 text-sm">
                  No activity history available. Keep making changes to populate the log!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 rounded-b-2xl">
          {/* Delete or Duplicate buttons */}
          <div className="flex items-center gap-2">
            {task && (
              <>
                <button
                  id="delete-task-btn"
                  type="button"
                  onClick={handleDelete}
                  title="Archive/Delete Task"
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/30 dark:text-red-400 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  id="duplicate-task-btn"
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicate Task"
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              id="cancel-task-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
            {task && task.recurrenceRule !== 'none' ? (
              <div className="flex gap-2">
                <button
                  id="save-only-this-occurrence-btn"
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave('only_this')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors"
                >
                  Save Occurrence Only
                </button>
                <button
                  id="save-all-occurrences-btn"
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave('all')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors"
                >
                  Save All
                </button>
              </div>
            ) : (
              <button
                id="save-task-btn"
                type="button"
                disabled={loading}
                onClick={() => handleSave()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors"
              >
                {loading ? 'Saving...' : 'Save Task'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
