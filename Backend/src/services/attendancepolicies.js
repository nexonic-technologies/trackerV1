// services/attendancepolicies.js
export default function attendancepolicies() {
  return {
    beforeCreate: async async (ctx) => {
      const { body } = ctx;
      if (!body.name) {
        throw new Error("Attendance Policy name is required.");
      }
      return body;
    },
    beforeUpdate: async async (ctx) => {
      const { body } = ctx;
      return body;
    }
  };
}
