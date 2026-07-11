// services/hrpolicies.js
export default function hrpolicies() {
  return {
    beforeCreate: async async (ctx) => {
      const { body, userId } = ctx;
      if (userId) {
        body.createdBy = userId;
      }
    }
  };
}
