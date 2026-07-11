import { projectTypeFormFields, projectTypeSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const projectTypesConfig = buildSimpleModule({
  folder: "Project-Types",
  model: "projecttypes",
  title: "Project Types",
  singularName: "Project Type",
  fields: projectTypeFormFields,
  submitButton: projectTypeSubmit,
});
