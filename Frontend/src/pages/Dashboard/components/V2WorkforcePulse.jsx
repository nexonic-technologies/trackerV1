import React from 'react';

/**
 * V2WorkforcePulse - Workforce Pulse bar.
 *
 * Props:
 *   pulse - Object containing { total, present, leave, wfh, late, unchecked, lop, absent, attendanceRate }
 *   scope - 'team' | 'org'
 */
export default function V2WorkforcePulse({ pulse, scope = 'org' }) {
  if (!pulse || pulse.total === 0) return null;

  const {
    total,
    present,
    leave,
    wfh,
    late,
    unchecked,
    lop,
    absent,
    attendanceRate
  } = pulse;

  const scopeLabel = scope === 'team' ? 'Team' : 'Org';

  // Calculate percentages for the segmented bar
  const getPct = (val) => (val / total) * 100;

  // Segment colors mapping to tokens.css / DESIGN.md
  const segments = [
    { key: 'present', value: present, color: 'bg-emerald-500', label: 'Present' },
    { key: 'wfh', value: wfh, color: 'bg-blue-500', label: 'WFH' },
    { key: 'late', value: late, color: 'bg-amber-500', label: 'Late' },
    { key: 'leave', value: leave, color: 'bg-purple-500', label: 'Leave' },
    { key: 'absent', value: absent + lop, color: 'bg-red-500', label: 'Absent' },
    { key: 'unchecked', value: unchecked, color: 'bg-gray-300 dark:bg-zinc-700', label: 'Unchecked' }
  ].filter((s) => s.value > 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 px-1 bg-transparent text-xs text-ink-muted">
      {/* Pulse Summary Text */}
      <div className="flex items-center gap-2 flex-shrink-0 font-medium text-ink">
        <span>{scopeLabel}:</span>
        <span className="font-semibold text-ink">
          {present + wfh}/{total} present
        </span>
        <span className="text-ink-subtle">({attendanceRate}%)</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex-1 h-2 max-w-xs sm:max-w-md bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${seg.color} h-full transition-all duration-500`}
            style={{ width: `${getPct(seg.value)}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>

      {/* Categories breakdown details */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-subtle">
        {late > 0 && <span className="flex items-center gap-1">⏱️ {late} late</span>}
        {leave > 0 && <span className="flex items-center gap-1">🏖️ {leave} leave</span>}
        {wfh > 0 && <span className="flex items-center gap-1">💻 {wfh} WFH</span>}
        {absent + lop > 0 && <span className="flex items-center gap-1">❌ {absent + lop} absent</span>}
        {unchecked > 0 && <span className="flex items-center gap-1">❓ {unchecked} unchecked</span>}
      </div>
    </div>
  );
}
