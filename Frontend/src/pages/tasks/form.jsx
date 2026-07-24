import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@providers/AuthProvider";
import axiosInstance from "@api/axiosInstance";
import EntityFormPage from "@components/Forms/EntityFormPage";
import {
  TASK_CREATE_TABS,
  buildTaskCreateFields,
} from "../../constants/taskCreateForm";
import { enqueueFormSubmit } from "@services/formSubmitQueue";
import { formDraftKey } from "@utils/formDrafts";
import toast from "react-hot-toast";

const TaskFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const selectedClient = location.state?.selectedClient;
  const fields = buildTaskCreateFields(selectedClient);

  const handleSubmit = (_payload, meta) => {
    const draftKey = formDraftKey("tasks", "new");
    const fullPayload = {
      ...meta.fullPayload,
      createdBy: user.id,
      status: "Backlogs",
    };

    enqueueFormSubmit({
      draftKey,
      draft: { formData: fullPayload },
      execute: async () => {
        await axiosInstance.post("/populate/create/tasks", fullPayload);
      },
      onSuccess: () => toast.success("Task created"),
    });

    navigate("/tasks");
  };

  return (
    <EntityFormPage
      title="Task"
      subtitle="Create a new task"
      backTo="/tasks"
      fields={fields}
      tabs={TASK_CREATE_TABS}
      draftModel="tasks"
      submitButton={{ text: "Create Task", color: "blue" }}
      onSubmit={handleSubmit}
      maxWidth="max-w-4xl"
    />
  );
};

export default TaskFormPage;
