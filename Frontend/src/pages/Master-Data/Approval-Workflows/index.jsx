import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { entityFormPath } from "../../../utils/formRoutes";
import { approvalWorkflowsConfig } from "./config";

// ── Model display labels ──────────────────────────────────────
const MODEL_LABELS = {
  leaves: { label: "Leaves", color: "bg-blue-100   text-blue-700" },
  regularizations: { label: "Regularizations", color: "bg-violet-100 text-violet-700" },
  assetallocations: { label: "Asset Allocations", color: "bg-amber-100  text-amber-700" },
  assetincidents: { label: "Asset Incidents", color: "bg-red-100    text-red-700" },
};

const APPROVER_ICONS = {
  "Reporting Manager": "👤",
  "Department Manager": "🏢",
  "HR": "🛡️",
  "Specific Role": "🎭",
  "Specific User": "👋",
};

const LEVEL_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];

// ── Inline step pills ──────────────────────────────────────────
const StepPills = ({ steps = [] }) => {
  if (!steps.length) return <span className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>No steps</span>;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
          style={{ background: `${LEVEL_COLORS[i % LEVEL_COLORS.length]}18`, color: LEVEL_COLORS[i % LEVEL_COLORS.length], border: `1px solid ${LEVEL_COLORS[i % LEVEL_COLORS.length]}35` }}>
          <span className="font-bold">S{step.stepOrder}</span>
          <span className="opacity-70">·</span>
          <span>{APPROVER_ICONS[step.approverType] || "→"} {step.approverType}</span>
          <span className="opacity-60 ml-0.5">({step.timeoutDays}d)</span>
        </div>
      ))}
    </div>
  );
};

// ── Department chip ─────────────────────────────────────────────
const DepartmentChip = ({ departmentId }) => {
  if (!departmentId) return <span className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>All Departments</span>;
  return (
    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
      {departmentId?.name || departmentId?.title || "Dept"}
    </span>
  );
};

// ── Detail slide-over ────────────────────────────────────────────
const DetailSheet = ({ workflow, onClose, onEdit, onDelete }) => {
  if (!workflow) return null;
  const modelMeta = MODEL_LABELS[workflow.modelName] || { label: workflow.modelName, color: "bg-gray-100 text-gray-600" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative h-full w-full max-w-lg flex flex-col shadow-2xl"
        style={{ background: "var(--tracker-surface,#fff)", borderLeft: "1px solid var(--tracker-border,#e5e7eb)", animation: "slideInRight .22s ease-out" }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between gap-4"
          style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>Approval Workflow</p>
            <h2 className="text-lg font-bold mt-1" style={{ color: "var(--tracker-ink)" }}>{modelMeta.label}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${modelMeta.color}`}>{modelMeta.label}</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${workflow.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {workflow.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Department */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Department</p>
            <div className="rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f9fafb)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
              <DepartmentChip departmentId={workflow.departmentId} />
            </div>
          </div>

          {/* Steps timeline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Approval Steps</p>
            {(!workflow.steps || workflow.steps.length === 0) ? (
              <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>No steps configured.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-8 bottom-2 w-0.5" style={{ background: "var(--tracker-border,#e5e7eb)" }} />

                <div className="space-y-4">
                  {workflow.steps.map((step, i) => {
                    const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                    return (
                      <div key={i} className="flex items-start gap-4 relative">
                        {/* Step badge */}
                        <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 z-10"
                          style={{ background: color }}>
                          S{step.stepOrder}
                        </span>
                        <div className="flex-1 rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f9fafb)", border: `1px solid ${color}35` }}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{APPROVER_ICONS[step.approverType] || "→"}</span>
                              <span className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>{step.approverType}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
                              ⏱ {step.timeoutDays}d timeout
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <button type="button" onClick={() => { onDelete(workflow); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button type="button" onClick={() => onEdit(workflow)}
            className="tracker-btn-accent flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────
const ApprovalWorkflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const basePath = approvalWorkflowsConfig.basePath;

  const fetchWorkflows = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/approvalworkflows", { limit: 500 });
      setWorkflows(res.data?.data || []);
    } catch (err) { console.error("fetchWorkflows:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleDelete = async (workflow) => {
    if (!window.confirm(`Delete this approval workflow? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/approvalworkflows/${workflow._id}`);
      fetchWorkflows();
    } catch (err) { console.error("handleDelete:", err); }
  };

  const filtered = query.trim()
    ? workflows.filter((w) =>
      [w.modelName, MODEL_LABELS[w.modelName]?.label].some(
        (v) => v && v.toLowerCase().includes(query.toLowerCase())
      )
    )
    : workflows;

  const stats = [
    { label: "Total", value: workflows.length, color: "text-gray-700" },
    { label: "Active", value: workflows.filter((w) => w.isActive).length, color: "text-green-600" },
    { label: "Inactive", value: workflows.filter((w) => !w.isActive).length, color: "text-red-500" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--tracker-canvas-muted,#f5f6fa)" }}>

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>Master Data</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>Approval Workflows</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>Manage approval chains across modules</p>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>{s.label}</p>
            </div>
          ))}
          <button type="button" onClick={() => navigate(entityFormPath(basePath))}
            className="tracker-btn-accent px-5 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Approval Workflow
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="p-6">
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-3"
            style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--tracker-ink-muted)" }}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows…" className="lmx-input pl-9 py-2 text-sm" />
            </div>
            <p className="text-xs shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
              {filtered.length} of {workflows.length}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--tracker-surface-1,#f9fafb)", borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
                  {["Module", "Department", "Steps", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--tracker-ink-muted)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: j === 0 ? "70%" : "55%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <p className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>
                      {query ? `No results for "${query}"` : "No workflows yet"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--tracker-ink-muted)" }}>
                      {!query && "Add your first approval workflow."}
                    </p>
                  </td></tr>
                ) : (
                  filtered.map((wf) => {
                    const modelMeta = MODEL_LABELS[wf.modelName] || { label: wf.modelName, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={wf._id} className="group cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tracker-surface-1,#f9fafb)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => setSelected(wf)}>

                        {/* Module */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${modelMeta.color}`}>
                            {modelMeta.label}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <DepartmentChip departmentId={wf.departmentId} />
                        </td>

                        {/* Steps */}
                        <td className="px-5 py-3.5" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
                          <StepPills steps={wf.steps} />
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${wf.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {wf.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => navigate(entityFormPath(basePath, wf._id))}
                              title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => handleDelete(wf)}
                              title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 text-xs" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)", color: "var(--tracker-ink-muted)" }}>
              Showing {filtered.length} of {workflows.length} workflows
            </div>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          workflow={selected}
          onClose={() => setSelected(null)}
          onEdit={(wf) => { setSelected(null); navigate(entityFormPath(basePath, wf._id)); }}
          onDelete={(wf) => { handleDelete(wf); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default ApprovalWorkflows;
