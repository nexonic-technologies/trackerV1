import { shiftFormFields, shiftSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const shiftsConfig = buildSimpleModule({
  folder: "Shifts",
  model: "shifts",
  title: "Shifts",
  singularName: "Shift",
  fields: shiftFormFields,
  submitButton: shiftSubmit,
});
