import { hrPolicyFormFields, hrPolicySubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const hrPoliciesConfig = buildSimpleModule({
  folder: "HR-Policies",
  model: "hrpolicies",
  title: "HR Policies",
  singularName: "HR Policy",
  fields: hrPolicyFormFields,
  submitButton: hrPolicySubmit,
  list: { hiddenColumns: ["content"] },
});
