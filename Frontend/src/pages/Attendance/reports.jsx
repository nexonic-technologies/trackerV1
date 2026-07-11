import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/authProvider.jsx";
import useGenericAPI from "../../components/useGenericAPI";
import StatCard from "../../components/Common/StatCard";
import MonthNavigator from "../../components/Common/MonthNavigator";
import PageLoader from "../../components/Common/PageLoader";
import {
  BarChart3, TrendingUp, Clock, Users, AlertTriangle
} from "lucide-react";

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS = {
  "Present": "#10b981",
  "Check-Out": "#10b981",
  "Late Entry": "#f59e0b",
  "Early check-out": "#f97316",
  "Half Day": "#eab308",
  "Absent": "#ef4444",
  "Leave": "#3b82f6",
  "Work From Home": "#14b8a6",
  "Holiday": "#a855f7",
  "Week Off": "#94a3b8",
  "LOP": "#dc2626",
  "Pending": "#0ea5e9",
};

const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();

/* Simple SVG Bar */
const Bar = ({ value, max, color, label, count }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[12px] text-ink-subtle w-[90px] text-right truncate">{label}</span>
      <div className="flex-1 h-[24px] bg-surface-1 rounded-[6px] overflow-hidden relative">
        <div
          className="h-full rounded-[6px] transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-subtle">
          {count}
        </span>
      </div>
    </div>
  );
};

/* Donut Chart */
const DonutChart = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-surface-1" />
        {data.map((item, i) => {
          const pct = total > 0 ? item.value / total : 0;
          const dashLength = pct * circumference;
          const offset = circumference - accumulatedOffset * circumference / total;
          const el = (
            <circle
              key={i}
              cx={size/2} cy={size/2} r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-accumulatedOffset * circumference / total}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
          accumulatedOffset += item.value;
          return el;
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[22px] font-bold text-ink">{total}</span>
        <span className="text-[11px] text-ink-subtle">Total Days</span>
      </div>
    </div>
  );
};

/* Trend Sparkline */
const Sparkline = ({ data, width = 200, height = 50, color = "#10b981" }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
      {data.length > 0 && (
        <circle cx={(data.length - 1) / Math.max(data.length - 1, 1) * width} cy={height - (data[data.length - 1] / max) * (height - 4)} r={3} fill={color} />
      )}
    </svg>
  );
};

/* ════════════════════════════════
   STAT CARD
   ════════════════════════════════ */
/* StatCard imported from shared Common/StatCard.jsx */

/* ════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════ */
const AttendanceReports = () => {
  const { user } = useAuth();
  const { read } = useGenericAPI();

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const daysCount = getDaysInMonth(month, year);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00.000Z`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysCount).padStart(2, "0")}T23:59:59.999Z`;
        
        const [attRes, empRes] = await Promise.all([
          read("attendances", {
            filter: { date: { $gte: startDate, $lte: endDate } },
            limit: 50000,
            fields: "employee,date,status,workHours,overtimeHours,checkIn,checkOut"
          }),
          read("employees", {
            fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department",
            populateFields: { "professionalInfo.department": "name" },
            limit: 500,
            filter: { "professionalInfo.isActive": { $ne: false } }
          })
        ]);
        
        setAttendanceData(attRes?.data || []);
        setEmployees(empRes?.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [month, year, read, daysCount]);

  // Computed analytics
  const analytics = useMemo(() => {
    const statusCounts = {};
    let totalHours = 0, totalOvertime = 0, lateCounts = 0;
    const deptStats = {};
    const dailyCounts = {};

    attendanceData.forEach(rec => {
      const s = rec.status;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      
      if (rec.workHours) totalHours += rec.workHours;
      if (rec.overtimeHours) totalOvertime += rec.overtimeHours;
      if (s === "Late Entry") lateCounts++;

      // Dept stats
      const empId = rec.employee?._id || rec.employee;
      const emp = employees.find(e => e._id === empId);
      const dept = emp?.professionalInfo?.department?.name || "Unknown";
      if (!deptStats[dept]) deptStats[dept] = { present: 0, absent: 0, late: 0, total: 0 };
      deptStats[dept].total++;
      if (["Present", "Check-Out", "Work From Home", "Late Entry"].includes(s)) deptStats[dept].present++;
      else if (["Absent", "Unchecked"].includes(s)) deptStats[dept].absent++;
      if (s === "Late Entry") deptStats[dept].late++;

      // Daily counts
      const dayNum = new Date(rec.date).getDate();
      if (!dailyCounts[dayNum]) dailyCounts[dayNum] = { present: 0, absent: 0 };
      if (["Present", "Check-Out", "Work From Home", "Late Entry"].includes(s)) dailyCounts[dayNum].present++;
      else if (["Absent", "Unchecked"].includes(s)) dailyCounts[dayNum].absent++;
    });

    const presentTotal = (statusCounts["Present"] || 0) + (statusCounts["Check-Out"] || 0) + (statusCounts["Work From Home"] || 0) + (statusCounts["Late Entry"] || 0);
    const absentTotal = (statusCounts["Absent"] || 0) + (statusCounts["Unchecked"] || 0);
    const leaveTotal = (statusCounts["Leave"] || 0) + (statusCounts["LOP"] || 0);
    const halfDay = statusCounts["Half Day"] || 0;

    const attendanceRate = (presentTotal + absentTotal + leaveTotal + halfDay) > 0
      ? Math.round((presentTotal / (presentTotal + absentTotal + leaveTotal + halfDay)) * 100)
      : 0;

    const avgHoursPerDay = attendanceData.filter(r => r.workHours > 0).length > 0
      ? totalHours / attendanceData.filter(r => r.workHours > 0).length
      : 0;

    // Daily trend data
    const dailyPresent = Array.from({ length: daysCount }, (_, i) => dailyCounts[i + 1]?.present || 0);

    return {
      statusCounts, totalHours, totalOvertime, lateCounts,
      presentTotal, absentTotal, leaveTotal, halfDay,
      attendanceRate, avgHoursPerDay, deptStats, dailyPresent
    };
  }, [attendanceData, employees, daysCount]);

  // Donut data
  const donutData = useMemo(() => [
    { label: "Present", value: analytics.presentTotal, color: "#10b981" },
    { label: "Absent", value: analytics.absentTotal, color: "#ef4444" },
    { label: "Leave", value: analytics.leaveTotal, color: "#3b82f6" },
    { label: "Half Day", value: analytics.halfDay, color: "#eab308" },
    { label: "Late Entry", value: analytics.lateCounts, color: "#f59e0b" },
  ].filter(d => d.value > 0), [analytics]);

  // Navigation
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  if (loading) return <PageLoader />;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-y-auto bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-ink" />
          <h1 className="text-[20px] font-semibold text-ink">Attendance Reports</h1>
        </div>
        <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {/* ─── STAT CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Attendance Rate" value={`${analytics.attendanceRate}%`}       icon={TrendingUp}    color="green" />
        <StatCard title="Avg Hours/Day"   value={`${analytics.avgHoursPerDay.toFixed(1)}h`} icon={Clock}    color="blue" />
        <StatCard title="Late Entries"    value={analytics.lateCounts}                  icon={AlertTriangle} color="yellow" />
        <StatCard title="Total Overtime"  value={`${analytics.totalOvertime.toFixed(1)}h`}  icon={Users}    color="purple" />
      </div>

      {/* ─── CHARTS ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Donut Chart - Status Distribution */}
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
          <h3 className="text-[14px] font-medium text-ink mb-4">Status Distribution</h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart data={donutData} />
            <div className="flex flex-wrap gap-3 justify-center">
              {donutData.map(d => (
                <div key={d.label} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-ink-subtle">{d.label}: <span className="text-ink font-medium">{d.value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
          <h3 className="text-[14px] font-medium text-ink mb-4">Department Breakdown</h3>
          <div className="flex flex-col gap-2.5">
            {Object.entries(analytics.deptStats)
              .sort((a, b) => b[1].present - a[1].present)
              .slice(0, 8)
              .map(([dept, stats]) => {
                const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                return (
                  <div key={dept}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-ink truncate max-w-[140px]">{dept}</span>
                      <span className="text-[11px] font-medium text-ink-subtle">{rate}%</span>
                    </div>
                    <div className="h-[6px] bg-surface-1 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            {Object.keys(analytics.deptStats).length === 0 && (
              <p className="text-[12px] text-ink-tertiary text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
          <h3 className="text-[14px] font-medium text-ink mb-4">Daily Attendance Trend</h3>
          <div className="flex items-center justify-center py-4">
            <Sparkline data={analytics.dailyPresent} width={240} height={80} color="#10b981" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-subtle mt-2 px-1">
            <span>1 {MONTH_SHORT[month]}</span>
            <span>{daysCount} {MONTH_SHORT[month]}</span>
          </div>
          <div className="mt-3 text-center">
            <span className="text-[12px] text-ink-subtle">
              Peak: <span className="font-medium text-ink">{Math.max(...analytics.dailyPresent)}</span> employees
            </span>
          </div>
        </div>
      </div>

      {/* ─── LATE ENTRY ANALYSIS ─── */}
      <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
        <h3 className="text-[14px] font-medium text-ink mb-4">Status Breakdown</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(analytics.statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <Bar
                key={status}
                value={count}
                max={Math.max(...Object.values(analytics.statusCounts))}
                color={STATUS_COLORS[status] || "#94a3b8"}
                label={status}
                count={count}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;
