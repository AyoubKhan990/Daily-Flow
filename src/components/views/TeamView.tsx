import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Copy, 
  Check, 
  LogOut, 
  ArrowRight, 
  ClipboardList, 
  ShieldAlert, 
  Sparkles, 
  Trophy, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Task } from '../../types.ts';

interface TeamMember {
  id: number;
  uid: string;
  name: string | null;
  email: string;
  photoUrl: string | null;
  metrics: {
    total: number;
    completed: number;
    pending: number;
  };
  tasks: Task[];
}

export const TeamView: React.FC = () => {
  const { profile, token, refreshProfile } = useAuth();
  
  // States
  const [roleLoading, setRoleLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Admin dashboard states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Parse invite code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('inviteCode');
    if (code) {
      setInviteCode(code);
      // Strip param from URL to clean it
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch team members if user is admin
  const fetchTeamMembers = async () => {
    if (!token || profile?.role !== 'admin') return;
    setLoadingTeam(true);
    try {
      const res = await fetch('/api/admin/team', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load team data.');
      }
    } catch (err) {
      console.error('Fetch team error:', err);
      setError('Connection error loading team.');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchTeamMembers();
    }
  }, [profile?.role, token]);

  // Handle Become Admin
  const handleBecomeAdmin = async () => {
    if (!token) return;
    setRoleLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'admin' })
      });
      if (res.ok) {
        await refreshProfile();
        setSuccess('Congratulations! You are now a Team Admin.');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to set role.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setRoleLoading(false);
    }
  };

  // Handle Join Team
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteCode.trim()) return;
    setJoinLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user/join-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
        setSuccess(data.message || 'Successfully joined the team!');
        setInviteCode('');
      } else {
        setError(data.error || 'Failed to join team. Verify the invite code/email.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  // Handle Leave Team
  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave your team? Your admin will no longer see your tasks.')) {
      return;
    }
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user/leave-team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
        setSuccess('You have left the team.');
      } else {
        setError(data.error || 'Failed to leave team.');
      }
    } catch (err) {
      setError('Connection failed.');
    }
  };

  // Switch back from admin to member role (revert)
  const handleDemoteRole = async () => {
    if (!window.confirm('Disable Admin Mode? Your existing team members will lose their connection to you.')) {
      return;
    }
    if (!token) return;
    setRoleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'member' })
      });
      if (res.ok) {
        await refreshProfile();
        setSuccess('Admin mode disabled successfully.');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to change role.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setRoleLoading(false);
    }
  };

  // Copy helpers
  const copyInviteLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}?inviteCode=${encodeURIComponent(profile.email)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyInviteCode = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.email);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleExpandMember = (memberId: number) => {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
    } else {
      setExpandedMemberId(memberId);
    }
  };

  // Main UI render logic based on roles
  const renderContent = () => {
    if (!profile) return null;

    // --- CASE A: USER IS TEAM ADMIN ---
    if (profile.role === 'admin') {
      const inviteLink = `${window.location.origin}?inviteCode=${encodeURIComponent(profile.email)}`;
      
      return (
        <div className="space-y-8 animate-fade-in">
          {/* Header Dashboard Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Team Admin Panel
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  Team Task Manager
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
                  Provide your team members with the invite details below. Once they join, their real-time to-do lists, pending tasks, and completion metrics will instantly sync here.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchTeamMembers}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Sync Team
                </button>
                <button
                  onClick={handleDemoteRole}
                  disabled={roleLoading}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold rounded-xl transition-colors"
                >
                  Disable Admin Mode
                </button>
              </div>
            </div>

            {/* Invite Details & Copy Code widgets */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Copy Admin Email */}
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Invite Code (Your Email)</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{profile.email}</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="shrink-0 p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 rounded-lg transition-all shadow-xs"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Option 2: Copy Team Link */}
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instant Invitation Link</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{inviteLink}</p>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="shrink-0 p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 rounded-lg transition-all shadow-xs"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Team Size</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{teamMembers.length} Members</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Active Tasks Monitored</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
                  {teamMembers.reduce((acc, curr) => acc + curr.metrics.pending, 0)} Pending
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-semibold uppercase tracking-wider">Completed Tasks</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
                  {teamMembers.reduce((acc, curr) => acc + curr.metrics.completed, 0)} Total
                </p>
              </div>
            </div>
          </div>

          {/* Core Member Rows */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">Active Team Members</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Click a member's card to expand and view their task list
              </span>
            </div>

            {loadingTeam ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Updating team status...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-indigo-50/50 dark:bg-slate-850 rounded-full flex items-center justify-center text-indigo-500 mb-4 border border-indigo-100/50 dark:border-slate-800">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Team Members Yet</h4>
                <p className="text-xs mt-1 max-w-sm text-slate-400 leading-relaxed">
                  Share your email (<strong>{profile.email}</strong>) or copy your invite link from above so your team members can link up!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {teamMembers.map((member) => {
                  const isExpanded = expandedMemberId === member.id;
                  const total = member.metrics.total;
                  const completed = member.metrics.completed;
                  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div key={member.id} className="transition-all hover:bg-slate-50/40 dark:hover:bg-slate-950/20">
                      {/* Member Info Row */}
                      <div 
                        onClick={() => toggleExpandMember(member.id)}
                        className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          {member.photoUrl ? (
                            <img 
                              src={member.photoUrl} 
                              alt={member.name || member.email} 
                              className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-500 font-bold">
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              {member.name || 'Anonymous User'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{member.email}</p>
                          </div>
                        </div>

                        {/* Progress and numbers */}
                        <div className="flex items-center gap-8 md:text-right">
                          <div className="hidden sm:block w-40">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                              <span>PROGRESS</span>
                              <span>{completionRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-slate-500 dark:text-slate-400">
                            <div className="text-center md:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Todo List</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{total} total</p>
                            </div>
                            <div className="text-center md:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining</p>
                              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{member.metrics.pending}</p>
                            </div>
                            <div className="text-center md:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase font-semibold text-emerald-600">Completed</p>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{completed}</p>
                            </div>
                          </div>

                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Task List View */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850 animate-fade-in">
                          <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Tasks details for {member.name || member.email}
                            </h5>
                          </div>

                          {member.tasks.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">
                              No tasks created by this user yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {member.tasks.map((task) => {
                                const isComp = task.status === 'completed';
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between gap-4 transition-all shadow-xs ${
                                      isComp 
                                        ? 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5' 
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="min-w-0 flex items-center gap-2.5">
                                      <div className="shrink-0">
                                        {isComp ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                          <Circle className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-xs font-semibold truncate ${
                                          isComp ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                                        }`}>
                                          {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                          {task.date && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {task.date}
                                            </span>
                                          )}
                                          {task.startTime && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {task.startTime}
                                            </span>
                                          )}
                                          <span className={`capitalize px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            task.priority === 'urgent' ? 'bg-red-50 text-red-500 dark:bg-red-950/20' :
                                            task.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                          }`}>
                                            {task.priority}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                        isComp 
                                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {task.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // --- CASE B: USER IS MEMBER UNDER AN ADMIN ---
    if (profile.adminId) {
      return (
        <div className="max-w-2xl mx-auto space-y-6 py-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 text-center shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/40">
              <UserCheck className="w-8 h-8" />
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
              Successfully Linked to Team
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              You are currently registered as a team member. Your daily to-do list, tasks, and achievements are synced and actively shared with your team administrator.
            </p>

            <div className="mt-8 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-left max-w-sm mx-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Team Admin</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Shared via code</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">Admin ID Linked: #{profile.adminId}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLeaveTeam}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-100 dark:border-red-950/50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Leave Current Team
              </button>
            </div>
          </div>
        </div>
      );
    }

    // --- CASE C: STANDALONE MEMBER (Onboarding / Option Page) ---
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6 animate-fade-in">
        {/* Onboarding Intro Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-100 dark:border-indigo-900/40">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            DailyFlow Team Workspace
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
            Collaborate, monitor progress, and manage task items securely with your team members inside a singular workspace layout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Become Admin Choice */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-2xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-3">
                Option A
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Create a New Team <Sparkles className="w-4 h-4 text-indigo-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Become a Team Admin. You will receive an invitation link and invite code. Share it with your team members to track their completed, remaining, and total tasks in a synchronized panel.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Interactive team progress charts and stats</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Real-time inspection of team members' active to-dos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Instant copy-paste invitation links</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleBecomeAdmin}
              disabled={roleLoading}
              className="mt-8 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              {roleLoading ? 'Activating Admin Panel...' : 'Become Team Admin'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Join Existing Team Choice */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-2xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
                Option B
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Join an Existing Team <UserCheck className="w-4 h-4 text-emerald-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                If your Team Administrator or manager provided you with an invite code or invite link, paste their email address or UID below to link your account to theirs.
              </p>

              <form onSubmit={handleJoinTeam} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Invite Code / Admin Email
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter admin's email or UID..."
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={joinLoading || !inviteCode.trim()}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-slate-100 dark:text-indigo-400 border border-transparent dark:border-indigo-850 hover:border-indigo-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {joinLoading ? 'Connecting to Admin...' : 'Join Workspace'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-400">
              By joining, your Admin will have read access to monitor your active task list progress.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-xs font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {renderContent()}
    </div>
  );
};
