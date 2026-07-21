import cron from "node-cron";
import models from "../models/Collection.js";
import NotificationDispatcher from "../services/NotificationDispatcher.js";

export const jobs = [
  {
    name: "OnboardingCron",
    defaultExpression: "30 01 * * *", // Runs daily at 01:30 AM
    run: async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ── 1. DAY-1 JOINING ACTIVATION GATE ──────────────────────────────────
        // Activates employees whose onboarding checklist/docs reached 100% (Ready To Join) when joining day arrives
        const readyToJoinOnboardings = await models.onboardings.find({
          status: 'Ready To Join',
          joiningDate: { $lte: today }
        });

        for (const onb of readyToJoinOnboardings) {
          onb.status = 'Completed';
          onb.joinedAt = onb.joinedAt || new Date();
          onb.completedAt = new Date();
          await onb.save();

          await models.employees.findByIdAndUpdate(onb.employeeId, {
            status: 'Active',
            'professionalInfo.confirmDate': new Date()
          });

          // Dispatch Welcome & Day-1 Activation Notifications
          try {
            const recipients = [onb.employeeId.toString()];
            if (onb.reportingTo) recipients.push(onb.reportingTo.toString());
            if (onb.createdBy) recipients.push(onb.createdBy.toString());

            await NotificationDispatcher.dispatch({
              recipients: [...new Set(recipients)],
              sender: onb.createdBy,
              title: "Welcome Aboard! Onboarding Completed",
              message: `Joining date arrived! Employee onboarding completed and account activated.`,
              type: 'system',
              meta: { model: 'onboardings', modelId: onb._id },
              path: '/hrms'
            });
          } catch (nErr) {
            console.warn('[OnboardingCron] Notification warning:', nErr.message);
          }
        }

        // ── 2. SLA BREACH DETECTION ───────────────────────────────────────────
        const overdueOnboardings = await models.onboardings.find({
          status: { $in: ['Pending', 'In Progress', 'Documents Pending', 'Verification Pending'] },
          targetCompletionDate: { $lt: today },
          slaBreached: { $ne: true }
        });

        for (const onb of overdueOnboardings) {
          onb.slaBreached = true;
          onb.slaBreachedAt = new Date();
          await onb.save();

          try {
            const recipients = [];
            if (onb.reportingTo) recipients.push(onb.reportingTo.toString());
            if (onb.createdBy) recipients.push(onb.createdBy.toString());

            if (recipients.length > 0) {
              await NotificationDispatcher.dispatch({
                recipients: [...new Set(recipients)],
                sender: onb.createdBy,
                title: "⚠️ Onboarding SLA Breached",
                message: `Onboarding checklist for employee ${onb.employeeId} has breached target completion deadline.`,
                type: 'system',
                meta: { model: 'onboardings', modelId: onb._id },
                path: '/hrms'
              });
            }
          } catch (nErr) {
            console.warn('[OnboardingCron] SLA breach alert failed:', nErr.message);
          }
        }

        // ── 3. NO-SHOW DETECTION ─────────────────────────────────────────────
        const cutoffDate = new Date(today.getTime() - 3 * 86400000); // 3 days after joining date
        const noShowCandidates = await models.onboardings.find({
          status: { $in: ['Pending', 'In Progress', 'Documents Pending'] },
          joiningDate: { $lt: cutoffDate },
          completionPercent: { $lt: 30 }
        });

        for (const onb of noShowCandidates) {
          onb.status = 'No Show';
          onb.remarks = (onb.remarks || '') + ' [Auto-flagged No Show by system: 3 days past joining date with <30% checklist completion]';
          await onb.save();

          await models.employees.findByIdAndUpdate(onb.employeeId, {
            status: 'Inactive'
          });

          try {
            const recipients = [];
            if (onb.reportingTo) recipients.push(onb.reportingTo.toString());
            if (onb.createdBy) recipients.push(onb.createdBy.toString());

            if (recipients.length > 0) {
              await NotificationDispatcher.dispatch({
                recipients: [...new Set(recipients)],
                sender: onb.createdBy,
                title: "🚨 Candidate No-Show Flagged",
                message: `Candidate for onboarding ${onb._id} flag set to No Show (3 days past joining date).`,
                type: 'system',
                meta: { model: 'onboardings', modelId: onb._id },
                path: '/hrms'
              });
            }
          } catch (nErr) {
            console.warn('[OnboardingCron] No show alert failed:', nErr.message);
          }
        }

      } catch (err) {
        console.error("❌ [OnboardingCron] Execution failed:", err);
      }
    }
  }
];
