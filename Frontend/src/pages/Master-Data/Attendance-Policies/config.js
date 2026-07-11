import { attendancePolicyFormFields, attendancePolicySubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const attendancePoliciesConfig = buildSimpleModule({
  folder: "Attendance-Policies",
  model: "attendancepolicies",
  title: "Attendance Policies",
  singularName: "Attendance Policy",
  fields: attendancePolicyFormFields,
  submitButton: attendancePolicySubmit,
});
