import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Flame, Check, HelpCircle, AlertCircle } from 'lucide-react';
import { Task } from '../../types.ts';
import { getTodayDateString } from '../../utils/dateUtils.ts';

interface FocusViewProps {
  tasks: Task[];
  token: string | null;
  onSessionComplete: () => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
  tasks,
  token,
  onSessionComplete,
}) => {
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  
  // Ambient Sound State
  const [ambientSound, setAmbientSound] = useState<'none' | 'pink_noise' | 'rain' | 'binaural'>('none');
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundNodeRef = useRef<AudioNode | null>(null);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Today's tasks to link session to
  const todayStr = getTodayDateString();
  const todayPendingTasks = tasks.filter(t => t.date === todayStr && t.status !== 'completed' && !t.isArchived);

  // Duration settings
  const modeDurations = {
    focus: 25 * 60,
    short_break: 5 * 60,
    long_break: 15 * 60,
  };

  useEffect(() => {
    setSecondsLeft(modeDurations[mode]);
    setIsActive(false);
  }, [mode]);

  // Timer Loop
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopAmbientSound();
    };
  }, []);

  // Sync ambient sound to state
  useEffect(() => {
    stopAmbientSound();
    if (ambientSound !== 'none') {
      startAmbientSound(ambientSound);
    }
  }, [ambientSound]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    playCompletionChime();
    
    // Calculate total minutes focused
    const focusDurationSecs = modeDurations[mode];
    const focusDurationMins = Math.round(focusDurationSecs / 60);

    if (mode === 'focus' && token) {
      try {
        // Save focus session logs in database
        const sessionPayload = {
          taskId: selectedTaskId,
          mode: 'focus',
          duration: focusDurationMins,
          notes: selectedTaskId ? 'Linked to task execution' : 'General workspace focus'
        };

        const res = await fetch('/api/focus-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(sessionPayload)
        });

        if (res.ok && selectedTaskId) {
          // Increment actual spent duration on task directly!
          const linkedTask = tasks.find(t => t.id === selectedTaskId);
          if (linkedTask) {
            await fetch(`/api/tasks/${selectedTaskId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ...linkedTask,
                actDuration: (linkedTask.actDuration || 0) + focusDurationMins,
                status: 'in_progress' // Put to progress if was pending
              })
            });
          }
        }
        
        onSessionComplete();
        alert('🎉 Focus Session Completed! Your productive minutes have been saved.');
      } catch (err) {
        console.error('Failed to log focus session', err);
      }
    } else {
      alert(`🎉 Break session finished! Ready to step back into the workspace?`);
    }

    setSecondsLeft(modeDurations[mode]);
  };

  const handlePlayPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(modeDurations[mode]);
  };

  // WEB AUDIO GENERATORS for high-fidelity ambient sounds (No static assets required!)
  const startAmbientSound = (type: string) => {
    try {
      // Create audio context lazy loading
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      if (type === 'pink_noise') {
        // Generate high fidelity pink noise
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11; // volume compensation
          b6 = white * 0.115926;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.15; // Soft background level

        whiteNoise.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
        soundNodeRef.current = whiteNoise;
      } 
      else if (type === 'rain') {
        // Simple ambient rain simulation (LPF Pink Noise + random clicks)
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Low frequency rumbles

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.25;

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noiseSource.start();
        soundNodeRef.current = noiseSource;
      }
      else if (type === 'binaural') {
        // Generate binaural focus beat (100Hz Left, 110Hz Right for a 10Hz Alpha flow wave)
        const merger = ctx.createChannelMerger(2);
        
        const oscL = ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.value = 100; // Left ear base

        const oscR = ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.value = 110; // Right ear (10Hz difference)

        const gainL = ctx.createGain();
        gainL.gain.value = 0.08;

        const gainR = ctx.createGain();
        gainR.gain.value = 0.08;

        oscL.connect(gainL).connect(merger, 0, 0);
        oscR.connect(gainR).connect(merger, 0, 1);
        
        merger.connect(ctx.destination);
        
        oscL.start();
        oscR.start();
        
        soundNodeRef.current = oscL; // store left, right will auto release on context close
      }
    } catch (e) {
      console.error('Audio initialization failed', e);
    }
  };

  const stopAmbientSound = () => {
    if (soundNodeRef.current) {
      try {
        (soundNodeRef.current as any).stop?.();
      } catch (e) {}
      soundNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const playCompletionChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 chord chime
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // High C6
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  };

  // Helpers
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rSecs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 animate-in fade-in max-w-3xl mx-auto">
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
          <Timer className="w-8 h-8 text-indigo-500 animate-pulse" />
          Interactive Focus Room
        </h1>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Block off external noise, set your brainwaves to active learning frequency, and sync minutes directly to your backlog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        
        {/* Ambient Synthesizers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-500" /> Ambient Synthesizer
          </h3>
          <p className="text-[11px] text-zinc-400">
            Generate custom acoustic noise signals using local browser frequencies (no external streams).
          </p>

          <div className="space-y-2.5">
            {[
              { id: 'none', label: 'None (Muted)', icon: VolumeX },
              { id: 'pink_noise', label: 'Deep Pink Noise', icon: Volume2 },
              { id: 'rain', label: 'Simulated Rain', icon: Volume2 },
              { id: 'binaural', label: '10Hz Alpha Binaural Beats', icon: Flame },
            ].map((sound) => {
              const active = ambientSound === sound.id;
              const SoundIcon = sound.icon;
              return (
                <button
                  id={`sound-btn-${sound.id}`}
                  key={sound.id}
                  onClick={() => setAmbientSound(sound.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    active
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/25 dark:border-indigo-900/60 dark:text-indigo-400'
                      : 'bg-zinc-50/50 hover:bg-zinc-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/80 border-transparent text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <SoundIcon className="w-4 h-4" />
                    {sound.label}
                  </span>
                  {active && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Timer */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-6 shadow-sm">
          {/* Mode switch pills */}
          <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl">
            {[
              { id: 'focus', label: 'Focus' },
              { id: 'short_break', label: 'Break' },
              { id: 'long_break', label: 'Long Break' },
            ].map((m) => (
              <button
                id={`focus-mode-btn-${m.id}`}
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === m.id
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Core Clock UI */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Circular Progress Ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="88" cy="88" r="80" className="stroke-zinc-100 dark:stroke-zinc-800 fill-transparent stroke-[4]" />
              <circle
                cx="88"
                cy="88"
                r="80"
                className="stroke-indigo-500 fill-transparent stroke-[4] transition-all duration-300"
                strokeDasharray={502.6}
                strokeDashoffset={502.6 - (502.6 * (secondsLeft / modeDurations[mode]))}
              />
            </svg>
            <span className="text-4xl font-display font-black text-zinc-900 dark:text-white tracking-tight">
              {formatTime(secondsLeft)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              id="focus-play-pause-btn"
              onClick={handlePlayPause}
              className={`p-3.5 rounded-full ${isActive ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} shadow-md transition-all`}
            >
              {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              id="focus-reset-btn"
              onClick={handleReset}
              className="p-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task linking */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="w-4 h-4 text-indigo-500" /> Link to Daily Task
          </h3>
          <p className="text-[11px] text-zinc-400">
            Link focus sessions to daily tasks. Finishing the countdown automatically logs actual duration minutes to the selected task!
          </p>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {todayPendingTasks.map((t) => {
              const isSelected = selectedTaskId === t.id;
              return (
                <button
                  id={`link-task-btn-${t.id}`}
                  key={t.id}
                  onClick={() => setSelectedTaskId(isSelected ? null : t.id)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/25 dark:border-indigo-900/60 dark:text-indigo-400'
                      : 'bg-zinc-50/50 hover:bg-zinc-100 dark:bg-zinc-950/40 border-transparent text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="block truncate max-w-[170px]">{t.title}</span>
                  <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">Est: {t.estDuration}m | Spent: {t.actDuration || 0}m</span>
                </button>
              );
            })}

            {todayPendingTasks.length === 0 && (
              <div className="text-center py-8 text-[11px] text-zinc-400 border border-dashed border-zinc-150 dark:border-zinc-850 rounded-xl">
                No active tasks scheduled for today. Add a task on today's timeline to start sync logs!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
