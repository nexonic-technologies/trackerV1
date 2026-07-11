export const designationFormFields = [
  { name: "title", label: "Designation Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "leavePolicy",
    label: "Leave Policy",
    type: "AutoComplete",
    source: "/populate/read/leavepolicies",
    labelField: "name",
    fieldName: "_id"
  }
];

export const designationSubmitButton = {
  text: "Save Designation",
  color: "blue",
};