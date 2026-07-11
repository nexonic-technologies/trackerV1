import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Filter,
  Download,
  Eye,
  Lock,
  Unlock,
  FileText
} from "lucide-react";

const STATUS_CHIP = {
  approved: "bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  pending: "bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  rejected: "bg-rose-100 text-rose-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  confirmed: "bg-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function AccountsReports() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [loading, setLoading] = useState(true);
  const [periodClosures, setPeriodClosures] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [closuresRes, expensesRes, paymentsRes] = await Promise.all([
        axiosInstance.post("/populate/read/periodclosures", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/expenses", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/payments", { limit: 1000, sort: { createdAt: -1 } })
      ]);

      setPeriodClosures(closuresRes.data?.data || []);
      setExpenses(expensesRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load reports data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    { label: "Total Expenses", value: expenses.reduce((sum, e) => sum + (e.dayTotal || 0), 0), color: "#f59e0b" },
    { label: "Total Payments", value: payments.reduce((sum, p) => sum + (p.amount || 0), 0), color: "#10b981" },
    { label: "Pending Approvals", value: expenses.filter(e => e.status === "pending").length, color: "#ef4444" },
    { label: "Closed Periods", value: periodClosures.filter(c => c.status === "Closed").length, color: "#64748b" }
  ];

  const checkPeriodStatus = (date) => {
    if (!date) return { locked: false, closure: null };
    
    const targetDate = new Date(date);
    const closure = periodClosures.find(c => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return targetDate >= start && targetDate <= end && 
             c.status === "Closed" && 
             c.modules?.expenses?.closed;
    });

    return { locked: !!closure, closure };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-module="accounts">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="lmx-page-eyebrow mb-1">ACCOUNTS & FINANCE</p>
          <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
            <BarChart3 size={22} className="text-brand" />
            Financial Reports
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">Period verification and expense approval reports</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="pay-stat-card">
            <p className="pay-stat-card__label">{stat.label}</p>
            <p className="pay-stat-card__value" style={{ color: stat.color }}>
              {typeof stat.value === "number" ? formatCurrency(stat.value) : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hairline">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "expenses" 
              ? "text-brand border-b-2 border-brand" 
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Expense Reports
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "payments" 
              ? "text-brand border-b-2 border-brand" 
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Payment Reports
        </button>
        <button
          onClick={() => setActiveTab("closures")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "closures" 
              ? "text-brand border-b-2 border-brand" 
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Period Closure Status
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="lmx-input text-[12px]"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        
        <select 
          value={filterPeriod} 
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="lmx-input text-[12px]"
        >
          <option value="">All Periods</option>
          {[...new Set(periodClosures.map(c => c.periodLabel))].map(period => (
            <option key={period} value={period}>{period}</option>
          ))}
        </select>
      </div>

      {/* Expense Reports Tab */}
      {activeTab === "expenses" && (
        <div className="pay-card overflow-hidden">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink">Expense Approval Report</h3>
            <button className="tracker-btn-ghost flex items-center gap-1.5 text-[12px]">
              <Download size={13} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {expenses
                  .filter(e => !filterStatus || e.status === filterStatus)
                  .map(expense => {
                    const periodStatus = checkPeriodStatus(expense.date);
                    return (
                      <tr key={expense._id} className="hover:bg-canvas/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-ink-muted">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-ink">
                          {expense.employeeId?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink">
                          {expense.clientId?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-brand">
                          {formatCurrency(expense.dayTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={STATUS_CHIP[expense.status] || STATUS_CHIP.pending}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {periodStatus.locked ? (
                            <span className="flex items-center gap-1 text-[11px] text-rose-600">
                              <Lock size={11} /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                              <Unlock size={11} /> Open
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button className="tracker-btn-ghost text-[12px] py-1">
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Reports Tab */}
      {activeTab === "payments" && (
        <div className="pay-card overflow-hidden">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink">Payment Confirmation Report</h3>
            <button className="tracker-btn-ghost flex items-center gap-1.5 text-[12px]">
              <Download size={13} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {payments.map(payment => (
                  <tr key={payment._id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-ink-muted">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink">
                      {payment.clientId?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {payment.referenceNo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CHIP[payment.status] || STATUS_CHIP.pending}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Closure Status Tab */}
      {activeTab === "closures" && (
        <div className="space-y-3">
          {periodClosures.length === 0 && (
            <div className="pay-card p-8 text-center">
              <Calendar size={32} className="mx-auto mb-3 lmx-icon-tile" />
              <p className="text-[14px] font-semibold text-ink">No period closures defined</p>
              <p className="text-[13px] text-ink-muted mt-1">Contact finance team to set up period closures</p>
            </div>
          )}

          {periodClosures.map(closure => (
            <div key={closure._id} className="pay-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="lmx-icon-tile">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{closure.periodLabel}</p>
                    <p className="text-[12px] text-ink-muted">
                      {formatDate(closure.startDate)} - {formatDate(closure.endDate)}
                      <span className="mx-2">·</span>
                      {closure.financialYearLabel}
                    </p>
                  </div>
                </div>

                <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>{closure.status}</span>
              </div>

              {/* Module status */}
              <div className="mt-3 pt-3 border-t border-hairline-soft">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
                    <div 
                      key={moduleName} 
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] ${
                        moduleData.closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {moduleData.closed ? <Lock size={11} /> : <Unlock size={11} />}
                      {moduleName}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {closure.summary && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-ink-muted">
                  <div>
                    <span className="block text-ink-subtle">Expenses</span>
                    <span className="font-medium text-ink">{formatCurrency(closure.summary.totalExpenseAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Payroll Records</span>
                    <span className="font-medium text-ink">{closure.summary.totalPayrollRecords || 0}</span>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Attendance</span>
                    <span className="font-medium text-ink">{closure.summary.totalAttendanceRecords || 0}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
