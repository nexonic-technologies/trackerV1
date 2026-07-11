import { taskTypeFormFields, taskTypeSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const taskTypesConfig = buildSimpleModule({
  folder: "Task-Types",
  model: "tasktypes",
  title: "Task Types",
  singularName: "Task Type",
  fields: taskTypeFormFields,
  submitButton: taskTypeSubmit,
});
