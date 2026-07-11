export const departmentFormFields = [
  { name: "name", label: "Department Name", type: "text", required: true },
  { name: "shortCode", label: "Short Code", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "attendancePolicy",
    label: "Attendance Policy",
    type: "AutoComplete",
    source: "/populate/read/attendancepolicies",
    labelField: "name",
    fieldName: "name",
  },
  {
    name: "designations",
    label: "Belonged Designations",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/designations",
    labelField: "title",
    fieldName: "_id",
  },
  {
    name: "leavePolicy",
    label: "Leave Policy",
    type: "AutoComplete",
    source: "/populate/read/leavepolicies",
    labelField: "name",
    fieldName: "name",
  },
  {
    name: "Status",
    label: "Status",
    type: "select",
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
    defaultValue: "Active",
  },
];

export const departmentSubmitButton = { text: "Save Department", color: "blue" };
