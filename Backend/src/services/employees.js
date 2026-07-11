import bcrypt from 'bcryptjs';

async function resolveEmployeeLeavePolicy(professionalInfo, models, evalDate = new Date()) {
  if (!professionalInfo) return null;

  // 1. Employee Override
  if (professionalInfo.leavePolicyOverride) {
    const policy = await models.leavepolicy.findById(professionalInfo.leavePolicyOverride)
      .populate('leaves.leaveType')
      .lean();
    if (policy) return policy;
  }

  // 2. Department + Designation Combo Policy
  if (professionalInfo.department && professionalInfo.designation) {
    const comboPolicy = await models.leavepolicy.findOne({
      applicableDepartments: professionalInfo.department,
      applicableDesignations: professionalInfo.designation,
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
    .populate('leaves.leaveType')
    .lean();
    if (comboPolicy) return comboPolicy;
  }

  // 3. Department Policy
  if (professionalInfo.department) {
    const deptPolicy = await models.leavepolicy.findOne({
      applicableDepartments: professionalInfo.department,
      applicableDesignations: { $size: 0 },
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
    .populate('leaves.leaveType')
    .lean();
    if (deptPolicy) return deptPolicy;

    const dept = await models.departments.findById(professionalInfo.department)
      .populate({
        path: 'leavePolicy',
        populate: { path: 'leaves.leaveType' }
      })
      .lean();
    if (dept?.leavePolicy) return dept.leavePolicy;
  }

  // 4. Designation Policy
  if (professionalInfo.designation) {
    const desigPolicy = await models.leavepolicy.findOne({
      applicableDesignations: professionalInfo.designation,
      applicableDepartments: { $size: 0 },
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
    .populate('leaves.leaveType')
    .lean();
    if (desigPolicy) return desigPolicy;

    const desig = await models.designations.findById(professionalInfo.designation)
      .populate({
        path: 'leavePolicy',
        populate: { path: 'leaves.leaveType' }
      })
      .lean();
    if (desig?.leavePolicy) return desig.leavePolicy;
  }

  return null;
}

function mergeLeaveBalances(oldLeaveStatus = [], newPolicy) {
  if (!newPolicy || !Array.isArray(newPolicy.leaves)) return oldLeaveStatus;

  const merged = [];

  for (const policyLeaf of newPolicy.leaves) {
    const leaveTypeId = policyLeaf.leaveType?._id || policyLeaf.leaveType;
    if (!leaveTypeId) continue;

    const existingBucket = oldLeaveStatus.find(
      b => b.leaveType && b.leaveType.toString() === leaveTypeId.toString()
    );

    const maxDays = policyLeaf.maxDaysPerYear || 0;

    if (existingBucket) {
      const usedThisYear = existingBucket.usedThisYear || 0;
      const newAvailable = Math.max(maxDays - usedThisYear, 0);

      merged.push({
        leaveType: leaveTypeId,
        usedThisMonth: existingBucket.usedThisMonth || 0,
        usedThisYear: usedThisYear,
        carriedForward: existingBucket.carriedForward || 0,
        available: newAvailable
      });
    } else {
      merged.push({
        leaveType: leaveTypeId,
        usedThisMonth: 0,
        usedThisYear: 0,
        carriedForward: 0,
        available: maxDays
      });
    }
  }

  for (const oldBucket of oldLeaveStatus) {
    if (!oldBucket.leaveType) continue;
    const inNewPolicy = newPolicy.leaves.some(
      l => (l.leaveType?._id || l.leaveType).toString() === oldBucket.leaveType.toString()
    );
    if (!inNewPolicy) {
      merged.push(oldBucket);
    }
  }

  return merged;
}

export default function employeesService() {
  return {
    /**
     * beforeCreate: Hash the password inside authInfo before saving a new employee.
     * Also initialize Leave Status Buckets based on Resolved Leave Policy (Override > Dept > Desig).
     */
    async beforeCreate(ctx) {
      const { body } = ctx;
      if (body?.authInfo?.password) {
        const salt = await bcrypt.genSalt(12);
        body.authInfo.password = await bcrypt.hash(body.authInfo.password, salt);
      }

      try {
        const { default: models } = await import('../models/Collection.js');
        const policy = await resolveEmployeeLeavePolicy(body?.professionalInfo, models);

        if (policy && Array.isArray(policy.leaves)) {
          body.leaveStatus = policy.leaves.map(policyLeaf => ({
            leaveType: policyLeaf.leaveType?._id || policyLeaf.leaveType,
            usedThisMonth: 0,
            usedThisYear: 0,
            carriedForward: 0,
            available: policyLeaf.maxDaysPerYear || 0
          }));
        }
      } catch (error) {
        console.error("[EmployeeService] Failed to initialize leave balance from policy:", error.message);
      }

      return body;
    },

    /**
     * beforeUpdate: Hash password and block updates if active asset allocations exist.
     * Also updates Leave Status Buckets if department, designation, or override changes.
     */
    async beforeUpdate(ctx) {
      const { body, docId, existingDoc } = ctx;
      if (body?.authInfo?.password) {
        const salt = await bcrypt.genSalt(12);
        body.authInfo.password = await bcrypt.hash(body.authInfo.password, salt);
      }

      if (body?.status && (body.status === 'Inactive' || body.status === 'Terminated')) {
        const { default: models } = await import('../models/Collection.js');
        const activeAllocCount = await models.assetallocations.countDocuments({
          employeeId: docId,
          status: 'Active'
        });
        if (activeAllocCount > 0) {
          throw new Error(`Cannot update employee status to "${body.status}" because they still hold ${activeAllocCount} active asset allocation(s). Please process return or transfer before exit clearance.`);
        }
      }

      try {
        const existingProf = existingDoc?.professionalInfo || {};
        const updatedProf = body?.professionalInfo || {};

        const oldDept = existingProf.department?.toString() || null;
        const oldDesig = existingProf.designation?.toString() || null;
        const oldOverride = existingProf.leavePolicyOverride?.toString() || null;

        const hasDeptUpdate = 'department' in updatedProf;
        const hasDesigUpdate = 'designation' in updatedProf;
        const hasOverrideUpdate = 'leavePolicyOverride' in updatedProf;

        const newDept = hasDeptUpdate ? (updatedProf.department?.toString() || null) : oldDept;
        const newDesig = hasDesigUpdate ? (updatedProf.designation?.toString() || null) : oldDesig;
        const newOverride = hasOverrideUpdate ? (updatedProf.leavePolicyOverride?.toString() || null) : oldOverride;

        const policyChanged = (newDept !== oldDept) || (newDesig !== oldDesig) || (newOverride !== oldOverride);

        if (policyChanged) {
          const { default: models } = await import('../models/Collection.js');
          const mergedProf = {
            department: newDept,
            designation: newDesig,
            leavePolicyOverride: newOverride
          };
          const newPolicy = await resolveEmployeeLeavePolicy(mergedProf, models);
          const oldLeaveStatus = existingDoc?.leaveStatus || [];
          body.leaveStatus = mergeLeaveBalances(oldLeaveStatus, newPolicy);
        }
      } catch (error) {
        console.error("[EmployeeService] Failed to merge leave status on update:", error.message);
      }

      return body;
    }
  };
}

