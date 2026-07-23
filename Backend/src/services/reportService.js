import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Onboarding from '../models/Onboarding.js';
import Payroll from '../models/Payroll.js';
import PayrollRun from '../models/PayrollRun.js';
import SalaryStructure from '../models/SalaryStructure.js';
import EmployeeLifecycleHistory from '../models/EmployeeLifecycleHistory.js';
import Tasks from '../models/Tasks.js';
import Ticket from '../models/Ticket.js';
import Asset from '../models/Asset.js';
import AssetAllocation from '../models/AssetAllocation.js';
import Expense from '../models/Expense.js';
import Quotation from '../models/Quotation.js';
import OrderAcknowledgment from '../models/OrderAcknowledgment.js';
import CRMActivity from '../models/CRMActivity.js';
import ErrorLog from '../models/ErrorLog.js';

class ReportService {
  // Helper to convert JSON array to CSV string
  toCSV(data, headers) {
    if (!data || data.length === 0) {
      return headers ? headers.join(',') + '\n' : '';
    }
    const keys = headers || Object.keys(data[0]);
    const headerRow = keys.join(',');
    const rows = data.map(row =>
      keys.map(k => {
        let val = row[k] ?? '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('\n') || val.includes('"'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  }

  // ── 1. HR & Employee Lifecycle Reports ──

  async getDailyAttendanceReport(dateStr, departmentId = null) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const empQuery = { status: 'Active', isDeleted: false };
    if (departmentId) empQuery['professionalInfo.department'] = departmentId;

    const employees = await Employee.find(empQuery)
      .populate('professionalInfo.department', 'name')
      .populate('professionalInfo.designation', 'title name')
      .lean();

    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    const attendanceMap = new Map();
    attendanceRecords.forEach(a => {
      const empId = (a.employee || a.employeeId)?._id || a.employee || a.employeeId;
      if (empId) {
        attendanceMap.set(empId.toString(), a);
      }
    });

    return employees.map(emp => {
      const att = attendanceMap.get(emp._id.toString());
      const checkInTime = att?.checkIn || att?.clockIn;
      const checkOutTime = att?.checkOut || att?.clockOut;

      return {
        empId: emp.professionalInfo?.empId || '-',
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
        department: emp.professionalInfo?.department?.name || '-',
        designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
        status: att ? att.status : 'Absent',
        clockIn: checkInTime ? new Date(checkInTime).toLocaleTimeString('en-IN') : '-',
        clockOut: checkOutTime ? new Date(checkOutTime).toLocaleTimeString('en-IN') : '-',
        lateMinutes: att?.lateMinutes || 0,
        workLocation: att?.workLocation || 'Office'
      };
    });
  }

  async getDailyOnboardingSLAReport() {
    const onboardings = await Onboarding.find({ isDeleted: { $ne: true } })
      .populate('employeeId', 'basicInfo professionalInfo authInfo')
      .populate('candidateId', 'firstName lastName email phone')
      .populate('department', 'name')
      .populate('reportingTo', 'basicInfo.firstName basicInfo.lastName')
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return onboardings.map(onb => {
      const isOverdue = onb.targetCompletionDate && new Date(onb.targetCompletionDate) < today && onb.status !== 'Completed';
      return {
        onboardingId: onb._id.toString(),
        candidateName: onb.candidateId ? `${onb.candidateId.firstName} ${onb.candidateId.lastName || ''}`.trim() : (onb.employeeId?.basicInfo?.firstName || '-'),
        department: onb.department?.name || '-',
        joiningDate: onb.joiningDate ? new Date(onb.joiningDate).toLocaleDateString() : '-',
        targetCompletionDate: onb.targetCompletionDate ? new Date(onb.targetCompletionDate).toLocaleDateString() : '-',
        status: onb.status || 'Pending',
        completionPercent: `${onb.completionPercent || 0}%`,
        verifiedPercent: `${onb.verifiedPercent || 0}%`,
        isSLAOverdue: isOverdue ? 'YES' : 'NO',
        reportingManager: onb.reportingTo ? `${onb.reportingTo.basicInfo?.firstName || ''} ${onb.reportingTo.basicInfo?.lastName || ''}`.trim() : '-'
      };
    });
  }

  async getLifecycleAuditReport(startDateStr, endDateStr, changeType = null) {
    const query = { isDeleted: false };
    if (startDateStr || endDateStr) {
      query.effectiveDate = {};
      if (startDateStr) query.effectiveDate.$gte = new Date(startDateStr);
      if (endDateStr) query.effectiveDate.$lte = new Date(endDateStr);
    }
    if (changeType) query.changeType = changeType;

    const logs = await EmployeeLifecycleHistory.find(query)
      .populate('employeeId', 'basicInfo professionalInfo')
      .populate('changedBy', 'basicInfo.firstName basicInfo.lastName')
      .sort({ effectiveDate: -1 })
      .lean();

    return logs.map(log => ({
      logId: log._id.toString(),
      empId: log.employeeId?.professionalInfo?.empId || '-',
      employeeName: log.employeeId ? `${log.employeeId.basicInfo?.firstName || ''} ${log.employeeId.basicInfo?.lastName || ''}`.trim() : '-',
      changeType: log.changeType,
      effectiveDate: new Date(log.effectiveDate).toLocaleDateString('en-IN'),
      previousValue: JSON.stringify(log.previousValue || ''),
      newValue: JSON.stringify(log.newValue || ''),
      changedBy: log.changedBy ? `${log.changedBy.basicInfo?.firstName || ''} ${log.changedBy.basicInfo?.lastName || ''}`.trim() : 'System',
      reason: log.reason || '-'
    }));
  }

  async getHeadcountAnalytics() {
    const employees = await Employee.find({ isDeleted: false })
      .populate('professionalInfo.department', 'name')
      .populate('professionalInfo.designation', 'title name')
      .lean();

    const deptCounts = {};
    const statusCounts = {};

    employees.forEach(emp => {
      const dept = emp.professionalInfo?.department?.name || 'Unassigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      statusCounts[emp.status] = (statusCounts[emp.status] || 0) + 1;
    });

    return {
      totalEmployees: employees.length,
      departmentBreakdown: deptCounts,
      statusBreakdown: statusCounts
    };
  }

  // ── 2. Payroll & Statutory Compliance Reports ──

  async getMonthlyPayrollRegister(month, year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const payrolls = await Payroll.find({ month: m, year: y })
      .populate({
        path: 'employeeId',
        select: 'basicInfo professionalInfo personalDocuments accountDetails',
        populate: [
          { path: 'professionalInfo.department', select: 'name' },
          { path: 'professionalInfo.designation', select: 'title name' }
        ]
      })
      .lean();

    return payrolls.map(p => {
      const emp = p.employeeId || {};
      const basic = p.earnings?.find(e => e.name?.toLowerCase().includes('basic'))?.amount || p.grossSalary * 0.5;
      const pfEE = p.deductions?.find(d => d.name?.toLowerCase().includes('pf'))?.amount || 0;
      const esiEE = p.deductions?.find(d => d.name?.toLowerCase().includes('esi'))?.amount || 0;
      const tds = p.deductions?.find(d => d.name?.toLowerCase().includes('tds') || d.name?.toLowerCase().includes('tax'))?.amount || 0;

      return {
        empId: emp.professionalInfo?.empId || '-',
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
        department: emp.professionalInfo?.department?.name || '-',
        designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
        monthYear: `${m}/${y}`,
        basicSalary: Math.round(basic),
        grossSalary: Math.round(p.grossSalary || 0),
        pfEmployee: Math.round(pfEE),
        esiEmployee: Math.round(esiEE),
        tdsDeduction: Math.round(tds),
        totalDeductions: Math.round(p.totalDeductions || 0),
        netPayable: Math.round(p.netPay || 0),
        paymentStatus: p.status || 'Pending'
      };
    });
  }

  async getBankAdviceExport(month, year) {
    const data = await this.getMonthlyPayrollRegister(month, year);
    const payrolls = await Payroll.find({ month: parseInt(month, 10), year: parseInt(year, 10) })
      .populate('employeeId', 'basicInfo professionalInfo accountDetails')
      .lean();

    return payrolls.map(p => {
      const emp = p.employeeId || {};
      const acc = emp.accountDetails || {};
      return {
        employeeId: emp.professionalInfo?.empId || '-',
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
        bankName: acc.bankName || 'HDFC Bank',
        accountNumber: acc.accountNo || '-',
        ifscCode: acc.ifscCode || '-',
        branch: acc.branch || '-',
        netAmount: Math.round(p.netPay || 0),
        currency: 'INR',
        narration: `Salary payout for ${month}/${year}`
      };
    });
  }

  async getPFECRReport(month, year) {
    const payrolls = await Payroll.find({ month: parseInt(month, 10), year: parseInt(year, 10) })
      .populate('employeeId', 'basicInfo professionalInfo personalDocuments')
      .lean();

    return payrolls.map(p => {
      const emp = p.employeeId || {};
      const gross = Math.round(p.grossSalary || 0);
      const epfWages = Math.min(gross, 15000);
      const eePF = Math.round(epfWages * 0.12);
      const epsER = Math.round(epfWages * 0.0833);
      const epfER = eePF - epsER;

      return {
        uan: emp.personalDocuments?.pf || '100000000000',
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
        grossWages: gross,
        epfWages,
        epsWages: epfWages,
        edliWages: epfWages,
        epfEEAmount: eePF,
        epsERAmount: epsER,
        epfERAmount: epfER,
        ncpDays: p.unpaidLeaveDays || 0,
        refundOfAdv: 0
      };
    });
  }

  async getESIMonthlyReturn(month, year) {
    const payrolls = await Payroll.find({ month: parseInt(month, 10), year: parseInt(year, 10) })
      .populate('employeeId', 'basicInfo personalDocuments')
      .lean();

    return payrolls.map(p => {
      const emp = p.employeeId || {};
      const gross = Math.round(p.grossSalary || 0);
      const eeESI = Math.round(gross * 0.0075);
      const erESI = Math.round(gross * 0.0325);

      return {
        ipNumber: emp.personalDocuments?.esi || '3100000000',
        ipName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
        daysWorked: p.payableDays || 26,
        totalWages: gross,
        employeeESIContribution: eeESI,
        employerESIContribution: erESI,
        reasonForZeroWages: gross === 0 ? 'On Leave Without Pay' : '-'
      };
    });
  }

  // ── 3. Task, Sprint & Productivity Reports ──

  async getSprintVelocityReport() {
    const tasks = await Tasks.find({ isDeleted: { $ne: true } })
      .populate('sprintId', 'name')
      .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName')
      .lean();

    const sprintMap = {};
    tasks.forEach(t => {
      const sName = t.sprintId?.name || 'Backlog';
      if (!sprintMap[sName]) {
        sprintMap[sName] = { sprintName: sName, totalTasks: 0, completedTasks: 0, overdueTasks: 0 };
      }
      sprintMap[sName].totalTasks++;
      if (t.status === 'Completed' || t.status === 'Done') sprintMap[sName].completedTasks++;
      if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed') sprintMap[sName].overdueTasks++;
    });

    return Object.values(sprintMap);
  }

  // ── 4. Assets & Inventory Reports ──

  async getAssetStockLedgerReport() {
    const assets = await Asset.find({ isDeleted: { $ne: true } })
      .populate('category', 'name')
      .lean();

    const allocations = await AssetAllocation.find({ status: 'Active' })
      .populate('employeeId', 'basicInfo.firstName basicInfo.lastName professionalInfo.empId')
      .lean();

    const allocationMap = new Map();
    allocations.forEach(a => allocationMap.set(a.assetId?.toString(), a));

    return assets.map(asset => {
      const alloc = allocationMap.get(asset._id.toString());
      return {
        assetTag: asset.assetTag || asset.serialNumber || '-',
        assetName: asset.name || '-',
        category: asset.category?.name || '-',
        status: asset.status || 'Available',
        assignedTo: alloc?.employeeId ? `${alloc.employeeId.basicInfo?.firstName || ''} (${alloc.employeeId.professionalInfo?.empId || ''})` : 'Unassigned / In Stock',
        allocatedDate: alloc?.allocatedDate ? new Date(alloc.allocatedDate).toLocaleDateString() : '-'
      };
    });
  }

  // ── 5. CRM & Commercial Pipeline Reports ──

  async getCRMActivityPipelineReport() {
    const activities = await CRMActivity.find({ isDeleted: { $ne: true } })
      .populate('client', 'name')
      .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName')
      .lean();

    return activities.map(act => ({
      activityId: act._id.toString(),
      type: act.type || 'Meeting',
      client: act.client?.name || '-',
      assignedTo: act.assignedTo ? `${act.assignedTo.basicInfo?.firstName || ''} ${act.assignedTo.basicInfo?.lastName || ''}`.trim() : '-',
      status: act.status || 'Pending',
      scheduledDate: act.scheduledDate ? new Date(act.scheduledDate).toLocaleDateString() : '-'
    }));
  }

  // ── 6. System Exception & Audit Trail Log ──

  async getSystemExceptionAuditReport() {
    const logs = await ErrorLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return logs.map(l => ({
      errorId: l._id.toString(),
      timestamp: new Date(l.createdAt).toLocaleString('en-IN'),
      level: l.level || 'ERROR',
      message: l.message || '-',
      jobId: l.metadata?.jobId || '-',
      recipient: l.metadata?.recipient || '-'
    }));
  }
}

export default new ReportService();
