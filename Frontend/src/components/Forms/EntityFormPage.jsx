import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import FormRenderer from "../Common/FormRenderer";
import FormPageLayout from "./FormPageLayout";
import TabbedFormTabs from "./TabbedFormTabs";
import { splitFieldsIntoTabs, shouldUseTabs } from "../../utils/formFieldTabs";
import { formDraftKey, loadFormDraft, clearFormDraft } from "../../utils/formDrafts";

/**
 * Reusable full-page form with optional Profile-style tabs.
 * Tab state is kept in one FormRenderer instance (no remount on tab change).
 */
const EntityFormPage = ({
  title,
  subtitle,
  backTo,
  fields = [],
  tabs = null,
  submitButton,
  data = null,
  loading = false,
  onSubmit,
  loadRecord,
  maxWidth,
  draftModel = null,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const id = searchParams.get("id");
  const [record, setRecord] = useState(data);
  const [fetching, setFetching] = useState(Boolean(id && loadRecord));
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || "default");

  useEffect(() => {
    if (!id || !loadRecord) {
      setRecord(data);
      return;
    }
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const loaded = await loadRecord(id);
        if (!cancelled) setRecord(loaded);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadRecord, data]);

  useEffect(() => {
    if (id || !draftModel) return;
    const key = formDraftKey(draftModel, "new");
    const shouldRestore =
      location.state?.restoreDraft || searchParams.get("restoreDraft") === "1";
    const draft = loadFormDraft(key);
    if (draft?.data && shouldRestore) {
      const formValues = draft.data.formData || draft.data;
      setRecord((prev) => ({ ...prev, ...formValues }));
      toast.success("Draft restored");
    }
  }, [id, draftModel, location.state, searchParams]);

  const useTabbed = shouldUseTabs(fields, tabs);
  const fieldsByTab = useMemo(
    () => (useTabbed && tabs?.length ? splitFieldsIntoTabs(fields, tabs) : { default: fields }),
    [fields, tabs, useTabbed]
  );

  const tabList = useTabbed && tabs?.length ? tabs : null;
  const pageTitle = id ? `Edit ${title}` : `Add ${title}`;

  if (fetching || loading) {
    return (
      <FormPageLayout title={pageTitle} subtitle={subtitle} backTo={backTo} maxWidth={maxWidth}>
        <div className="py-16 flex justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={pageTitle} subtitle={subtitle} backTo={backTo} maxWidth={maxWidth}>
      {tabList && (
        <TabbedFormTabs tabs={tabList} active={activeTab} onChange={setActiveTab} />
      )}

      <FormRenderer
        key={record?._id || "new"}
        fields={fields}
        fieldsByTab={tabList ? fieldsByTab : null}
        activeTab={tabList ? activeTab : null}
        submitButton={submitButton}
        onSubmit={onSubmit}
        data={record || {}}
      />
    </FormPageLayout>
  );
};

export default EntityFormPage;
