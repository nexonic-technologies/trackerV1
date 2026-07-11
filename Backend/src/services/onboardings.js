/**
 * onboardings.js — Service hooks for onboarding checklist.
 * Auto-computes completionPercent and status from checklist progress.
 */
export default function onboardings() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.createdBy = user?.id;
      body.status = 'Pending';
      body.completionPercent = 0;
      return body;
    },

    async afterUpdate(ctx) {
      const { docId } = ctx;
      if (!docId) return;
      const { default: Onboarding } = await import('../models/Onboarding.js');
      const doc = await Onboarding.findById(docId);
      if (!doc || !doc.checklist || doc.checklist.length === 0) return;

      const total = doc.checklist.length;
      const completed = doc.checklist.filter(c => c.isCompleted).length;
      const pct = Math.round((completed / total) * 100);

      const updates = { completionPercent: pct };

      if (pct === 100 && doc.status !== 'Completed') {
        updates.status = 'Completed';
        updates.completedAt = new Date();
      } else if (pct > 0 && pct < 100 && doc.status === 'Pending') {
        updates.status = 'In Progress';
      }

      await Onboarding.findByIdAndUpdate(docId, { $set: updates });
    }
  };
}
