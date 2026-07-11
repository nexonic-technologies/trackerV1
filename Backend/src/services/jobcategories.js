/**
 * JobCategories Service
 * Business rules for job category lifecycle management.
 */
export default function jobcategories() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      // Normalize name
      if (body.name) {
        body.name = body.name.trim();
      }
    },

    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      // If deactivating, check no active job types reference this category
      if (body.isActive === false || body.metaStatus === 'inactive') {
        const { default: models } = await import('../models/Collection.js');
        const activeJobTypes = await models.jobtypes.countDocuments({
          categoryId: docId,
          isActive: true
        });
        if (activeJobTypes > 0) {
          throw new Error(
            `Cannot deactivate: ${activeJobTypes} active job type(s) are using this category. Deactivate them first.`
          );
        }
      }
    }
  };
}
