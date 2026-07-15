import React from 'react';
import { Link } from 'react-router-dom';

const formatLakhs = (val) => {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num === 0) return '₹0';
  return `₹${(num / 100000).toFixed(1)}L`;
};

function V2StatCard({ title, value, subtitle, color, to }) {
  const content = (
    <div
      className={`h-[88px] flex flex-col justify-between p-3.5 border border-hairline rounded-tracker-md bg-surface hover:bg-surface-1/30 transition-all duration-200 select-none ${
        color === 'red'
          ? 'border-l-2 border-l-red-500'
          : color === 'orange'
          ? 'border-l-2 border-l-amber-500'
          : color === 'yellow'
          ? 'border-l-2 border-l-yellow-500'
          : color === 'green'
          ? 'border-l-2 border-l-emerald-500'
          : ''
      }`}
    >
      <div>
        <p className="text-[11px] font-medium text-ink-subtle uppercase tracking-wider leading-none mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-ink leading-none tracking-tight">
          {value}
        </p>
      </div>
      {subtitle && (
        <p className="text-[11px] text-ink-muted leading-none mt-1 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

export default function V2StatsRow({ stats = {}, can }) {
  if (!can) return null;

  const cards = [];

  // 1. Pending Approvals
  if (can('v2_stat_pending_approvals')) {
    const pending = stats.pendingApprovals?.value ?? 0;
    cards.push(
      <V2StatCard
        key="pending_approvals"
        title="Pending Approvals"
        value={pending}
        subtitle="+1 today"
        color={pending > 0 ? 'yellow' : 'green'}
      />
    );
  }

  // 2. Overdue Tasks
  if (can('v2_stat_overdue_tasks')) {
    const overdue = stats.overdueTasks?.value ?? 0;
    cards.push(
      <V2StatCard
        key="overdue_tasks"
        title="Overdue Tasks"
        value={overdue}
        subtitle="+0 today"
        color={overdue > 0 ? 'red' : 'green'}
        to="/tasks"
      />
    );
  }

  // 3. Open Tickets
  if (can('v2_stat_open_tickets')) {
    const tickets = stats.openTickets?.value ?? 0;
    cards.push(
      <V2StatCard
        key="open_tickets"
        title="Open Tickets"
        value={tickets}
        subtitle="-1 today"
        color={tickets > 0 ? 'orange' : 'green'}
        to="/tasks"
      />
    );
  }

  // 4. Attendance Issues
  if (can('v2_stat_attendance_issues')) {
    const issues = stats.attendanceIssues?.value ?? 0;
    const issuesBreakdown = stats.attendanceIssues?.breakdown || {};
    const late = issuesBreakdown['Late Entry'] || 0;
    const lop = issuesBreakdown['LOP'] || 0;
    cards.push(
      <V2StatCard
        key="attendance_issues"
        title="Attendance Issues"
        value={issues}
        subtitle={`Late: ${late}  LOP: ${lop}`}
        color={issues > 0 ? 'orange' : 'green'}
        to="/Attendance"
      />
    );
  }

  // 5. Payroll Status
  if (can('v2_stat_payroll_status')) {
    const payroll = stats.payrollStatus?.value ?? 'Not Started';
    const payrollMonth = stats.payrollStatus?.month
      ? new Date(2026, stats.payrollStatus.month - 1).toLocaleDateString('en-US', { month: 'short' })
      : 'Current';
    let payrollColor = 'yellow';
    if (payroll === 'Processed' || payroll === 'Approved') payrollColor = 'green';
    if (payroll === 'Processing') payrollColor = 'orange';
    cards.push(
      <V2StatCard
        key="payroll_status"
        title="Payroll Status"
        value={payroll}
        subtitle={`${payrollMonth} Run`}
        color={payrollColor}
        to="/Payroll"
      />
    );
  }

  // 6. Payroll Cost
  if (can('v2_stat_payroll_cost')) {
    const cost = stats.payrollCost?.value ?? 0;
    cards.push(
      <V2StatCard
        key="payroll_cost"
        title="Payroll Cost"
        value={formatLakhs(cost)}
        subtitle="Current Month Est."
        color="green"
        to="/Payroll"
      />
    );
  }

  // 7. Workforce Health
  if (can('v2_stat_workforce_health')) {
    const health = stats.workforceHealth?.value ?? 0;
    const healthLabel = stats.workforceHealth?.label || 'Healthy';
    const healthColor = stats.workforceHealth?.color || 'green';
    cards.push(
      <V2StatCard
        key="workforce_health"
        title="Workforce Health"
        value={health > 0 ? `${health}%` : '—'}
        subtitle={`${healthLabel} · ${stats.workforceHealth?.late || 0} late, ${stats.workforceHealth?.lop || 0} LOP`}
        color={healthColor === 'green' ? 'green' : healthColor === 'yellow' ? 'yellow' : 'red'}
      />
    );
  }

  // 8. Financial Exposure
  if (can('v2_stat_financial_exposure')) {
    const exposure = stats.financialExposure?.value ?? 0;
    const lopImpact = stats.financialExposure?.lopImpact ?? 0;
    cards.push(
      <V2StatCard
        key="financial_exposure"
        title="Financial Exposure"
        value={formatLakhs(exposure)}
        subtitle={`${lopImpact} LOP impact`}
        color="green"
      />
    );
  }

  if (cards.length === 0) return null;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(cards.length, 3)} gap-4 w-full`}
    >
      {cards}
    </div>
  );
}
