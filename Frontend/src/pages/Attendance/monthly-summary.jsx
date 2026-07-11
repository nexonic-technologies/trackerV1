import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/authProvider.jsx";
import useGenericAPI from "../../components/useGenericAPI";
import StatCard from "../../components/Common/StatCard";
import MonthNavigator from "../../components/Common/MonthNavigator";
import PageLoader from "../../components/Common/PageLoader";
import {
  Calendar, Users, Download,
  CheckCircle, Clock, AlertTriangle, Sun
} from "lucide-react";

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATUS_MAP = {
  "Present":         { short: "P",  color: "bg-emerald-500",  text: "text-white" },
  "Check-Out":       { short: "P",  color: "bg-emerald-500",  text: "text-white" },
  "Late Entry":      { short: "L",  color: "bg-amber-500",    text: "text-white" },
  "Early check-out": { short: "E",  color: "bg-orange-500",   text: "text-white" },
  "Half Day":        { short: "H",  color: "bg-yellow-500",   text: "text-black" },
  "Absent":          { short: "A",  color: "bg-red-500",      text: "text-white" },
  "Leave":           { short: "Lv", color: "bg-blue-500",     text: "text-white" },
  "Holiday":         { short: "Ho", color: "bg-purple-500",   text: "text-white" },
  "Week Off":        { short: "W",  color: "bg-slate-400",    text: "text-white" },
  "Work From Home":  { short: "WH", color: "bg-teal-500",     text: "text-white" },
  "Unchecked":       { short: "U",  color: "bg-gray-400",     text: "text-white" },
  "LOP":             { short: "LP", color: "bg-red-700",      text: "text-white" },
  "Pending":         { short: "?",  color: "bg-sky-500",      text: "text-white" },
};

const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

const isWeekend = (year, month, day) => {
  const d = new Date(year, month, day);
  return d.getDay() === 0; // Sunday
};

const getLocalDateStr = (y, m, d) => {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/* ════════════════════════════════
   STAT CARD
   ════════════════════════════════ */
/* StatCard, MonthNavigator, PageLoader imported from shared components */

/* ════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════ */
const MonthlySummary = () => {
  const { user } = useAuth();
  const { read } = useGenericAPI();

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const daysCount = getDaysInMonth(month, year);
  const dayNumbers = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await read("employees", {
          fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department,professionalInfo.designation",
          populateFields: { "professionalInfo.department": "name", "professionalInfo.designation": "title" },
          limit: 500,
          filter: { "professionalInfo.isActive": { $ne: false } }
        });
        setEmployees(res?.data || []);
        
        // Extract unique departments
        const depts = [...new Set(
          (res?.data || [])
            .map(e => e.professionalInfo?.department?.name)
            .filter(Boolean)
        )].sort();
        setDepartments(depts);
      } catch (e) { console.error(e); }
    };
    fetchEmployees();
  }, [read]);

  // Fetch attendance for month
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00.000Z`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysCount).padStart(2, "0")}T23:59:59.999Z`;
        
        const res = await read("attendances", {
          filter: { date: { $gte: startDate, $lte: endDate } },
          limit: 50000,
          fields: "employee,date,status,workHours,overtimeHours,checkIn,checkOut"
        });
        setAttendanceData(res?.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAttendance();
  }, [month, year, read, daysCount]);

  // Build employee → day → record map
  const empDayMap = useMemo(() => {
    const map = {};
    attendanceData.forEach(rec => {
      const empId = rec.employee?._id || rec.employee;
      const dateStr = new Date(rec.date).toISOString().split("T")[0];
      if (!map[empId]) map[empId] = {};
      map[empId][dateStr] = rec;
    });
    return map;
  }, [attendanceData]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.toLowerCase();
      const dept = emp.professionalInfo?.department?.name || "";
      
      if (deptFilter !== "all" && dept !== deptFilter) return false;
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0;
    
    attendanceData.forEach(rec => {
      const s = rec.status;
      if (["Present", "Check-Out", "Work From Home"].includes(s)) totalPresent++;
      else if (s === "Absent" || s === "Unchecked") totalAbsent++;
      else if (s === "Late Entry") { totalPresent++; totalLate++; }
      else if (s === "Leave" || s === "LOP") totalLeave++;
      else if (s === "Half Day") { totalPresent += 0.5; totalAbsent += 0.5; }
    });

    const todayPresentCount = attendanceData
      .filter(r => r.date && new Date(r.date).toISOString().split("T")[0] === todayStr)
      .filter(r => ["Present", "Check-Out", "Late Entry", "Work From Home"].includes(r.status))
      .length;

    return { totalPresent: Math.round(totalPresent), totalAbsent: Math.round(totalAbsent), totalLate, totalLeave, todayPresentCount };
  }, [attendanceData]);

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ["Employee", "Department", ...dayNumbers.map(d => `${d}`), "Present", "Absent", "Late", "Leave"];
    const rows = filteredEmployees.map(emp => {
      const empId = emp._id;
      const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`;
      const dept = emp.professionalInfo?.department?.name || "—";
      let present = 0, absent = 0, late = 0, leave = 0;
      
      const dayCols = dayNumbers.map(day => {
        const dateStr = getLocalDateStr(year, month, day);
        const rec = empDayMap[empId]?.[dateStr];
        if (!rec) {
          if (!isWeekend(year, month, day) && new Date(year, month, day) <= new Date()) absent++;
          return isWeekend(year, month, day) ? "W" : "";
        }
        const s = rec.status;
        if (["Present", "Check-Out", "Work From Home"].includes(s)) present++;
        else if (s === "Late Entry") { present++; late++; }
        else if (s === "Absent" || s === "Unchecked") absent++;
        else if (s === "Leave" || s === "LOP") leave++;
        else if (s === "Half Day") { present += 0.5; absent += 0.5; }
        return STATUS_MAP[s]?.short || s?.charAt(0) || "";
      });

      return [name, dept, ...dayCols, present, absent, late, leave];
    });

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${MONTH_NAMES[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader />;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-hidden bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-ink" />
          <h1 className="text-[20px] font-semibold text-ink">Monthly Attendance Summary</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 tracker-btn-secondary cursor-pointer">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-shrink-0">
        <StatCard title="Employees"    value={filteredEmployees.length} icon={Users}         color="blue" />
        <StatCard title="Present Today" value={stats.todayPresentCount} icon={CheckCircle}   color="green" />
        <StatCard title="Late Entries"  value={stats.totalLate}         icon={Clock}         color="yellow" />
        <StatCard title="On Leave"      value={stats.totalLeave}        icon={Sun}           color="purple" />
        <StatCard title="Total Absent"  value={stats.totalAbsent}       icon={AlertTriangle} color="red" />
      </div>

      {/* ─── FILTERS ─── */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search employee..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-[13px] bg-surface border border-hairline rounded-[8px] text-ink placeholder:text-ink-tertiary w-[220px] outline-none focus:border-accent transition"
        />
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-[13px] bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        
        {/* Legend */}
        <div className="ml-auto flex items-center gap-2 flex-wrap text-[11px]">
          {Object.entries(STATUS_MAP).slice(0, 7).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-[3px] ${val.color}`} />
              <span className="text-ink-subtle">{val.short} – {key}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── GRID TABLE ─── */}
      <div className="flex-1 overflow-auto bg-surface rounded-tracker-card border border-hairline shadow-sm">
        <table className="w-full border-collapse text-[12px]" style={{ minWidth: `${200 + daysCount * 36}px` }}>
          <thead className="sticky top-0 z-10 bg-surface-1">
            <tr>
              <th className="sticky left-0 z-20 bg-surface-1 text-left px-3 py-2.5 font-medium text-ink-subtle border-b border-r border-hairline min-w-[180px]">
                Employee
              </th>
              {dayNumbers.map(day => {
                const weekend = isWeekend(year, month, day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                  <th key={day} className={`px-0 py-2.5 text-center font-medium border-b border-hairline min-w-[32px]
                    ${weekend ? 'text-red-400 bg-red-50/30 dark:bg-red-950/10' : 'text-ink-subtle'}
                    ${isToday ? 'bg-accent/10 text-accent' : ''}`}
                  >
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[10px]">{["S","M","T","W","T","F","S"][new Date(year, month, day).getDay()]}</span>
                      <span>{day}</span>
                    </div>
                  </th>
                );
              })}
              <th className="px-2 py-2.5 text-center font-medium text-ink-subtle border-b border-l border-hairline min-w-[40px]">P</th>
              <th className="px-2 py-2.5 text-center font-medium text-ink-subtle border-b border-hairline min-w-[40px]">A</th>
              <th className="px-2 py-2.5 text-center font-medium text-ink-subtle border-b border-hairline min-w-[40px]">L</th>
              <th className="px-2 py-2.5 text-center font-medium text-ink-subtle border-b border-hairline min-w-[40px]">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const empId = emp._id;
              const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`;
              const dept = emp.professionalInfo?.department?.name || "";
              let pCount = 0, aCount = 0, lCount = 0, totalHrs = 0;

              return (
                <tr key={empId} className={`${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-1/30'} hover:bg-accent/5 transition`}>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-b border-r border-hairline-soft">
                    <div className="flex flex-col">
                      <span className="font-medium text-ink text-[12px] truncate max-w-[160px]">{name}</span>
                      <span className="text-[10px] text-ink-tertiary truncate max-w-[160px]">{dept}</span>
                    </div>
                  </td>
                  {dayNumbers.map(day => {
                    const dateStr = getLocalDateStr(year, month, day);
                    const rec = empDayMap[empId]?.[dateStr];
                    const weekend = isWeekend(year, month, day);
                    const isFuture = new Date(year, month, day) > new Date();
                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                    let cellContent = "";
                    let cellClass = "";

                    if (rec) {
                      const sm = STATUS_MAP[rec.status] || { short: "?", color: "bg-gray-300", text: "text-white" };
                      cellContent = sm.short;
                      cellClass = `${sm.color} ${sm.text}`;
                      
                      if (["Present", "Check-Out", "Work From Home", "Late Entry"].includes(rec.status)) pCount++;
                      else if (rec.status === "Half Day") { pCount += 0.5; aCount += 0.5; }
                      else if (["Absent", "Unchecked"].includes(rec.status)) aCount++;
                      else if (["Leave", "LOP"].includes(rec.status)) lCount++;
                      
                      if (rec.workHours) totalHrs += rec.workHours;
                    } else if (weekend) {
                      cellContent = "W";
                      cellClass = "bg-slate-200/50 text-slate-400 dark:bg-slate-800/30 dark:text-slate-500";
                    } else if (isFuture) {
                      cellContent = "·";
                      cellClass = "text-ink-tertiary";
                    } else {
                      cellContent = "A";
                      cellClass = "bg-red-100 text-red-500 dark:bg-red-950/20 dark:text-red-400";
                      aCount++;
                    }

                    return (
                      <td key={day} className={`text-center border-b border-hairline-soft px-0 py-1.5 ${isToday ? 'bg-accent/5' : ''}`}>
                        <span className={`inline-flex items-center justify-center w-[24px] h-[20px] rounded-[4px] text-[10px] font-semibold ${cellClass}`}
                          title={rec ? `${rec.status}${rec.workHours ? ` · ${rec.workHours.toFixed(1)}h` : ''}` : weekend ? 'Weekend' : isFuture ? 'Upcoming' : 'Absent'}
                        >
                          {cellContent}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center border-b border-l border-hairline-soft px-1 py-1.5 font-medium text-emerald-600 dark:text-emerald-400">{Math.round(pCount)}</td>
                  <td className="text-center border-b border-hairline-soft px-1 py-1.5 font-medium text-red-500">{Math.round(aCount)}</td>
                  <td className="text-center border-b border-hairline-soft px-1 py-1.5 font-medium text-blue-500">{lCount}</td>
                  <td className="text-center border-b border-hairline-soft px-1 py-1.5 font-medium text-ink-subtle">{totalHrs > 0 ? `${totalHrs.toFixed(0)}` : "—"}</td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={daysCount + 5} className="text-center py-12 text-ink-tertiary text-[14px]">
                  No employees found matching the filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlySummary;
