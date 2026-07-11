/**
 * @deprecated Use route `/tasks/form` instead. Kept for imports that still reference this file.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CreateTaskModal = ({ onClose, selectedClient }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/tasks/form", {
      replace: true,
      state: { selectedClient },
    });
    onClose?.();
  }, [navigate, onClose, selectedClient]);

  return null;
};

export default CreateTaskModal;
