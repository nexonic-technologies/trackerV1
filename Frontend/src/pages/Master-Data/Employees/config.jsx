import { createModuleConfig } from "../createModuleConfig";
import { EMPLOYEE_FORM_TABS, employeeSubmitButton } from "../../../constants/employeeForm";

export const employeesConfig = createModuleConfig({
  folder: "Employees",
  model: "employees",
  title: "Employees",
  subtitle: "Employee master records",
  singularName: "Employee",
  fields: [],
  submitButton: employeeSubmitButton,
  tabs: EMPLOYEE_FORM_TABS,
  list: {
    mapTableData: (emp) => ({
      _id: emp._id,
      empId: emp.professionalInfo?.empId || "-",
      name: `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim() || "-",
      email: emp.authInfo?.workEmail || "-",
      department: emp.professionalInfo?.department?.name || "-",
      designation:
        emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || "-",
      role: emp.professionalInfo?.role?.name || "-",
      reportingManager: emp.professionalInfo?.reportingManager?.basicInfo?.firstName || "-",
      doj: emp.professionalInfo?.doj
        ? new Date(emp.professionalInfo.doj).toLocaleDateString()
        : "-",
      status: emp.status || "Active",
      _raw: emp,
    }),
    hiddenColumns: [
      "_id",
      "_raw",
      "basicInfo",
      "professionalInfo",
      "authInfo",
      "accountDetails",
      "salaryDetails",
      "personalDocuments",
      "professionalDocuments",
      "leaveStatus",
      "isActive",
      "createdAt",
      "updatedAt",
      "__v",
    ],
    customRender: {
      status: (row) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.status === "Active"
              ? "bg-green-100 text-green-800"
              : row.status === "Inactive"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  },
  loadRecord: async (id) => {
    const axiosInstance = (await import("../../../api/axiosInstance")).default;
    const res = await axiosInstance.get(`/populate/read/employees/${id}`);
    return res.data?.data;
  },
});
