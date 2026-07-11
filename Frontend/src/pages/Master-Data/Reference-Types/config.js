import {
  referenceTypeFormFields,
  referenceTypeSubmitButton,
} from "../../../constants/ReferenceTypeForm";
import { buildSimpleModule } from "../buildSimpleModule";

export const referenceTypesConfig = buildSimpleModule({
  folder: "Reference-Types",
  model: "referencetypes",
  title: "Reference Types",
  singularName: "Reference Type",
  fields: referenceTypeFormFields,
  submitButton: referenceTypeSubmitButton,
});
