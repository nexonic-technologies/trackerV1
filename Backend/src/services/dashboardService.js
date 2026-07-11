// services/dashboardService.js
// Dashboard stats aggregation — all business logic, no route handling.
// RULE: Zero hardcoded role names or designation strings.
// Layout variant is determined purely by roles.level (1-10).

import { getPolicy, getRoleLevel } from '../utils/cache.js';
import models from '../models/Collection.js';
import mongoose from 'mongoose';

// ─── Layout Variant Mapping (level-driven, zero role names) ───────────────────

const LEVEL_RANGES = [
  { min: 1, max: 3, variant: 'employee' },
  { min: 4, max: 6, variant: 'manager' },
  { min: 7, max: 8, variant: 'admin' },
  { min: 9, max: 9, variant: 'executive' },
  { min: 10, max: 10, variant: 'md' },
];

export function getLayoutVariant(level) {
  const match = LEVEL_RANGES.find(r => level >= r.min && level <= r.max);
  return match?.variant || 'employee';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function canRead(roleId, modelName) {
  const policy = getPolicy(roleId, modelName);
  return !!policy?.permissions?.read;
}

function formatDuration(checkInDate) {
  if (!checkInDate) return null;
  const ms = Date.now() - new Date(checkInDate).getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ─── Employee Stats (Level 1-3) ───────────────────────────────────────────────

async function computeEmployeeStats(userId, roleId) {
  const result = { attendance: null, tasks: [], leaveBalance: [] };
  const today = todayStart();

  // Own attendance
  if (canRead(roleId, 'attendances')) {
    try {
      const att = await models.attendances.findOne({
        employee: new mongoose.Types.ObjectId(userId),
        date: { $gte: today, $lte: todayEnd() }
      }).lean();
      if (att) {
        result.attendance = {
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          duration: att.checkIn && !att.checkOut ? formatDuration(att.checkIn) : null,
          workHours: att.workHours || null,
          punches: att.punches || []
        };
      }
    } catch (e) { /* policy-gated, silently omit */ }
  }

  // Own tasks (top 5: overdue first → high priority → nearest deadline)
  if (canRead(roleId, 'tasks')) {
    try {
      result.tasks = await models.tasks.find({
        assignedTo: new mongoose.Types.ObjectId(userId),
        status: { $nin: ['Completed', 'Done'] },
        metaStatus: 'active'
      })
        .sort({ endDate: 1, priorityLevel: -1 })
        .limit(5)
        .select('title endDate priorityLevel status')
        .lean();
    } catch (e) { /* silently omit */ }
  }

  // Own leave balance from employee document
  if (canRead(roleId, 'employees')) {
    try {
      const emp = await models.employees.findById(userId)
        .select('leaveStatus')
        .populate('leaveStatus.leaveType', 'name')
        .lean();
      if (emp?.leaveStatus) {
        result.leaveBalance = emp.leaveStatus.map(ls => ({
          leaveType: ls.leaveType?.name || 'Unknown',
          leaveTypeId: ls.leaveType?._id,
          available: ls.available || 0,
          usedThisYear: ls.usedThisYear || 0,
          carriedForward: ls.carriedForward || 0
        }));
      }
    } catch (e) { /* silently omit */ }
  }

  return result;
}

// ─── Workforce Pulse ──────────────────────────────────────────────────────────

async function computePulse(roleId, userId, level) {
  if (!canRead(roleId, 'attendances') || !canRead(roleId, 'employees')) return null;

  const today = todayStart();

  try {
    // Determine scope: team (level 4-6) or org (level 7+)
    let employeeFilter = { status: 'Active' };
    if (level >= 4 && level <= 6) {
      // Team scope: direct reports of this user
      employeeFilter['professionalInfo.reportingManager'] = new mongoose.Types.ObjectId(userId);
    }
    // level >= 7 → org scope, no additional filter

    const activeEmployees = await models.employees.find(employeeFilter)
      .select('_id')
      .lean();

    const employeeIds = activeEmployees.map(e => e._id);
    const total = employeeIds.length;

    if (total === 0) return { total: 0, present: 0, leave: 0, wfh: 0, late: 0, unchecked: 0, lop: 0, attendanceRate: 0 };

    const todayAttendance = await models.attendances.find({
      employee: { $in: employeeIds },
      date: { $gte: today, $lte: todayEnd() }
    }).select('employee status').lean();

    const statusCounts = { Present: 0, Leave: 0, 'Work From Home': 0, 'Late Entry': 0, Unchecked: 0, LOP: 0, Absent: 0 };
    const checkedEmployees = new Set();

    todayAttendance.forEach(att => {
      checkedEmployees.add(att.employee.toString());
      if (att.status === 'Present' || att.status === 'Check-Out' || att.status === 'Early check-out') {
        statusCounts.Present++;
      } else if (att.status in statusCounts) {
        statusCounts[att.status]++;
      }
    });

    // Employees with no attendance record today = unchecked
    const uncheckedCount = total - checkedEmployees.size;
    statusCounts.Unchecked += uncheckedCount;

    const effectivePresent = statusCounts.Present + statusCounts['Work From Home'];
    const attendanceRate = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

    return {
      total,
      present: statusCounts.Present,
      leave: statusCounts.Leave,
      wfh: statusCounts['Work From Home'],
      late: statusCounts['Late Entry'],
      unchecked: statusCounts.Unchecked,
      lop: statusCounts.LOP,
      absent: statusCounts.Absent,
      attendanceRate
    };
  } catch (e) {
    return null;
  }
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

async function computeStatCards(roleId, userId, level) {
  const stats = {};
  const today = todayStart();

  // Manager (4-6): Pending Approvals, Overdue Tasks, Open Tickets
  // Admin (7-8): ALL Pending Approvals, Attendance Issues, Payroll Status
  // Executive (9): Overdue Tasks, Critical Tickets, Payroll Cost
  // MD (10): Workforce Health, Financial Exposure

  // --- Pending Approvals (Manager scope: managerId=self, Admin scope: all) ---
  if (level >= 4 && level <= 8) {
    let approvalCount = 0;
    const managerFilter = level <= 6 ? { managerId: new mongoose.Types.ObjectId(userId) } : {};

    if (canRead(roleId, 'leaves')) {
      try {
        approvalCount += await models.leaves.countDocuments({ ...managerFilter, status: 'Pending', metaStatus: 'active' });
      } catch (e) { /* skip */ }
    }
    if (canRead(roleId, 'regularizations')) {
      try {
        approvalCount += await models.regularizations.countDocuments({ ...managerFilter, status: 'Pending', metaStatus: 'active' });
      } catch (e) { /* skip */ }
    }
    if (canRead(roleId, 'wfhrequests')) {
      try {
        approvalCount += await models.wfhrequests.countDocuments({ ...managerFilter, status: 'Pending' });
      } catch (e) { /* skip */ }
    }
    if (canRead(roleId, 'compoffrequests')) {
      try {
        approvalCount += await models.compoffrequests.countDocuments({ ...managerFilter, status: 'Pending' });
      } catch (e) { /* skip */ }
    }

    stats.pendingApprovals = { value: approvalCount };
  }

  // --- Overdue Tasks (Manager: team scope, Executive: org scope) ---
  if ((level >= 4 && level <= 6) || level === 9) {
    if (canRead(roleId, 'tasks')) {
      try {
        let taskFilter = {
          endDate: { $lt: today },
          status: { $nin: ['Completed', 'Done'] },
          metaStatus: 'active'
        };

        if (level <= 6) {
          // Manager: tasks assigned to team members
          const teamMembers = await models.employees.find({
            'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
            status: 'Active'
          }).select('_id').lean();
          taskFilter.assignedTo = { $in: teamMembers.map(m => m._id) };
        }

        const overdueTasks = await models.tasks.find(taskFilter)
          .select('assignedTo')
          .populate('assignedTo', 'professionalInfo.department')
          .lean();

        // Department breakdown
        const deptBreakdown = {};
        for (const task of overdueTasks) {
          for (const assignee of (task.assignedTo || [])) {
            const deptId = assignee?.professionalInfo?.department?.toString() || 'unassigned';
            deptBreakdown[deptId] = (deptBreakdown[deptId] || 0) + 1;
          }
        }

        stats.overdueTasks = { value: overdueTasks.length, breakdown: deptBreakdown };
      } catch (e) {
        stats.overdueTasks = { value: 0, breakdown: {} };
      }
    }
  }

  // --- Open Tickets (Manager scope: team) ---
  if (level >= 4 && level <= 6) {
    if (canRead(roleId, 'tickets')) {
      try {
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id').lean();

        const count = await models.tickets.countDocuments({
          assignedTo: { $in: teamMembers.map(m => m._id) },
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        });
        stats.openTickets = { value: count };
      } catch (e) {
        stats.openTickets = { value: 0 };
      }
    }
  }

  // --- Attendance Issues (Admin/HR only) ---
  if (level >= 7 && level <= 8) {
    if (canRead(roleId, 'attendances')) {
      try {
        const issues = await models.attendances.aggregate([
          { $match: { date: { $gte: today, $lte: todayEnd() }, status: { $in: ['Late Entry', 'LOP', 'Unchecked'] } } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const issueMap = {};
        let totalIssues = 0;
        issues.forEach(i => { issueMap[i._id] = i.count; totalIssues += i.count; });
        stats.attendanceIssues = { value: totalIssues, breakdown: issueMap };
      } catch (e) {
        stats.attendanceIssues = { value: 0, breakdown: {} };
      }
    }
  }

  // --- Payroll Status (Admin 7-8, Executive 9, MD 10) ---
  if (level >= 7) {
    if (canRead(roleId, 'payrollruns')) {
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const run = await models.payrollruns.findOne({ month: currentMonth, year: currentYear })
          .sort({ createdAt: -1 })
          .select('status totalNet totalEmployees')
          .lean();

        if (level <= 8) {
          // Admin: show status
          stats.payrollStatus = {
            value: run?.status || 'Not Started',
            month: currentMonth,
            year: currentYear
          };
        }
        if (level === 9) {
          // Executive: show cost
          stats.payrollCost = {
            value: run?.totalNet || 0,
            status: run?.status || 'Not Started',
            month: currentMonth,
            year: currentYear
          };
        }
        if (level === 10) {
          // MD: financial exposure
          const lopCount = canRead(roleId, 'payrolls')
            ? await models.payrolls.countDocuments({ month: currentMonth, year: currentYear, lopDays: { $gt: 0 } })
            : 0;
          stats.financialExposure = {
            value: run?.totalNet || 0,
            lopImpact: lopCount,
            month: currentMonth,
            year: currentYear
          };
        }
      } catch (e) { /* skip */ }
    }
  }

  // --- Critical Tickets (Executive) ---
  if (level === 9) {
    if (canRead(roleId, 'tickets')) {
      try {
        const criticalTickets = await models.tickets.find({
          priority: 'Critical',
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        }).select('assignedTo').lean();

        const unassigned = criticalTickets.filter(t => !t.assignedTo || t.assignedTo.length === 0).length;
        stats.criticalTickets = { value: criticalTickets.length, unassigned };
      } catch (e) {
        stats.criticalTickets = { value: 0, unassigned: 0 };
      }
    }
  }

  // --- Workforce Health (MD) ---
  if (level === 10) {
    // Computed from pulse — will be merged in the route handler
    stats.workforceHealth = { value: null }; // placeholder, filled from pulse
  }

  // --- Asset Management Stats ---
  if (canRead(roleId, 'assets')) {
    try {
      stats.assetTotalCount = { value: await models.assets.countDocuments({ metaStatus: 'active' }) };
      stats.assetAvailableCount = { value: await models.assets.countDocuments({ status: 'Available', metaStatus: 'active' }) };
      stats.assetAllocatedCount = { value: await models.assets.countDocuments({ status: 'Allocated', metaStatus: 'active' }) };
      
      if (canRead(roleId, 'assetallocations')) {
        const managerFilter = level <= 6 ? { managerId: new mongoose.Types.ObjectId(userId) } : {};
        stats.assetPendingApproval = {
          value: await models.assetallocations.countDocuments({
            ...managerFilter,
            status: 'Pending Approval',
            metaStatus: 'active'
          })
        };
        stats.assetPendingReturn = {
          value: await models.assetallocations.countDocuments({
            ...managerFilter,
            status: 'Active',
            expectedReturn: { $lt: today },
            metaStatus: 'active'
          })
        };

        const activeAllocations = await models.assetallocations.find({
          ...managerFilter,
          status: 'Active',
          metaStatus: 'active'
        }).populate('employeeId', 'status').lean();

        stats.assetClearancePending = {
          value: activeAllocations.filter(alloc => 
            alloc.employeeId && (alloc.employeeId.status === 'Inactive' || alloc.employeeId.status === 'Terminated')
          ).length
        };
      } else {
        stats.assetPendingApproval = { value: 0 };
        stats.assetPendingReturn = { value: 0 };
        stats.assetClearancePending = { value: 0 };
      }
    } catch (e) {
      console.error("[DashboardService] Asset stats calculation error:", e.message);
    }
  }

  return stats;
}

// ─── Action Center ────────────────────────────────────────────────────────────

const URGENCY_BASE = {
  emergency_leave: 90,
  critical_ticket_unassigned: 85,
  critical_ticket_assigned: 80,
  overdue_task_gt2: 75,
  payroll_pending: 70,
  overdue_task_1: 65,
  leave_request: 50,
  regularization: 45,
  wfh_request: 40,
  compoff_request: 35,
};

function computeUrgencyScore(baseType, createdAt, affectsCount = 1, affectsPayroll = false, affectsClient = false) {
  let score = URGENCY_BASE[baseType] || 30;

  // Time modifier
  const hoursWaiting = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hoursWaiting > 48) score += 15;
  else if (hoursWaiting > 24) score += 10;
  else if (hoursWaiting > 8) score += 5;

  // Impact modifier
  if (affectsCount > 5) score += 10;
  if (affectsPayroll) score += 8;
  if (affectsClient) score += 5;

  return score;
}

async function computeActionCenter(roleId, userId, level) {
  const items = [];
  const managerFilter = (level >= 4 && level <= 6) ? { managerId: new mongoose.Types.ObjectId(userId) } : {};

  // Manager (4-6) & Admin (7-8): Pending leaves, regularizations, WFH, comp-off
  if (level >= 4 && level <= 8) {
    // Pending Leaves
    if (canRead(roleId, 'leaves')) {
      try {
        const pendingLeaves = await models.leaves.find({ ...managerFilter, status: 'Pending', metaStatus: 'active' })
          .sort({ createdAt: -1 })
          .limit(level <= 6 ? 20 : 50)
          .select('employeeName employeeId departmentId startDate endDate totalDays leaveName isEmergency createdAt')
          .populate('departmentId', 'name')
          .lean();

        pendingLeaves.forEach(l => {
          const baseType = l.isEmergency ? 'emergency_leave' : 'leave_request';
          items.push({
            id: l._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, l.createdAt),
            title: l.isEmergency ? 'Emergency Leave' : 'Leave Request',
            subtitle: `${l.employeeName || 'Employee'} · ${l.leaveName || 'Leave'} · ${l.totalDays}d`,
            department: l.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'leaves',
            sourceId: l._id,
            createdAt: l.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending Regularizations
    if (canRead(roleId, 'regularizations')) {
      try {
        const pending = await models.regularizations.find({ ...managerFilter, status: 'Pending', metaStatus: 'active' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeName employeeId departmentId requestDate createdAt')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(r => {
          items.push({
            id: r._id,
            type: 'regularization',
            urgencyScore: computeUrgencyScore('regularization', r.createdAt),
            title: 'Regularization Request',
            subtitle: `${r.employeeName || 'Employee'} · ${new Date(r.requestDate).toLocaleDateString()}`,
            department: r.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'regularizations',
            sourceId: r._id,
            createdAt: r.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending WFH
    if (canRead(roleId, 'wfhrequests')) {
      try {
        const pending = await models.wfhrequests.find({ ...managerFilter, status: 'Pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeId departmentId startDate endDate createdAt')
          .populate('employeeId', 'basicInfo.firstName basicInfo.lastName')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(w => {
          const empName = w.employeeId ? `${w.employeeId.basicInfo?.firstName || ''} ${w.employeeId.basicInfo?.lastName || ''}`.trim() : 'Employee';
          items.push({
            id: w._id,
            type: 'wfh_request',
            urgencyScore: computeUrgencyScore('wfh_request', w.createdAt),
            title: 'WFH Request',
            subtitle: `${empName} · ${new Date(w.startDate).toLocaleDateString()}`,
            department: w.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'wfhrequests',
            sourceId: w._id,
            createdAt: w.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending Comp-Off
    if (canRead(roleId, 'compoffrequests')) {
      try {
        const pending = await models.compoffrequests.find({ ...managerFilter, status: 'Pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeId departmentId workedDate hoursWorked createdAt')
          .populate('employeeId', 'basicInfo.firstName basicInfo.lastName')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(c => {
          const empName = c.employeeId ? `${c.employeeId.basicInfo?.firstName || ''} ${c.employeeId.basicInfo?.lastName || ''}`.trim() : 'Employee';
          items.push({
            id: c._id,
            type: 'compoff_request',
            urgencyScore: computeUrgencyScore('compoff_request', c.createdAt),
            title: 'Comp-Off Request',
            subtitle: `${empName} · ${c.hoursWorked}h worked`,
            department: c.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'compoffrequests',
            sourceId: c._id,
            createdAt: c.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // Manager (4-6): Overdue tasks (team), Critical tickets (team)
  if (level >= 4 && level <= 6) {
    if (canRead(roleId, 'tasks')) {
      try {
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id basicInfo.firstName basicInfo.lastName').lean();

        const overdue = await models.tasks.find({
          assignedTo: { $in: teamMembers.map(m => m._id) },
          endDate: { $lt: todayStart() },
          status: { $nin: ['Completed', 'Done'] },
          metaStatus: 'active'
        }).limit(5).select('title endDate assignedTo createdAt').lean();

        overdue.forEach(t => {
          const daysOverdue = Math.ceil((Date.now() - new Date(t.endDate).getTime()) / 86400000);
          const baseType = daysOverdue > 2 ? 'overdue_task_gt2' : 'overdue_task_1';
          items.push({
            id: t._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, t.createdAt),
            title: `Overdue: ${t.title}`,
            subtitle: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late`,
            actions: ['view', 'reassign'],
            sourceModel: 'tasks',
            sourceId: t._id,
            createdAt: t.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // Executive (9): Critical tickets (unassigned), overdue tasks (>2 days, all)
  if (level === 9) {
    if (canRead(roleId, 'tickets')) {
      try {
        const critical = await models.tickets.find({
          priority: 'Critical',
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        }).limit(5)
          .select('ticketId title assignedTo clientId startDate createdAt')
          .populate('clientId', 'name')
          .lean();

        critical.forEach(t => {
          const isUnassigned = !t.assignedTo || t.assignedTo.length === 0;
          const baseType = isUnassigned ? 'critical_ticket_unassigned' : 'critical_ticket_assigned';
          const hoursOld = Math.round((Date.now() - new Date(t.startDate || t.createdAt).getTime()) / 3600000);
          items.push({
            id: t._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, t.createdAt, 1, false, true),
            title: `${t.ticketId} — ${t.title}`,
            subtitle: `${t.clientId?.name || 'Unknown client'} · ${hoursOld}h old${isUnassigned ? ' · Unassigned' : ''}`,
            actions: isUnassigned ? ['assign'] : ['view', 'escalate'],
            sourceModel: 'tickets',
            sourceId: t._id,
            createdAt: t.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // MD (10): Aggregated items, max 3
  if (level === 10) {
    // Critical tickets aggregated
    if (canRead(roleId, 'tickets')) {
      try {
        const critCount = await models.tickets.countDocuments({
          priority: 'Critical',
          status: { $nin: ['Resolved', 'Closed'] },
          $or: [{ assignedTo: { $size: 0 } }, { assignedTo: { $exists: false } }],
          metaStatus: 'active'
        });
        if (critCount > 0) {
          items.push({
            id: 'agg_critical_tickets',
            type: 'critical_ticket_unassigned',
            urgencyScore: 90,
            title: `${critCount} critical ticket${critCount > 1 ? 's' : ''} unassigned`,
            subtitle: 'Requires delegation',
            actions: ['delegate_cto'],
            sourceModel: 'tickets',
            sourceId: null,
            createdAt: new Date()
          });
        }
      } catch (e) { /* skip */ }
    }
  }

  // Sort by urgency score descending
  items.sort((a, b) => b.urgencyScore - a.urgencyScore);

  // MD gets max 3 items
  if (level === 10) return items.slice(0, 3);

  return items;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function computeAlerts(stats, pulse, actionCenter) {
  const alerts = [];

  if (stats.overdueTasks?.value > 0) {
    alerts.push({
      type: 'overdue_task',
      severity: 'red',
      text: `${stats.overdueTasks.value} overdue task${stats.overdueTasks.value > 1 ? 's' : ''}`,
      count: stats.overdueTasks.value
    });
  }

  if (stats.criticalTickets?.unassigned > 0) {
    alerts.push({
      type: 'critical_ticket',
      severity: 'red',
      text: `${stats.criticalTickets.unassigned} critical ticket${stats.criticalTickets.unassigned > 1 ? 's' : ''} unassigned`,
      count: stats.criticalTickets.unassigned
    });
  }

  // Emergency leaves in action center
  const emergencyLeaves = actionCenter.filter(i => i.type === 'emergency_leave');
  if (emergencyLeaves.length > 0) {
    alerts.push({
      type: 'emergency_leave',
      severity: 'red',
      text: `${emergencyLeaves.length} emergency leave${emergencyLeaves.length > 1 ? 's' : ''} pending`,
      count: emergencyLeaves.length
    });
  }

  // Attendance rate alert (pulse)
  if (pulse && pulse.attendanceRate < 70) {
    alerts.push({
      type: 'low_attendance',
      severity: 'red',
      text: `Attendance at ${pulse.attendanceRate}% (below target)`,
      count: pulse.unchecked + pulse.absent
    });
  }

  // Payroll closing alert
  if (stats.payrollStatus) {
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    if (daysLeft <= 5 && stats.payrollStatus.value !== 'Approved' && stats.payrollStatus.value !== 'Paid') {
      alerts.push({
        type: 'payroll_closing',
        severity: 'orange',
        text: `Payroll closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        count: daysLeft
      });
    }
  }

  // Unchecked employees (Admin/HR)
  if (pulse && pulse.unchecked > 0) {
    alerts.push({
      type: 'unchecked_employees',
      severity: 'orange',
      text: `${pulse.unchecked} unchecked employee${pulse.unchecked > 1 ? 's' : ''}`,
      count: pulse.unchecked
    });
  }

  return alerts;
}

// ─── Team Attendance Grid (Manager) ───────────────────────────────────────────

async function computeTeamGrid(roleId, userId) {
  if (!canRead(roleId, 'attendances') || !canRead(roleId, 'employees')) return null;

  try {
    const teamMembers = await models.employees.find({
      'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
      status: 'Active',
      isActive: true
    })
      .select('basicInfo.firstName basicInfo.lastName basicInfo.profileImage')
      .lean();

    if (teamMembers.length === 0) return [];

    const today = todayStart();
    const attendance = await models.attendances.find({
      employee: { $in: teamMembers.map(m => m._id) },
      date: { $gte: today, $lte: todayEnd() }
    }).select('employee status checkIn').lean();

    const attMap = {};
    attendance.forEach(a => { attMap[a.employee.toString()] = a; });

    return teamMembers.map(m => {
      const att = attMap[m._id.toString()];
      return {
        employeeId: m._id,
        name: `${m.basicInfo?.firstName || ''} ${m.basicInfo?.lastName || ''}`.trim(),
        profileImage: m.basicInfo?.profileImage || null,
        status: att?.status || 'Unchecked',
        checkIn: att?.checkIn || null
      };
    })
      // Sort: unchecked first → late → leave → present
      .sort((a, b) => {
        const priority = { Unchecked: 0, 'Late Entry': 1, Leave: 2, LOP: 3, Absent: 4, 'Work From Home': 5, Present: 6, 'Check-Out': 7 };
        return (priority[a.status] ?? 10) - (priority[b.status] ?? 10);
      })
      .slice(0, 10);
  } catch (e) {
    return null;
  }
}

// ─── Main Aggregation Function ────────────────────────────────────────────────

export async function getDashboardStats(userId, roleId) {
  const level = getRoleLevel(roleId);
  const variant = getLayoutVariant(level);

  const result = {
    layoutVariant: variant,
    roleLevel: level,
    pulse: null,
    stats: {},
    alerts: [],
    actionCenter: [],
    employee: null,
    teamGrid: null
  };

  // Run computations in parallel based on variant
  const promises = [];

  // Employee stats (all levels get their own attendance/tasks/leave)
  if (level <= 3) {
    promises.push(computeEmployeeStats(userId, roleId).then(d => { result.employee = d; }));
  }

  // Pulse (level 4+)
  if (level >= 4) {
    promises.push(computePulse(roleId, userId, level).then(d => { result.pulse = d; }));
  }

  // Stat cards (level 4+)
  if (level >= 4) {
    promises.push(computeStatCards(roleId, userId, level).then(d => { result.stats = d; }));
  }

  // Action center (level 4+)
  if (level >= 4) {
    promises.push(computeActionCenter(roleId, userId, level).then(d => { result.actionCenter = d; }));
  }

  // Team grid (Manager only, level 4-6)
  if (level >= 4 && level <= 6) {
    promises.push(computeTeamGrid(roleId, userId).then(d => { result.teamGrid = d; }));
  }

  await Promise.all(promises);

  // Post-processing: fill MD workforce health from pulse
  if (level === 10 && result.pulse) {
    result.stats.workforceHealth = {
      value: result.pulse.attendanceRate,
      label: result.pulse.attendanceRate >= 85 ? 'Healthy' : result.pulse.attendanceRate >= 70 ? 'Caution' : 'Critical',
      color: result.pulse.attendanceRate >= 85 ? 'green' : result.pulse.attendanceRate >= 70 ? 'yellow' : 'red',
      late: result.pulse.late,
      lop: result.pulse.lop
    };
  }

  // Alerts (derived from stats + pulse + action center)
  if (level >= 4) {
    result.alerts = computeAlerts(result.stats, result.pulse, result.actionCenter);
  }

  return result;
}

export default { getDashboardStats, getLayoutVariant };
