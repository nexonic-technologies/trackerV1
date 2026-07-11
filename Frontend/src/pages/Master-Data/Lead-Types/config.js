import { leadTypeFormFields, leadTypeSubmitButton } from "../../../constants/LeadTypeForm";
import { buildSimpleModule } from "../buildSimpleModule";

export const leadTypesConfig = buildSimpleModule({
  folder: "Lead-Types",
  model: "leadtypes",
  title: "Lead Types",
  singularName: "Lead Type",
  fields: leadTypeFormFields,
  submitButton: leadTypeSubmitButton,
});
