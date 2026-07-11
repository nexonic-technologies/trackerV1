import { useState, useEffect } from "react";
import { useAuth } from "../../context/authProvider";
import { useUserRole } from "../../hooks/useUserRole";
import useGenericAPI from "../../components/useGenericAPI";
import {
  FileText, CheckCircle, ShieldAlert, Calendar,
  ExternalLink, ArrowRight, Settings, Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "All Policies",
  "Leave Policy",
  "Code of Conduct",
  "Attendance",
  "Compensation",
  "Benefits",
  "Performance",
  "General"
];

export default function PoliciesPage() {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { read, update, loading } = useGenericAPI();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All Policies");
  const [acknowledging, setAcknowledging] = useState(false);

  // Admin roles allowed to configure/manage policies
  const isAdmin = ["hr admin", "admin", "developer"].includes(userRole?.toLowerCase());

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      // Fetch active policies
      const res = await read("hrpolicies", {
        filter: { status: "Active", metaStatus: "active" }
      });
      const data = res?.data || [];
      setPolicies(data);

      // Auto-select the first policy if available
      if (data.length > 0) {
        setSelectedPolicy(data[0]);
      }
    } catch (err) {
      console.error("Failed to load policies", err);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedPolicy || !user?.id) return;
    setAcknowledging(true);
    try {
      const alreadyAcked = selectedPolicy.acknowledgments?.some(
        ack => (ack.employeeId?._id || ack.employeeId) === user.id
      );

      if (alreadyAcked) return;

      const newAck = {
        employeeId: user.id,
        acknowledgedAt: new Date()
      };

      const updatedAcks = [...(selectedPolicy.acknowledgments || []), newAck];

      await update("hrpolicies", selectedPolicy._id, {
        acknowledgments: updatedAcks
      }, "Policy successfully acknowledged!");

      // Refresh policy details locally
      const updatedPolicy = { ...selectedPolicy, acknowledgments: updatedAcks };
      setSelectedPolicy(updatedPolicy);
      setPolicies(prev => prev.map(p => p._id === selectedPolicy._id ? updatedPolicy : p));
    } catch (err) {
      console.error("Failed to acknowledge policy", err);
    } finally {
      setAcknowledging(false);
    }
  };

  const filteredPolicies = selectedCategory === "All Policies"
    ? policies
    : policies.filter(p => p.category === selectedCategory);

  const getAckDetails = (policy) => {
    if (!policy || !user?.id) return { acknowledged: false };
    const record = policy.acknowledgments?.find(
      ack => (ack.employeeId?._id || ack.employeeId) === user.id
    );
    return record
      ? { acknowledged: true, date: new Date(record.acknowledgedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
      : { acknowledged: false };
  };

  const currentAck = getAckDetails(selectedPolicy);

  return (
    <div className="lmx-content py-6" data-module="hr">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="lmx-page-eyebrow">Company Resources</span>
          <h1 className="text-2xl font-bold text-ink tracking-tight mt-1">HR & Corporate Policies</h1>
          <p className="text-sm text-ink-muted mt-1">Review official guidelines and acknowledge mandatory policy updates.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate("/master-data/hr-policies")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-1 border border-hairline hover:border-ink-subtle text-ink font-semibold rounded-tracker-md text-sm transition-all cursor-pointer shadow-sm"
          >
            <Settings size={16} /> Manage Policies
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Filter & Navigation */}
        <div className="lg:col-span-1 space-y-6">
          {/* Category Filter Pills */}
          <div className="tracker-card-plain p-4 bg-surface space-y-1">
            <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider px-2 mb-3">Categories</h3>
            {CATEGORIES.map(cat => {
              const count = cat === "All Policies"
                ? policies.length
                : policies.filter(p => p.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const filtered = cat === "All Policies" ? policies : policies.filter(p => p.category === cat);
                    if (filtered.length > 0) {
                      setSelectedPolicy(filtered[0]);
                    } else {
                      setSelectedPolicy(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-tracker-md text-xs font-semibold transition-all text-left cursor-pointer ${selectedCategory === cat
                      ? "bg-[var(--module-accent)] text-white"
                      : "text-ink-muted hover:bg-canvas-muted hover:text-ink"
                    }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat
                      ? "bg-white/20 text-white"
                      : "bg-canvas text-ink-muted"
                    }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* List of Policies in Category */}
          <div className="tracker-card-plain p-4 bg-surface">
            <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider px-2 mb-3">Documents</h3>
            {loading ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-canvas animate-pulse rounded" />
                <div className="h-10 bg-canvas animate-pulse rounded" />
              </div>
            ) : filteredPolicies.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6 italic">No documents available.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredPolicies.map(p => {
                  const isSelected = selectedPolicy?._id === p._id;
                  const ack = getAckDetails(p);
                  return (
                    <button
                      key={p._id}
                      onClick={() => setSelectedPolicy(p)}
                      className={`w-full text-left p-3 rounded-tracker-md border transition-all flex flex-col gap-1 cursor-pointer ${isSelected
                          ? "border-[var(--module-accent)] bg-[var(--module-accent)]/5 text-ink font-semibold"
                          : "border-hairline hover:border-ink-subtle bg-surface text-ink-muted hover:text-ink"
                        }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="text-xs font-bold truncate flex-1">{p.title}</span>
                        {p.requiresAcknowledgment && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${ack.acknowledged
                              ? "bg-tracker-success-light text-tracker-success"
                              : "bg-tracker-warning-light text-tracker-warning"
                            }`}>
                            {ack.acknowledged ? "ACK" : "REQ"}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-muted">Version {p.version}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed View & Acknowledge */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="tracker-card p-6 bg-surface space-y-6">
              <div className="h-6 bg-canvas animate-pulse rounded w-1/3" />
              <div className="h-24 bg-canvas animate-pulse rounded w-full" />
            </div>
          ) : !selectedPolicy ? (
            <div className="tracker-card-plain p-12 bg-surface flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-canvas rounded-full flex items-center justify-center text-ink-muted mb-4">
                <FileText size={32} />
              </div>
              <h2 className="text-lg font-bold text-ink">No Policy Selected</h2>
              <p className="text-sm text-ink-muted mt-1 max-w-sm">Select a category or policy document from the list to view its contents.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Document View */}
              <div className="tracker-card p-6 bg-surface">
                {/* Title and Metadata */}
                <div className="border-b border-hairline-soft pb-4 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="px-2.5 py-1 bg-canvas text-ink-muted text-xs font-semibold rounded-tracker-md border border-hairline">
                      {selectedPolicy.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                      <Calendar size={14} />
                      Effective: {new Date(selectedPolicy.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-ink mt-3">{selectedPolicy.title}</h2>
                  <p className="text-xs text-ink-muted mt-1">Version: {selectedPolicy.version}</p>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none text-ink leading-relaxed whitespace-pre-wrap select-text">
                  {selectedPolicy.content}
                </div>

                {/* Attachments */}
                {selectedPolicy.attachments && selectedPolicy.attachments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-hairline-soft">
                    <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider mb-3">Attachments</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedPolicy.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-canvas hover:bg-canvas-muted border border-hairline hover:border-ink-subtle rounded-tracker-md text-xs font-semibold text-ink transition-all shadow-xs"
                        >
                          <FileText size={14} className="text-indigo-500" />
                          <span>{file.filename || "Attachment"}</span>
                          <ExternalLink size={12} className="text-ink-muted" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acknowledgment Widget */}
              {selectedPolicy.requiresAcknowledgment && (
                <div className={`tracker-card p-6 bg-surface overflow-hidden relative ${currentAck.acknowledged
                    ? "border-l-4 border-l-tracker-success"
                    : "border-l-4 border-l-tracker-warning"
                  }`}>
                  {currentAck.acknowledged ? (
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 bg-tracker-success-light text-tracker-success rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Acknowledged</h3>
                        <p className="text-xs text-ink-muted mt-1">
                          You have read and acknowledged this policy document on <span className="font-semibold text-ink">{currentAck.date}</span>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 bg-tracker-warning-light text-tracker-warning rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                          <ShieldAlert size={22} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-ink">Read Acknowledgment Required</h3>
                          <p className="text-xs text-ink-muted mt-1 max-w-lg">
                            This is an official policy document. By clicking below, you acknowledge that you have fully read, understood, and agree to abide by the terms of this policy.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleAcknowledge}
                        disabled={acknowledging}
                        className="tracker-btn-accent min-h-[40px] px-6 flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-sm hover:brightness-105 transition-all disabled:opacity-50 flex-shrink-0"
                      >
                        {acknowledging ? "Processing..." : "Acknowledge Policy"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
