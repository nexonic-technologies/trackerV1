import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import MonthNavigator from "../../../components/Common/MonthNavigator";
import PageLoader from "../../../components/Common/PageLoader";
import {
  Calendar, Users, SunMedium, Clock
} from "lucide-react";

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LEAVE_TYPE_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  "bg-cyan-500", "bg-orange-500"
];

const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (m, y) => {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
};

/* ════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════ */
const LeaveCalendar = () => {
  const { user } = useAuth();
  const { read } = useGenericAPI();

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const daysCount = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00.000Z`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysCount).padStart(2, "0")}T23:59:59.999Z`;

        const [leaveRes, holidayRes, typeRes, empRes] = await Promise.all([
          read("leaves", {
            filter: {
              $or: [
                { startDate: { $gte: startDate, $lte: endDate } },
                { endDate: { $gte: startDate, $lte: endDate } },
                { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
              ],
              status: { $in: ["Approved", "Pending"] }
            },
            populateFields: { employee: "basicInfo.firstName,basicInfo.lastName", leaveType: "name" },
            limit: 5000,
          }),
          read("holidays", {
            filter: { date: { $gte: startDate, $lte: endDate } },
            limit: 100,
          }),
          read("leavetypes", { limit: 50 }),
          read("employees", {
            fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department",
            populateFields: { "professionalInfo.department": "name" },
            limit: 500,
            filter: { "professionalInfo.isActive": { $ne: false } }
          })
        ]);

        setLeaves(leaveRes?.data || []);
        setHolidays(holidayRes?.data || []);
        setLeaveTypes(typeRes?.data || []);
        setEmployees(empRes?.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [month, year, read, daysCount]);

  // Build leave type color map
  const typeColorMap = useMemo(() => {
    const map = {};
    leaveTypes.forEach((lt, i) => {
      map[lt._id] = LEAVE_TYPE_COLORS[i % LEAVE_TYPE_COLORS.length];
    });
    return map;
  }, [leaveTypes]);

  // Build day → leaves mapping
  const dayLeavesMap = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(year, month, d);
      const dayLeaves = leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return dateObj >= start && dateObj <= end;
      });
      if (dayLeaves.length > 0) map[d] = dayLeaves;
    }
    return map;
  }, [leaves, month, year, daysCount]);

  // Build holiday map
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      const d = new Date(h.date).getDate();
      map[d] = h;
    });
    return map;
  }, [holidays]);

  // Stats
  const stats = useMemo(() => {
    const approvedCount = leaves.filter(l => l.status === "Approved").length;
    const pendingCount = leaves.filter(l => l.status === "Pending").length;
    const uniqueEmployees = new Set(leaves.map(l => l.employee?._id || l.employee)).size;
    return { approvedCount, pendingCount, uniqueEmployees, holidays: holidays.length };
  }, [leaves, holidays]);

  // Navigation
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Calendar grid cells
  const calendarCells = useMemo(() => {
    const cells = [];
    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) cells.push({ type: "empty" });
    // Days of month
    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(year, month, d);
      const isSunday = dateObj.getDay() === 0;
      const isSaturday = dateObj.getDay() === 6;
      const isToday = dateObj.toDateString() === new Date().toDateString();
      const dayLeaves = dayLeavesMap[d] || [];
      const holiday = holidayMap[d];
      cells.push({ type: "day", day: d, isSunday, isSaturday, isToday, leaves: dayLeaves, holiday });
    }
    return cells;
  }, [firstDay, daysCount, year, month, dayLeavesMap, holidayMap]);

  const selectedDayLeaves = selectedDay ? (dayLeavesMap[selectedDay] || []) : [];
  const selectedHoliday = selectedDay ? holidayMap[selectedDay] : null;

  if (loading) return <PageLoader />;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-y-auto bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-ink" />
          <h1 className="text-[20px] font-semibold text-ink">Leave Calendar</h1>
        </div>
        <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface rounded-tracker-card border border-hairline p-3 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-[8px] bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
            <Calendar className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-ink">{stats.approvedCount}</p>
            <p className="text-[11px] text-ink-subtle">Approved Leaves</p>
          </div>
        </div>
        <div className="bg-surface rounded-tracker-card border border-hairline p-3 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-[8px] bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-ink">{stats.pendingCount}</p>
            <p className="text-[11px] text-ink-subtle">Pending</p>
          </div>
        </div>
        <div className="bg-surface rounded-tracker-card border border-hairline p-3 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-ink">{stats.uniqueEmployees}</p>
            <p className="text-[11px] text-ink-subtle">On Leave</p>
          </div>
        </div>
        <div className="bg-surface rounded-tracker-card border border-hairline p-3 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-[8px] bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
            <SunMedium className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-ink">{stats.holidays}</p>
            <p className="text-[11px] text-ink-subtle">Holidays</p>
          </div>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-surface rounded-tracker-card border border-hairline shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-hairline bg-surface-1">
            {DAY_HEADERS.map((d, i) => (
              <div key={d} className={`py-2.5 text-center text-[12px] font-medium ${i >= 5 ? 'text-red-400' : 'text-ink-subtle'}`}>
                {d}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, idx) => {
              if (cell.type === "empty") return <div key={`e-${idx}`} className="min-h-[80px] border-b border-r border-hairline-soft bg-surface-1/20" />;
              
              const { day, isSunday, isSaturday, isToday, leaves: dayLeaves, holiday } = cell;
              const hasLeaves = dayLeaves.length > 0;
              const isSelected = selectedDay === day;
              
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[80px] p-1.5 border-b border-r border-hairline-soft cursor-pointer transition-colors
                    ${isToday ? 'bg-accent/5 ring-1 ring-inset ring-accent/30' : ''}
                    ${isSunday ? 'bg-red-50/30 dark:bg-red-950/5' : ''}
                    ${isSelected ? 'bg-accent/10 ring-2 ring-inset ring-accent' : 'hover:bg-surface-1/50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[12px] font-medium ${isToday ? 'bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center' : isSunday ? 'text-red-400' : 'text-ink-subtle'}`}>
                      {day}
                    </span>
                    {holiday && (
                      <span className="text-[8px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded truncate max-w-[60px]">
                        Holiday
                      </span>
                    )}
                  </div>
                  
                  {/* Leave indicators */}
                  <div className="flex flex-col gap-0.5">
                    {dayLeaves.slice(0, 3).map((l, i) => {
                      const empName = l.employee?.basicInfo 
                        ? `${l.employee.basicInfo.firstName || ""} ${(l.employee.basicInfo.lastName || "").charAt(0)}.`
                        : "Employee";
                      const typeId = l.leaveType?._id || l.leaveType;
                      const color = typeColorMap[typeId] || "bg-blue-500";
                      
                      return (
                        <div key={i} className={`flex items-center gap-1 px-1 py-0.5 rounded-[3px] ${color} bg-opacity-20`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                          <span className="text-[9px] text-ink truncate">{empName}</span>
                        </div>
                      );
                    })}
                    {dayLeaves.length > 3 && (
                      <span className="text-[9px] text-ink-tertiary pl-1">+{dayLeaves.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Day Details */}
        <div className="bg-surface rounded-tracker-card border border-hairline shadow-sm p-4 flex flex-col">
          {selectedDay ? (
            <>
              <h3 className="text-[14px] font-medium text-ink mb-3">
                {selectedDay} {MONTH_NAMES[month]} {year}
              </h3>
              
              {selectedHoliday && (
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-[8px] p-3 mb-3">
                  <p className="text-[12px] font-medium text-purple-700 dark:text-purple-300">🎉 {selectedHoliday.name || "Holiday"}</p>
                </div>
              )}

              {selectedDayLeaves.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {selectedDayLeaves.map((l, i) => {
                    const empName = l.employee?.basicInfo
                      ? `${l.employee.basicInfo.firstName || ""} ${l.employee.basicInfo.lastName || ""}`
                      : "Employee";
                    const typeName = l.leaveType?.name || "Leave";
                    const isPending = l.status === "Pending";
                    
                    return (
                      <div key={i} className="bg-surface-1 rounded-[8px] p-3 border border-hairline-soft">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-ink">{empName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'}`}>
                            {l.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-subtle">{typeName}</p>
                        <p className="text-[10px] text-ink-tertiary mt-1">
                          {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                        </p>
                        {l.reason && <p className="text-[10px] text-ink-tertiary mt-0.5 italic">"{l.reason}"</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-ink-tertiary py-4 text-center">No leaves on this day</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-ink-tertiary">
              <Calendar className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-[13px]">Click a day to see details</p>
            </div>
          )}

          {/* Leave Type Legend */}
          <div className="mt-auto pt-4 border-t border-hairline-soft">
            <h4 className="text-[11px] font-medium text-ink-subtle mb-2">Leave Types</h4>
            <div className="flex flex-wrap gap-2">
              {leaveTypes.map((lt, i) => (
                <div key={lt._id} className="flex items-center gap-1.5 text-[10px]">
                  <span className={`w-2.5 h-2.5 rounded-full ${LEAVE_TYPE_COLORS[i % LEAVE_TYPE_COLORS.length]}`} />
                  <span className="text-ink-subtle">{lt.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
