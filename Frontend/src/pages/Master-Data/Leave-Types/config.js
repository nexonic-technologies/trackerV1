import { leaveTypeFormFields, leaveTypeSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const leaveTypesConfig = buildSimpleModule({
  folder: "Leave-Types",
  model: "leavetypes",
  title: "Leave Types",
  singularName: "Leave Type",
  fields: leaveTypeFormFields,
  submitButton: leaveTypeSubmit,
});
