import Attendance from "../models/Attendance.js";
import { sendNotification } from "../utils/notificationService.js";
import { generateNotification } from "../middlewares/notificationMessagePrasher.js";

/**
 * Synchronizes Time Tracker session activity back to the Attendance record.
 * Keeps attendance logic inside attendances.js.
 */
export async function syncAttendanceForTimeTracker(userId, startTime, endTime, status, duration) {
  const { default: models } = await import('../models/Collection.js');
  const { buildQuery } = await import('../utils/policy/policyEngine.js');
  
  // Get date of the session at midnight UTC to match Attendance date key
  const sessionDate = new Date(startTime);
  sessionDate.setUTCHours(0, 0, 0, 0);
  
  // 1. Find existing Attendance record for the user and date
  let attendance = await models.attendances.findOne({
    employee: userId,
    date: sessionDate
  });
  
  if (!attendance) {
    console.log(`[TimeTrackerSync] No attendance record found for user ${userId} on ${sessionDate.toISOString().split('T')[0]}. Auto-checking in...`);
    
    // Auto-create attendance using buildQuery to trigger validation and hooks
    const employee = await models.employees.findById(userId).populate('professionalInfo.role').lean();
    if (employee) {
      try {
        const roleId = employee.professionalInfo?.role?._id?.toString() || employee.professionalInfo?.role?.toString();
        await buildQuery({
          role: roleId || 'Super Admin',
          userId: userId.toString(),
          action: 'create',
          modelName: 'attendances',
          body: {
            employee: userId,
            employeeName: `${employee.basicInfo?.firstName || ''} ${employee.basicInfo?.lastName || ''}`.trim(),
            managerId: employee.professionalInfo?.reportingManager,
            date: sessionDate,
            checkIn: startTime,
            checkOut: status === 'completed' ? endTime : null,
            workType: 'fixed',
            status: 'Present'
          }
        });
        console.log('[TimeTrackerSync] Attendance auto-created successfully.');
      } catch (err) {
        console.error('[TimeTrackerSync] Failed to auto-create attendance:', err.message);
      }
    }
  } else {
    // Attendance already exists!
    const updates = {};
    if (['Absent', 'Unchecked'].includes(attendance.status)) {
      updates.status = 'Present';
    }
    
    if (status === 'completed') {
      const sessionHours = duration / 3600;
      
      // If punches do not exist, we update checkIn/checkOut and workHours directly on attendance
      if (!attendance.punches || attendance.punches.length === 0) {
        if (!attendance.checkIn) updates.checkIn = startTime;
        if (!attendance.checkOut) updates.checkOut = endTime;
        if (!attendance.workHours || attendance.workHours < sessionHours) {
          updates.workHours = Math.round(sessionHours * 100) / 100;
        }
      } else {
        // If punches exist, extend the last punch's checkout to match the time tracker session end time
        // this dynamically increases the workHours calculated by the pre('save') hook
        const punches = [...(attendance.punches || [])];
        if (punches.length > 0) {
          const lastPunch = punches[punches.length - 1];
          if (lastPunch.checkIn && (!lastPunch.checkOut || new Date(lastPunch.checkOut) < new Date(endTime))) {
            lastPunch.checkOut = endTime;
            updates.punches = punches;
            updates.checkOut = endTime;
          }
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      try {
        const employee = await models.employees.findById(userId).populate('professionalInfo.role').lean();
        const roleId = employee?.professionalInfo?.role?._id?.toString() || employee?.professionalInfo?.role?.toString();
        
        await buildQuery({
          role: roleId || 'Super Admin',
          userId: userId.toString(),
          action: 'update',
          modelName: 'attendances',
          docId: attendance._id.toString(),
          body: updates
        });
        console.log('[TimeTrackerSync] Attendance updated successfully:', updates);
      } catch (err) {
        console.error('[TimeTrackerSync] Failed to update attendance:', err.message);
      }
    }
  }
}

/**
 * Attendance Service
 * Handles create + update lifecycle
 */
export default function attendances() {
  return {
    // ---------------- BEFORE CREATE ----------------
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      const userId = user?.id;
      const designation = undefined;
      const today = new Date();
      const isSunday = today.getDay() === 0;
      const isSaturday = today.getDay() === 6;

      let isAlternative = false;

      // Check alternate Saturday logic
      if (isSaturday) {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        const lastWeekIso = lastWeek.toISOString().split("T")[0];

        const lastSatAttendance = await Attendance.findOne({
          employee: userId,
          checkIn: {
            $gte: new Date(`${lastWeekIso}T00:00:00Z`),
            $lte: new Date(`${lastWeekIso}T23:59:59Z`),
          },
        });

        isAlternative = !!lastSatAttendance;
      }

      const isAgent = body.employeeModel === "agents";

      // Sunday OR Developer & alt Saturday → set request workflow (Employees only)
      if (
        !isAgent &&
        (isSunday || (designation?.toLowerCase() === "developer" && isAlternative))
      ) {
        body.request = body.status;
        body.status = "Pending";
      } else {
        // Normal attendance logic
        if (!isAgent && body.workType === "fixed") {
          const checkIn = new Date(body.checkIn);
          // Convert to IST offset (+5.5 hours) for timezone-independent local check
          const istTime = new Date(checkIn.getTime() + (330 * 60 * 1000));
          const checkInMinutes = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
          const cutOff = 10 * 60 + 20; // 10:20 AM
          body.status = checkInMinutes > cutOff ? "Late Entry" : "Present";
        } else {
          body.status = "Present";
        }
      }

      // Initialize punches array on first check-in of the day
      if (body.checkIn) {
        body.punches = [{
          checkIn: new Date(body.checkIn),
          location: body.location
        }];
      }

      // Automatically resolve employeeName if not provided
      if (!body.employeeName) {
        if (isAgent) {
          const { default: Agent } = await import("../models/Agent.js");
          const agent = await Agent.findById(body.employee || userId).lean();
          if (agent) {
            body.employeeName = agent.name;
          }
        } else {
          const { default: Employee } = await import("../models/Employee.js");
          const employee = await Employee.findById(body.employee || userId).lean();
          if (employee) {
            body.employeeName = `${employee.basicInfo?.firstName} ${employee.basicInfo?.lastName}`;
          }
        }
      }

      return body;
    },

    // ---------------- AFTER CREATE ----------------
    afterCreate: async (ctx) => {
      const { modelName, docId, user } = ctx;
      const userId = user?.id;
      const attendanceDoc = await Attendance.findById(docId);
      if (!attendanceDoc) return;

      const request = attendanceDoc.status;

      // Skip for these statuses
      if (["Present", "Check-Out", "Check-In"].includes(request)) {
        // Recovery trigger on check-in
        if (["Present", "Late Entry"].includes(attendanceDoc.status)) {
          try {
            const { default: models } = await import('../models/Collection.js');
            const { scheduleETARecalculation } = await import('../utils/scheduleETARecalculation.js');
            
            await models.operationalevents.updateMany(
              { employeeId: attendanceDoc.employee, type: 'SLA_DELAY', resolvedAt: { $exists: false } },
              { $set: { resolvedAt: new Date() } }
            );
            
            scheduleETARecalculation(attendanceDoc.employee.toString());
          } catch (err) {
            console.error('[AttendanceService] Recovery trigger failed in afterCreate:', err.message);
          }
        }
        return;
      }

      const message = generateNotification(
        attendanceDoc.employeeName,
        request,
        modelName
      );

      const receiverId = attendanceDoc.managerId;
      if (!receiverId) {
        return;
      }
      await sendNotification({
        sender: userId,
        receiver: receiverId,
        type: 'attendance_request',
        title: 'Attendance Request',
        message,
        relatedModel: 'Attendance',
        relatedId: attendanceDoc._id,
      });
    },

    // ---------------- BEFORE UPDATE ----------------
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const attendanceDoc = await Attendance.findById(docId);
      if (!attendanceDoc) return;

      // ── Period Closure Lock Check ───────────────────────────────────────────
      try {
        const { default: models } = await import('../models/Collection.js');
        if (models.periodclosures && attendanceDoc.date) {
          const targetDate = new Date(attendanceDoc.date);
          const closure = await models.periodclosures.findOne({
            startDate: { $lte: targetDate },
            endDate: { $gte: targetDate },
            status: { $in: ['Closed', 'In Progress'] },
            'modules.attendance.closed': true
          }).lean();

          if (closure && !body._forceUnlock) {
            throw new Error(
              `Attendance for ${new Date(attendanceDoc.date).toDateString()} is locked — ` +
              `Period ${closure.periodLabel} is closed for attendance. ` +
              `Attendance module was locked on ${closure.modules.attendance.closedAt ? new Date(closure.modules.attendance.closedAt).toLocaleDateString() : 'unknown'}. ` +
              `Submit a Regularization Request or contact Finance to reopen the period.`
            );
          }
        }
      } catch (err) {
        if (err.message?.includes('locked') && !err.message?.includes('payroll')) throw err;
      }

      // ── Payroll Lock Gate ──────────────────────────────────────────────────
      // Once payroll is marked Paid for this period, attendance becomes immutable.
      // HR Admins can bypass with _forceUnlock: true (for regularization corrections).
      // _forceUnlock is stripped before DB write — it's a transient instruction only.
      if (attendanceDoc.payrollLockedAt) {
        if (!body._forceUnlock) {
          throw new Error(
            `Attendance for ${new Date(attendanceDoc.date).toDateString()} is locked — ` +
            `payroll was processed and paid on ${new Date(attendanceDoc.payrollLockedAt).toDateString()}. ` +
            `Submit a Regularization Request or contact HR Admin for corrections.`
          );
        }
        // HR Admin override: strip the flag before the record hits DB
        delete body._forceUnlock;
      }
      // ── End Payroll Lock Gate ─────────────────────────────────────────────

      const punches = attendanceDoc.punches || [];

      // Determine if this is a check-in or a check-out update
      const isCheckIn = !!body.checkIn && !body.checkOut;
      const isCheckOut = !!body.checkOut;

      if (isCheckIn) {
        const newCheckIn = new Date(body.checkIn);
        
        // Push a new punch block if last punch is closed, or punches are empty
        const lastPunch = punches[punches.length - 1];
        if (!lastPunch || lastPunch.checkOut) {
          punches.push({
            checkIn: newCheckIn,
            location: body.location
          });
        }
        
        body.punches = punches;
        body.checkIn = attendanceDoc.checkIn || newCheckIn; // keep first checkIn
        body.checkOut = null; // reset checkOut to show active check-in

        let totalMs = 0;
        punches.forEach(p => {
          if (p.checkIn && p.checkOut) {
            totalMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
          }
        });
        body.workHours = Math.min(24, totalMs / (1000 * 60 * 60));

        if (!attendanceDoc.checkIn) {
          const istTime = new Date(newCheckIn.getTime() + (330 * 60 * 1000));
          const checkInMinutes = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
          const cutOff = 10 * 60 + 20; // 10:20 AM
          body.status = checkInMinutes > cutOff ? "Late Entry" : "Present";
        } else {
          body.status = "Present";
        }
      } else if (isCheckOut) {
        const newCheckOut = new Date(body.checkOut);
        
        if (punches.length === 0) {
          punches.push({
            checkIn: attendanceDoc.checkIn || newCheckOut,
            checkOut: newCheckOut,
            location: body.location
          });
        } else {
          const lastPunch = punches[punches.length - 1];
          if (!lastPunch.checkOut) {
            lastPunch.checkOut = newCheckOut;
            if (body.location) {
              lastPunch.location = body.location;
            }
          } else {
            lastPunch.checkOut = newCheckOut;
          }
        }

        body.punches = punches;
        body.checkIn = attendanceDoc.checkIn || punches[0].checkIn;
        body.checkOut = newCheckOut;

        let totalMs = 0;
        punches.forEach(p => {
          if (p.checkIn && p.checkOut) {
            totalMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
          }
        });
        body.workHours = Math.min(24, totalMs / (1000 * 60 * 60));

        // Resolve employee gender dynamically from Database
        let isEarly = false;
        if (attendanceDoc.employeeModel === "agents") {
          isEarly = false; // Agents do not have early checkout constraints
        } else {
          const { default: Employee } = await import("../models/Employee.js");
          const employee = await Employee.findById(attendanceDoc.employee).lean();
          const isMale = employee?.basicInfo?.gender === "male";
          
          const workedMinutes = body.workHours * 60;
          const femaleWorkingTime = workedMinutes >= 7.5 * 60;
          const maleWorkingTime = workedMinutes >= 8.5 * 60;

          // Convert check-out time to IST offset (+5.5 hours) for timezone-independent check
          const checkOutIst = new Date(newCheckOut.getTime() + (330 * 60 * 1000));
          const checkOutMinutes = checkOutIst.getUTCHours() * 60 + checkOutIst.getUTCMinutes();
          const femaleCutOff = 18 * 60 + 30; // 6:30 PM
          const maleCutOff = 19 * 60 + 30; // 7:30 PM

          isEarly =
            (!isMale && (!femaleWorkingTime || checkOutMinutes < femaleCutOff)) ||
            (isMale && (!maleWorkingTime || checkOutMinutes < maleCutOff));
        }

        body.status = isEarly ? "Early check-out" : "Check-Out";
      }

      return body;
    },

    // ---------------- AFTER UPDATE ----------------
    afterUpdate: async (ctx) => {
      const { modelName, docId, body, user } = ctx;
      const userId = user?.id;
      const attendanceDoc = await Attendance.findById(docId);
      if (!attendanceDoc) return;

      const request = attendanceDoc.request || attendanceDoc.status;
      
      // Feature: Task Status Domain Service - Auto-Hold tasks on checkout
      if (request === "Check-Out" || request === "Early check-out" || body.checkOut) {
        try {
          // Dynamic import or require to avoid circular dependencies if any
          const { taskStatusService } = await import('./taskStatus/taskStatusService.js');
          await taskStatusService.handleEmployeeCheckout(attendanceDoc.employee, userId);
        } catch (err) {
          console.error('[AttendanceService] Failed to trigger taskStatusService on checkout:', err);
        }

        try {
          // Auto-pause active time tracking session on checkout
          const { pauseActiveTimerOnCheckout } = await import('./timetrackersessions.js');
          await pauseActiveTimerOnCheckout(attendanceDoc.employee);
        } catch (err) {
          console.error('[AttendanceService] Failed to auto-pause time tracker on checkout:', err);
        }

        // ── Auto Half-Day + Overtime Detection ──────────────────────────────
        // Only runs on checkout when workHours is finalized
        if (attendanceDoc.workHours > 0) {
          try {
            const { default: models } = await import('../models/Collection.js');
            const { Shift, ShiftAssignment } = await import('../models/Shift.js');

            // Resolve shift config for this employee
            const assignment = await ShiftAssignment.findOne({
              employeeId: attendanceDoc.employee,
              isActive: true
            }).lean();
            const shift = assignment ? await Shift.findById(assignment.shiftId).lean() : null;

            const shiftWorkingHours = shift?.workingHours || 8;
            const overtimeThresholdMins = shift?.overtimeThreshold || 480; // default 8 hrs

            // Resolve attendance policy for half-day threshold
            const policy = await models.attendancepolicies.findOne({ isActive: true }).lean();
            const halfDayHours = policy?.halfDayHours || 4;
            const fullDayHours = policy?.fullDayHours || 8;

            const workedHours = attendanceDoc.workHours;
            const patchFields = {};

            // Auto Half-Day: worked more than minimum but less than half-day threshold
            if (workedHours > 0 && workedHours < halfDayHours && attendanceDoc.status === 'Check-Out') {
              patchFields.status = 'Half Day';
              console.log(`[AttendanceService] Auto Half-Day: ${workedHours.toFixed(1)}h < ${halfDayHours}h threshold`);
            }

            // Overtime: worked beyond the shift's overtime threshold
            const overtimeThresholdHrs = overtimeThresholdMins / 60;
            if (workedHours > overtimeThresholdHrs) {
              patchFields.overtimeHours = Math.round((workedHours - overtimeThresholdHrs) * 100) / 100;
              console.log(`[AttendanceService] Overtime detected: ${patchFields.overtimeHours}h beyond ${overtimeThresholdHrs}h threshold`);
            }

            // Direct DB patch to avoid infinite hook loops
            if (Object.keys(patchFields).length > 0) {
              await Attendance.findByIdAndUpdate(docId, { $set: patchFields });
            }
          } catch (err) {
            console.error('[AttendanceService] Auto Half-Day/Overtime detection error:', err.message);
          }
        }
      }

      if (["Present", "Check-Out", "Check-In"].includes(request)) {
        // Recovery trigger on update check-in
        if (["Present", "Late Entry"].includes(attendanceDoc.status)) {
          try {
            const { default: models } = await import('../models/Collection.js');
            const { scheduleETARecalculation } = await import('../utils/scheduleETARecalculation.js');
            
            await models.operationalevents.updateMany(
              { employeeId: attendanceDoc.employee, type: 'SLA_DELAY', resolvedAt: { $exists: false } },
              { $set: { resolvedAt: new Date() } }
            );
            
            scheduleETARecalculation(attendanceDoc.employee.toString());
          } catch (err) {
            console.error('[AttendanceService] Recovery trigger failed in afterUpdate:', err.message);
          }
        }
        return;
      }

      const recipient = attendanceDoc.managerId || body.managerId;
      if (!recipient) return; // Guard for roles without managers (e.g. Agents)

      const message = generateNotification(
        attendanceDoc.employeeName,
        request,
        modelName
      );
      await sendNotification({
        recipient,
        sender: userId,
        type: 'attendance_request',
        title: 'Attendance Request',
        message,
        relatedModel: 'Attendance',
        relatedId: attendanceDoc._id,
      });
    },
  };
}
