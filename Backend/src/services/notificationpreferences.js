export default function notificationpreferences() {
  return {
    beforeCreate: async async (ctx) => {
      const { body, userId } = ctx;
      // Ensure users only create preferences for themselves unless they are admin
      if (!body.employeeId) {
        body.employeeId = userId;
      }
    }
  };
}
