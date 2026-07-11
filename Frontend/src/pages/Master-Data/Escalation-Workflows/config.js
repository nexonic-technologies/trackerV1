import { escalationWorkflowFormFields, escalationWorkflowSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const escalationWorkflowsConfig = buildSimpleModule({
  folder: "Escalation-Workflows",
  model: "escalationworkflows",
  title: "Escalation Workflows",
  singularName: "Escalation Workflow",
  fields: escalationWorkflowFormFields,
  submitButton: escalationWorkflowSubmit,
});
