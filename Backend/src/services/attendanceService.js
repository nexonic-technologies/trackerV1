import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import dayjs from "dayjs";
import JobQueue from "./jobQueue.js";

class AttendanceService {
  constructor() {
    this.jobQueue = new JobQueue({
      concurrency: 20, // Process 20 employees concurrently
      batchSize: 100,  // Process in batches of 100
      retryAttempts: 3,
      retryDelay: 2000
    });

    // Event listeners for monitoring
    this.jobQueue.on('job:failed', ({ job, error }) => {
      console.error(`Failed to process attendance for employee ${job.data.employeeId}:`, error);
    });

    this.jobQueue.on('completed', (stats) => {
      // console.log(`Attendance cron completed:`, stats);
    });
  }

  async processDailyAttendance() {
    const startTime = Date.now();
    // console.log('Starting daily attendance processing...');

    try {
      const today = dayjs().startOf("day").toDate();

      // Get all employees in batches to avoid memory issues
      const totalEmployees = await Employee.countDocuments();
      const batchSize = 500;
      let processed = 0;

      for (let skip = 0; skip < totalEmployees; skip += batchSize) {
        const employees = await Employee.find({}, '_id')
          .skip(skip)
          .limit(batchSize)
          .lean(); // Use lean() for better performance

        // Add jobs to queue
        const jobs = employees.map(emp => ({
          handler: this.processEmployeeAttendance.bind(this),
          data: { employeeId: emp._id, date: today }
        }));

        this.jobQueue.addBatch(jobs);
        processed += employees.length;

        // console.log(`Queued ${processed}/${totalEmployees} employees`);
      }

      // Wait for all jobs to complete
      await new Promise((resolve) => {
        this.jobQueue.on('completed', resolve);
      });

      const duration = Date.now() - startTime;
      // console.log(`Daily attendance processing completed in ${duration}ms`);

    } catch (error) {
      console.error('Error in daily attendance processing:', error);
      throw error;
    }
  }

  async processEmployeeAttendance({ employeeId, date }) {
    const session = await Attendance.startSession();

    try {
      await session.withTransaction(async () => {
        // Check if record exists with session for consistency
        const existingRecord = await Attendance.findOne({
          employee: employeeId,
          date: date
        }).session(session);

        if (existingRecord) {
          // Update existing record if needed
          if (existingRecord.status !== "Week Off" && !existingRecord.checkOut) {
            existingRecord.status = "Unchecked";
            await existingRecord.save({ session });
          }
          return;
        }

        // Determine status for new record
        const status = await this.determineAttendanceStatus(employeeId, date, session);

        // Create new attendance record
        await Attendance.create([{
          employee: employeeId,
          date: date,
          status: status
        }], { session });
      });

    } catch (error) {
      throw new Error(`Failed to process attendance for employee ${employeeId}: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  async determineAttendanceStatus(employeeId, date, session) {
    // 1. Check for Work From Home intent
    const { default: WFHRequest } = await import("../models/WFHRequest.js");
    const isWfh = await WFHRequest.findOne({
      employeeId,
      status: 'Approved',
      startDate: { $lte: date },
      endDate: { $gte: date }
    }).session(session).lean();

    if (isWfh) {
      return "Work From Home";
    }

    const dayOfWeek = dayjs(date).day();
    const dayOfWeekStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // 2. Fetch Employee to resolve AttendancePolicy via Department
    const emp = await Employee.findById(employeeId).populate({
      path: 'professionalInfo.department',
      populate: { path: 'attendancePolicy' }
    }).session(session).lean();

    const policy = emp?.professionalInfo?.department?.attendancePolicy;

    // 3. Fallback logic if no policy exists (Legacy behavior)
    if (!policy) {
      if (dayOfWeek === 0) return "Week Off";
      if (dayOfWeek === 6) {
        const lastSaturday = dayjs(date).subtract(7, "day").startOf("day").toDate();
        const lastWeekRecord = await Attendance.findOne({
          employee: employeeId,
          date: lastSaturday,
          status: "Week Off"
        }).session(session).lean();
        return lastWeekRecord ? "LOP" : "Week Off";
      }
      return "LOP";
    }

    // 4. Dynamic Policy Evaluation
    const weekOffRules = policy.weeklyOffRules || { type: "static", days: ["Sunday"] };

    if (weekOffRules.days.includes(dayOfWeekStr)) {
      if (weekOffRules.type === "static") {
        return "Week Off";
      } else if (weekOffRules.type === "alternate") {
        // Alternate rule: If last week was Week Off, this week is working (LOP if no punch)
        const lastWeekDate = dayjs(date).subtract(7, "day").startOf("day").toDate();
        const lastWeekRecord = await Attendance.findOne({
          employee: employeeId,
          date: lastWeekDate,
          status: "Week Off"
        }).session(session).lean();

        return lastWeekRecord ? "LOP" : "Week Off";
      }
    }

    // Regular working day - mark as LOP if no check-in
    return "LOP";
  }

  // Bulk update method for performance optimization
  async bulkUpdateAttendance(updates) {
    if (updates.length === 0) return;

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { employee: update.employeeId, date: update.date },
        update: { $set: { status: update.status } },
        upsert: true
      }
    }));

    try {
      const result = await Attendance.bulkWrite(bulkOps, {
        ordered: false, // Continue processing even if some fail
        writeConcern: { w: 1, j: true } // Ensure write to journal
      });

      // console.log(`Bulk update completed: ${result.modifiedCount} modified, ${result.upsertedCount} created`);
      return result;
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    }
  }

  // Method to handle weekend batch processing
  async processWeekendAttendance() {
    const today = dayjs().startOf("day");
    const isWeekend = today.day() === 0 || today.day() === 6;

    if (!isWeekend) return;

    // console.log('Processing weekend attendance...');

    try {
      const employees = await Employee.find({}, '_id').lean();
      const updates = [];

      for (const emp of employees) {
        const status = await this.determineAttendanceStatus(emp._id, today.toDate());
        updates.push({
          employeeId: emp._id,
          date: today.toDate(),
          status: status
        });

        // Process in batches to avoid memory issues
        if (updates.length >= 1000) {
          await this.bulkUpdateAttendance(updates);
          updates.length = 0; // Clear array
        }
      }

      // Process remaining updates
      if (updates.length > 0) {
        await this.bulkUpdateAttendance(updates);
      }

    } catch (error) {
      console.error('Weekend attendance processing failed:', error);
      throw error;
    }
  }

  getQueueStats() {
    return this.jobQueue.getStats();
  }
}

export default new AttendanceService();