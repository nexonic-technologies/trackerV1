import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckSquare, Clock } from 'lucide-react';

const PRIORITY_COLORS = {
  High: 'bg-red-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
};

const formatDueDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function V2EmployeeTasks({ tasks }) {
  const taskList = tasks || [];
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimerValue = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(
      mins
    ).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartStopTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
    }
  };

  return (
    <section className="lmx-section-card p-4 sm:p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4 border-b border-hairline-soft pb-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-[var(--module-project)]" />
          <h3 className="text-sm font-semibold text-ink tracking-tight uppercase">
            📋 My Tasks
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
            {taskList.length}
          </span>
        </div>
      </div>

      {taskList.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-ink-subtle text-center">
          <CheckSquare className="h-8 w-8 mb-2" />
          <p className="text-xs">No active tasks assigned to you</p>
        </div>
      ) : (
        <div className="space-y-3">
          {taskList.slice(0, 5).map((task, index) => {
            const isTopTask = index === 0;
            const priorityColor = PRIORITY_COLORS[task.priorityLevel] || 'bg-gray-400';
            const dueDateText = formatDueDate(task.endDate);

            return (
              <div
                key={task._id}
                className="flex items-center justify-between gap-3 p-3 bg-surface-1/40 hover:bg-surface-1/60 border border-hairline-soft rounded-tracker-md transition-all duration-200"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${priorityColor}`}
                    title={`Priority: ${task.priorityLevel || 'None'}`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink leading-tight truncate">
                      {task.title}
                    </p>
                    <p className="text-[10px] text-ink-muted flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Due: {dueDateText} &middot; {task.priorityLevel || 'Medium'}
                    </p>
                  </div>
                </div>

                {isTopTask && (
                  <button
                    onClick={handleStartStopTimer}
                    className={`px-3 py-1 text-[10px] font-bold rounded-tracker-md cursor-pointer flex items-center gap-1.5 transition-colors border select-none ${timerRunning
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/40'
                      }`}
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="h-3 w-3 fill-current animate-pulse" />
                        <span className="font-mono">{formatTimerValue(seconds)}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-current" />
                        <span>Start Timer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
