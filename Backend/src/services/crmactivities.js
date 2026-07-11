/**
 * crmactivities.js — Service hooks for CRM Activity logging.
 * Auto-stamps the logged-in user and creates system logs.
 */
export default function crmactivities() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      if (!body.timestamp) {
        body.timestamp = new Date();
      }
      if (userId && !body.performedBy) {
        body.performedBy = userId;
      }
      return body;
    }
  };
}
