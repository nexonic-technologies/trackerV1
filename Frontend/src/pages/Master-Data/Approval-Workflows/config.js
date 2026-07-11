import { approvalWorkflowFormFields, approvalWorkflowSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const approvalWorkflowsConfig = buildSimpleModule({
  folder: "Approval-Workflows",
  model: "approvalworkflows",
  title: "Approval Workflows",
  singularName: "Approval Workflow",
  fields: approvalWorkflowFormFields,
  submitButton: approvalWorkflowSubmit,
});
