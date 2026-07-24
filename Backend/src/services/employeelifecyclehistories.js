/**
 * employeelifecyclehistories.js — Service hooks for EmployeeLifecycleHistory model.
 */
export default function employeelifecyclehistories() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.changedBy = body.changedBy || user?.id;
      body.effectiveDate = body.effectiveDate || new Date();
      return body;
    }
  };
}
