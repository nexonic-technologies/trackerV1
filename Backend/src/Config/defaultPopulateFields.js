// Default fields to populate for each model when no specific fields are requested
export const DEFAULT_POPULATE_FIELDS = {
  employees: {
    'professionalInfo.designation': 'title',
    'professionalInfo.department': 'name',
    'professionalInfo.role': 'name',
    'professionalInfo.reportingManager': 'basicInfo.firstName,basicInfo.lastName'
  },
  departments: {
    'head': 'basicInfo.firstName,basicInfo.lastName'
  },
  designations: {
    'department': 'name'
  },
  leaves: {
    'employee': 'basicInfo.firstName,basicInfo.lastName',
    'leaveType': 'name',
    'approvedBy': 'basicInfo.firstName,basicInfo.lastName'
  },
  tasks: {
    'assignedTo': 'basicInfo.firstName,basicInfo.lastName',
    'createdBy': 'basicInfo.firstName,basicInfo.lastName',
    'taskType': 'name'
  },
  attendances: {
    'employee': 'basicInfo.firstName,basicInfo.lastName'
  },
  agents: {
    'client': 'name'
  },
  feedposts: {
    'author': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name',
    'group': 'name',
    'channel': 'name',
    'viewedBy.employee': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'reactions.employee': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage'
  },
  feedcomments: {
    'author': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name',
    'postId': 'subject'
  },
  feedgroups: {
    'createdBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'members': 'basicInfo.firstName,basicInfo.lastName'
  },
  feedchannels: {
    'createdBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'groups': 'name'
  },
  payrolls: {
    'employeeId':        'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId',
    'processedBy':       'basicInfo.firstName,basicInfo.lastName',
    'approvedBy':        'basicInfo.firstName,basicInfo.lastName',
    'salaryStructureId': 'version,effectiveFrom,effectiveTo,ctc',
    'payrollRunId':      'month,year,status'
  },
  salarystructures: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId,professionalInfo.department',
    'createdBy':  'basicInfo.firstName,basicInfo.lastName'
  },
  payrollruns: {
    'initiatedBy': 'basicInfo.firstName,basicInfo.lastName',
    'approvedBy':  'basicInfo.firstName,basicInfo.lastName'
  },
  holidays: {},
  wfhrequests: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId',
    'departmentId': 'name',
    'managerId': 'basicInfo.firstName,basicInfo.lastName'
  },
  regularizations: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId',
    'departmentId': 'name',
    'managerId': 'basicInfo.firstName,basicInfo.lastName'
  }
};

export function getDefaultPopulateFields(modelName, populatePath) {
  return DEFAULT_POPULATE_FIELDS[modelName]?.[populatePath] || 'name';
}