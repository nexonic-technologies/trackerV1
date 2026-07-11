import React from 'react';
import { Users, Clock } from 'lucide-react';
import ProfileImage from '../../../components/Common/ProfileImage';

const STATUS_STYLING = {
  Present: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-200/30',
  'Late Entry': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-200/30',
  Leave: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20 border-purple-200/30',
  'Work From Home': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 border-blue-200/30',
  Absent: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-200/30',
  LOP: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-200/30',
  Unchecked: 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-zinc-800/40 border-gray-200/30',
  'Check-Out': 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20 border-yellow-200/30',
  'Early check-out': 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20 border-yellow-200/30',
};

const formatTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default function V2TeamAttendanceGrid({ teamGrid = [] }) {
  return (
    <section className="lmx-section-card p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-hairline-soft pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink tracking-tight uppercase">
            👥 Team Today
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
            {teamGrid.length}
          </span>
        </div>
      </div>

      {teamGrid.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-ink-subtle text-center">
          <Users className="h-8 w-8 mb-2" />
          <p className="text-xs">No direct reports found</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1">
          {teamGrid.map((member) => {
            const statusClass =
              STATUS_STYLING[member.status] ||
              'text-gray-500 bg-gray-50 dark:bg-zinc-800/40';

            const nameParts = member.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts[1] || '';

            return (
              <div
                key={member.employeeId}
                className="flex items-center justify-between gap-3 p-2.5 bg-surface-1/40 hover:bg-surface-1/60 border border-hairline-soft rounded-tracker-md transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProfileImage
                    profileImage={member.profileImage}
                    firstName={firstName}
                    lastName={lastName}
                    size="sm"
                    className="h-8 w-8 rounded-full border border-hairline-soft flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate leading-tight">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-ink-muted flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {member.checkIn ? formatTime(member.checkIn) : 'Not Checked In'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${statusClass} flex-shrink-0`}
                >
                  {member.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
