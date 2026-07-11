import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import EntityFormPage from "../Forms/EntityFormPage";
import { enqueueFormSubmit } from "../../services/formSubmitQueue";
import { formDraftKey } from "../../utils/formDrafts";
import toast from "react-hot-toast";

const MasterDataFormView = ({ config, fields: fieldsProp }) => {
  const navigate = useNavigate();
  const {
    model,
    title,
    subtitle,
    basePath,
    fields: configFields = [],
    tabs,
    submitButton,
    singularName,
    transformSubmit,
    loadRecord: customLoad,
  } = config;

  const fields = fieldsProp || configFields;
  const label = singularName || title.replace(/s$/, "");

  const loadRecord = customLoad
    ? customLoad
    : async (id) => {
        const res = await axiosInstance.get(`/populate/read/${model}/${id}`);
        return res.data?.data;
      };

  const handleSubmit = (payload, meta) => {
    const id = new URLSearchParams(window.location.search).get("id");
    const isEdit = Boolean(id);
    const draftKey = formDraftKey(model, id || "new");

    const body = isEdit
      ? payload
      : transformSubmit
        ? transformSubmit(meta.fullPayload, { isEdit, meta })
        : meta.fullPayload;

    console.log('[MasterDataFormView] Submit:', { model, id, isEdit, payload, body, meta });

    enqueueFormSubmit({
      draftKey,
      draft: { formData: meta.fullPayload, patch: payload, isEdit },
      execute: async () => {
        console.log('[MasterDataFormView] Executing:', { isEdit, url: isEdit ? `/populate/update/${model}/${id}` : `/populate/create/${model}`, body });
        if (isEdit) {
          await axiosInstance.put(`/populate/update/${model}/${id}`, body);
        } else {
          await axiosInstance.post(`/populate/create/${model}`, body);
        }
      },
      onSuccess: () =>
        toast.success(isEdit ? `${label} updated` : `${label} created`),
    });

    navigate(basePath);
  };

  return (
    <EntityFormPage
      title={label}
      subtitle={subtitle}
      backTo={basePath}
      fields={fields}
      tabs={tabs}
      draftModel={model}
      submitButton={submitButton}
      loadRecord={loadRecord}
      onSubmit={handleSubmit}
    />
  );
};

export default MasterDataFormView;
