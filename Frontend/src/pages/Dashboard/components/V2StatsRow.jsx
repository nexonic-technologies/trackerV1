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

export default function V2StatsRow({ stats = {}, layoutVariant = 'employee' }) {
  if (layoutVariant === 'employee') return null;

  const renderManagerCards = () => {
    const pending = stats.pendingApprovals?.value ?? 0;
    const overdue = stats.overdueTasks?.value ?? 0;
    const tickets = stats.openTickets?.value ?? 0;

    return (
      <>
        <V2StatCard
          title="Pending Approvals"
          value={pending}
          subtitle="+1 today"
          color={pending > 0 ? 'yellow' : 'green'}
        />
        <V2StatCard
          title="Overdue Tasks"
          value={overdue}
          subtitle="+0 today"
          color={overdue > 0 ? 'red' : 'green'}
          to="/tasks"
        />
        <V2StatCard
          title="Open Tickets"
          value={tickets}
          subtitle="-1 today"
          color={tickets > 0 ? 'orange' : 'green'}
          to="/tasks" // link to tasks/tickets area
        />
      </>
    );
  };

  const renderAdminCards = () => {
    const pending = stats.pendingApprovals?.value ?? 0;
    const issues = stats.attendanceIssues?.value ?? 0;
    const issuesBreakdown = stats.attendanceIssues?.breakdown || {};
    const late = issuesBreakdown['Late Entry'] || 0;
    const lop = issuesBreakdown['LOP'] || 0;

    const payroll = stats.payrollStatus?.value ?? 'Not Started';
    const payrollMonth = stats.payrollStatus?.month
      ? new Date(2026, stats.payrollStatus.month - 1).toLocaleDateString('en-US', { month: 'short' })
      : 'Current';

    let payrollColor = 'yellow';
    if (payroll === 'Processed' || payroll === 'Approved') payrollColor = 'green';
    if (payroll === 'Processing') payrollColor = 'orange';

    return (
      <>
        <V2StatCard
          title="ALL Pending Approvals"
          value={pending}
          subtitle="+3 today"
          color={pending > 0 ? 'yellow' : 'green'}
        />
        <V2StatCard
          title="Attendance Issues"
          value={issues}
          subtitle={`Late: ${late}  LOP: ${lop}`}
          color={issues > 0 ? 'orange' : 'green'}
          to="/Attendance"
        />
        <V2StatCard
          title="Payroll Status"
          value={payroll}
          subtitle={`${payrollMonth} Run`}
          color={payrollColor}
          to="/Payroll"
        />
      </>
    );
  };

  const renderExecutiveCards = () => {
    const overdue = stats.overdueTasks?.value ?? 0;
    const crit = stats.criticalTickets?.value ?? 0;
    const unassigned = stats.criticalTickets?.unassigned ?? 0;
    const cost = stats.payrollCost?.value ?? 0;

    return (
      <>
        <V2StatCard
          title="Overdue Tasks"
          value={overdue}
          subtitle="Org Overdue"
          color={overdue > 0 ? 'red' : 'green'}
          to="/tasks"
        />
        <V2StatCard
          title="Critical Tickets"
          value={crit}
          subtitle={`Unassigned: ${unassigned}`}
          color={crit > 0 ? 'red' : 'green'}
          to="/tasks"
        />
        <V2StatCard
          title="Payroll Cost"
          value={formatLakhs(cost)}
          subtitle="Current Month Est."
          color="green"
          to="/Payroll"
        />
      </>
    );
  };

  const renderMDCards = () => {
    const health = stats.workforceHealth?.value ?? 0;
    const healthLabel = stats.workforceHealth?.label || 'Healthy';
    const healthColor = stats.workforceHealth?.color || 'green';

    const exposure = stats.financialExposure?.value ?? 0;
    const lopImpact = stats.financialExposure?.lopImpact ?? 0;

    return (
      <>
        <div className="h-[100px] flex-1">
          <V2StatCard
            title="Workforce Health"
            value={health > 0 ? `${health}%` : '—'}
            subtitle={`${healthLabel} · ${stats.workforceHealth?.late || 0} late, ${stats.workforceHealth?.lop || 0} LOP`}
            color={healthColor === 'green' ? 'green' : healthColor === 'yellow' ? 'yellow' : 'red'}
          />
        </div>
        <div className="h-[100px] flex-1">
          <V2StatCard
            title="Financial Exposure"
            value={formatLakhs(exposure)}
            subtitle={`${lopImpact} LOP impact`}
            color="green"
          />
        </div>
      </>
    );
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-${
        layoutVariant === 'md' ? '2' : '3'
      } gap-4 w-full`}
    >
      {layoutVariant === 'manager' && renderManagerCards()}
      {layoutVariant === 'admin' && renderAdminCards()}
      {layoutVariant === 'executive' && renderExecutiveCards()}
      {layoutVariant === 'md' && renderMDCards()}
    </div>
  );
}
