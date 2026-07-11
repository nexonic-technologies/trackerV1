import {
  designationFormFields,
  designationSubmitButton,
} from "../../../constants/DesignationForm";
import { createModuleConfig } from "../createModuleConfig";

export const designationsConfig = createModuleConfig({
  folder: "Designations",
  model: "designations",
  title: "Designations",
  subtitle: "Manage employee designations",
  singularName: "Designation",
  fields: designationFormFields,
  submitButton: designationSubmitButton,
  list: {
    customColumns: ["title", "description"],
    hiddenColumns: ["_id", "createdAt", "updatedAt", "__v", "professionalInfo", "Status"],
    confirmDelete: (row) => `Delete designation "${row.title}"?`,
    cleanData: (item) => {
      const { professionalInfo, ...rest } = item;
      return rest;
    },
  },
});
