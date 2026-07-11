import {
  departmentFormFields,
  departmentSubmitButton,
} from "../../../constants/departmentForm";
import { createModuleConfig } from "../createModuleConfig";

export const departmentsConfig = createModuleConfig({
  folder: "Departments",
  model: "departments",
  title: "Departments",
  subtitle: "Organizational departments",
  singularName: "Department",
  fields: departmentFormFields,
  submitButton: departmentSubmitButton,
  list: {
    hiddenColumns: ["_id", "professionalInfo"],
    customRender: {
      Status: (row) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.Status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.Status}
        </span>
      ),
    },
    cleanData: (item) => {
      const { professionalInfo, ...rest } = item;
      return rest;
    },
  },
});
