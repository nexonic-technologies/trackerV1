import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import EntityFormPage from "../../../components/Forms/EntityFormPage";
import { SidebarForm } from "../../../constants/SidebarFrom";
import toast from "react-hot-toast";
import { Plus, Trash2, Sparkles, Package, Loader2 } from "lucide-react";

// ─── Capability Manager Component ──────────────────────────────────
const CapabilityManager = ({ resourceId, menuItemId }) => {
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [resourceInfo, setResourceInfo] = useState(null);

  // Fetch resource info and existing capabilities
  const fetchCapabilities = useCallback(async () => {
    if (!resourceId) {
      setCapabilities([]);
      setResourceInfo(null);
      return;
    }

    setLoading(true);
    try {
      // Get resource details to derive prefix
      const resId = resourceId?._id || resourceId;
      const resourceRes = await axiosInstance.get(`populate/read/resources/${resId}`);
      const resource = resourceRes.data?.data;
      setResourceInfo(resource);

      if (!resource?.modelName) return;

      // Derive prefix from modelName (e.g., 'sidebars' → 'Sidebar')
      const modelName = resource.modelName;
      const singular = modelName.endsWith('s') ? modelName.slice(0, -1) : modelName;
      const prefix = singular.charAt(0).toUpperCase() + singular.slice(1);

      // Fetch capabilities matching this prefix
      const capsRes = await axiosInstance.post("populate/read/capabilities", {
        filter: { key: { $regex: `^${prefix}:`, $options: 'i' }, status: 'active' },
        limit: 50
      });
      setCapabilities(capsRes.data?.data || []);
    } catch (err) {
      console.error("[CapabilityManager] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  // Derive prefix from resource
  const getPrefix = () => {
    if (!resourceInfo?.modelName) return null;
    const modelName = resourceInfo.modelName;
    const singular = modelName.endsWith('s') ? modelName.slice(0, -1) : modelName;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  };

  // Get module name from resource or sidebar route
  const getModule = () => {
    if (resourceInfo?.displayName) return resourceInfo.displayName;
    return "General";
  };

  // Auto-generate standard CRUD capabilities
  const handleAutoGenerate = async () => {
    const prefix = getPrefix();
    if (!prefix) {
      toast.error("Select a Linked Resource first to derive capability prefix");
      return;
    }

    const module = getModule();
    const standardCaps = [
      { key: `${prefix}:view`, label: `View ${prefix}`, module, description: `Can view ${prefix} items` },
      { key: `${prefix}:create`, label: `Create ${prefix}`, module, description: `Can create ${prefix} items` },
      { key: `${prefix}:edit`, label: `Edit ${prefix}`, module, description: `Can edit ${prefix} items` },
      { key: `${prefix}:delete`, label: `Delete ${prefix}`, module, description: `Can delete ${prefix} items` },
    ];

    setAdding(true);
    let created = 0;
    let skipped = 0;

    for (const cap of standardCaps) {
      const exists = capabilities.some(c => c.key === cap.key);
      if (exists) {
        skipped++;
        continue;
      }

      try {
        await axiosInstance.post("populate/create/capabilities", {
          key: cap.key,
          label: cap.label,
          module: cap.module,
          description: cap.description,
          status: 'active'
        });
        created++;
      } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.message?.includes('duplicate')) {
          skipped++;
        } else {
          console.error(`Failed to create ${cap.key}:`, err);
          toast.error(`Failed to create ${cap.key}`);
        }
      }
    }

    if (created > 0) toast.success(`Created ${created} capabilities`);
    if (skipped > 0) toast(`${skipped} already existed`, { icon: "ℹ️" });

    setAdding(false);
    fetchCapabilities();
  };

  // Add custom capability
  const handleAddCustom = async () => {
    const prefix = getPrefix();
    if (!prefix) {
      toast.error("Select a Linked Resource first");
      return;
    }

    const key = customKey.includes(':') ? customKey : `${prefix}:${customKey}`;
    if (!customLabel.trim()) {
      toast.error("Label is required");
      return;
    }

    setAdding(true);
    try {
      await axiosInstance.post("populate/create/capabilities", {
        key,
        label: customLabel.trim(),
        module: getModule(),
        description: `Custom capability: ${key}`,
        status: 'active'
      });
      toast.success(`Created "${key}"`);
      setCustomKey("");
      setCustomLabel("");
      fetchCapabilities();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create capability");
    } finally {
      setAdding(false);
    }
  };

  // Delete capability
  const handleDelete = async (capId) => {
    if (!window.confirm("Delete this capability? This may affect existing role assignments.")) return;
    try {
      await axiosInstance.delete(`populate/delete/capabilities/${capId}`);
      toast.success("Capability deleted");
      fetchCapabilities();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (!resourceId) {
    return (
      <div className="tracker-card p-6">
        <div className="flex items-center gap-3 text-ink-muted">
          <Package className="w-5 h-5" />
          <div>
            <p className="font-medium text-ink text-sm">No Linked Resource</p>
            <p className="text-xs mt-0.5">
              Select a <strong>Linked Resource</strong> in the Menu Item tab to manage capabilities.
              Items without a resource will only support DENIED/VIEW in the permissions page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resource Info */}
      <div className="tracker-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-ink">
              Resource: <span className="text-accent">{resourceInfo?.displayName || resourceInfo?.key || '...'}</span>
            </span>
            <span className="text-xs text-ink-subtle bg-canvas-muted px-2 py-0.5 rounded-full">
              {resourceInfo?.modelName || '...'}
            </span>
          </div>
          <span className="text-xs text-ink-muted">
            Prefix: <code className="font-mono text-accent">{getPrefix() || '...'}</code>
          </span>
        </div>
      </div>

      {/* Existing Capabilities */}
      <div className="tracker-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Capabilities ({capabilities.length})</h3>
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={adding || !getPrefix()}
            className="tracker-btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Auto-generate CRUD
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 border-2 border-hairline border-t-accent rounded-full animate-spin" />
          </div>
        ) : capabilities.length === 0 ? (
          <div className="text-center py-6 text-ink-muted text-sm">
            No capabilities found. Click <strong>Auto-generate CRUD</strong> to create standard view/create/edit/delete capabilities.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {capabilities.map(cap => (
              <div
                key={cap._id}
                className="flex items-center justify-between px-3 py-2 rounded-tracker-md border border-hairline-soft bg-canvas-muted/50 group hover:border-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-accent truncate">{cap.key}</code>
                  </div>
                  <p className="text-[11px] text-ink-subtle truncate mt-0.5">{cap.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cap._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity"
                  title="Delete capability"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Capability */}
      <div className="tracker-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-ink">Add Custom Capability</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-ink-muted mb-1 block">Key (action)</label>
            <div className="flex items-center">
              <span className="text-xs text-ink-subtle bg-canvas-muted border border-r-0 border-hairline-soft px-2 py-2 rounded-l-tracker-md font-mono">
                {getPrefix() || '...'}:
              </span>
              <input
                type="text"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                placeholder="approve"
                className="tracker-input rounded-l-none text-sm flex-1"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-ink-muted mb-1 block">Label</label>
            <input
              type="text"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="Approve Menu Items"
              className="tracker-input text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={adding || !customKey.trim() || !customLabel.trim()}
            className="tracker-btn-primary flex items-center gap-1.5 text-xs px-3 py-2 disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab Definitions ───────────────────────────────────────────────
const MENU_FORM_TABS = [
  {
    id: "item",
    label: "Menu Item",
    fieldNames: ["title", "mainRoute", "icon.iconName", "icon.iconPackage", "parentId", "order"],
  },
  {
    id: "capabilities",
    label: "Capabilities",
    fieldNames: ["resourceId", "isActive"],
  },
];

// ─── Main Form Page ────────────────────────────────────────────────
const MenuFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [record, setRecord] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [initialDataForTab, setInitialDataForTab] = useState({});
  const [fetching, setFetching] = useState(Boolean(id));
  const [activeTab, setActiveTab] = useState("item");

  // Load record for edit mode
  useEffect(() => {
    if (!id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await axiosInstance.get(`populate/read/sidebars/${id}`, {
          params: {
            populateFields: JSON.stringify([
              { path: "resourceId", select: "displayName key modelName" },
              { path: "parentId", select: "title" }
            ])
          }
        });
        const item = res.data?.data;
        if (item?._id?.$oid) item._id = item._id.$oid;
        setRecord(item);
        setFormValues(item || {});
        setInitialDataForTab(item || {});
      } catch (err) {
        toast.error("Failed to load menu item");
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  const handleFormChange = useCallback((updated) => {
    setFormValues((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleTabChange = (tabId) => {
    setInitialDataForTab(formValues);
    setActiveTab(tabId);
  };

  const handleSubmit = async (formData) => {
    const mergedData = { ...formValues, ...formData };
    const hasParent = !!(mergedData.parentId?._id || mergedData.parentId);

    const payload = {
      ...mergedData,
      isActive: mergedData.isActive === undefined ? true : mergedData.isActive === "true" || mergedData.isActive === true,
      isParent: !hasParent,        // If no parent, it IS a parent
      hasChildren: !hasParent,     // Parents can have children
      parentId: mergedData.parentId?._id || mergedData.parentId || null,
      resourceId: mergedData.resourceId?._id || mergedData.resourceId || null,
      visibility: "protected",    // Always protected — CBAC controls visibility
    };

    try {
      if (id) {
        await axiosInstance.put(`populate/update/sidebars/${id}`, payload);
        toast.success("Menu item updated");
      } else {
        await axiosInstance.post("populate/create/sidebars", payload);
        toast.success("Menu item created");
      }
      navigate("/Settings/Menu");
    } catch (err) {
      console.error("Menu save error:", err);
      toast.error(err.response?.data?.message || "Save failed");
      throw err;
    }
  };

  if (fetching) {
    return (
      <div className="p-6">
        <div className="py-16 flex justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-canvas-muted dark:bg-canvas min-h-full">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/Settings/Menu")}
          className="text-sm text-accent hover:underline mb-2 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-ink">{id ? "Edit" : "Add"} Menu item</h1>
        <p className="text-ink-muted text-sm">Sidebar navigation entry</p>
      </div>

      {/* Tabs */}
      <div className="tracker-card overflow-hidden">
        <div className="flex border-b border-hairline-soft">
          {MENU_FORM_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-accent border-accent"
                  : "text-ink-muted border-transparent hover:text-ink hover:border-hairline"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "item" && (
            <EntityFormPage
              title="Menu item"
              subtitle="Sidebar navigation entry"
              backTo="/Settings/Menu"
              fields={SidebarForm.filter(f => MENU_FORM_TABS[0].fieldNames.includes(f.name))}
              submitButton={{ text: id ? "Update menu item" : "Create menu item", color: "blue" }}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
              data={initialDataForTab}
            />
          )}

          {activeTab === "capabilities" && (
            <div className="space-y-4">
              {/* Resource + Active fields from EntityFormPage */}
              <EntityFormPage
                title=""
                subtitle=""
                backTo="/Settings/Menu"
                fields={SidebarForm.filter(f => MENU_FORM_TABS[1].fieldNames.includes(f.name))}
                submitButton={{ text: id ? "Update menu item" : "Create menu item", color: "blue" }}
                onSubmit={handleSubmit}
                onChange={handleFormChange}
                data={initialDataForTab}
              />

              {/* Capabilities Manager */}
              <CapabilityManager
                resourceId={formValues?.resourceId}
                menuItemId={id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuFormPage;
