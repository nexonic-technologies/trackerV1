import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * V2AlertBanner - conditional alert strip.
 *
 * Props:
 *   alerts - Array of { type, severity, text, count }
 */
export default function V2AlertBanner({ alerts = [] }) {
  if (!alerts || alerts.length === 0) return null;

  // Determine aggregate severity (red takes precedence over orange)
  const hasRed = alerts.some((a) => a.severity === 'red');
  const severityClass = hasRed
    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';

  const Icon = hasRed ? AlertCircle : AlertTriangle;

  // Combine alert texts with dots
  const alertText = alerts.map((a) => a.text).join('  ·  ');

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border rounded-tracker-md text-xs font-medium transition-all duration-300 animate-fade-in ${severityClass}`}
      role="alert"
    >
      <Icon className="h-4 w-4 flex-shrink-0 animate-pulse" />
      <span className="truncate">{alertText}</span>
    </div>
  );
}
