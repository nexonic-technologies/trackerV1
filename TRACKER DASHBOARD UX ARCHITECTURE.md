# TRACKER DASHBOARD UX ARCHITECTURE — OPTIMIZED

> **Version:** 2.0 — Ruthless Optimization Pass
> **Rule:** If a section does not help a user make a decision within 30 seconds, it is deleted.
> **Principle:** Maximum decisions per pixel. Zero decoration.

---

## 1. The 30-Second Knife — What Dies, What Lives

Every element from the V1 architecture is challenged below. The test is simple:

> "Does this help [designation] make a decision in 30 seconds?"
>
> If NO → **KILL IT.**

### Elements Killed

| # | Element | Why It Dies |
|---|---------|-------------|
| 1 | **Hero Section (greeting + emoji + date)** | "Good Morning ☀️" takes 80px of vertical space and produces zero decisions. The user knows their name, the date, and the time of day. **Kill for Manager/Admin/Executive/MD.** Keep a minimal 40px header for Employee only (because the Clock In button lives there). |
| 2 | **Workforce Pulse Bar** (for Employee) | An employee doesn't manage the workforce. Showing them org attendance composition is noise. **Kill for Employee.** Keep only for Manager+ roles. |
| 3 | **Quick Actions panel** | Static navigation links. The sidebar already has navigation. If the Action Center shows "5 pending leaves," the user clicks THAT — they don't need a separate "Approve Leaves" shortcut. Quick Actions duplicates the sidebar AND the Action Center. **Kill entirely.** |
| 4 | **"Upcoming Events" strip** | "Tomorrow: 2 on leave · Sprint Review at 3pm" — this is calendar information. The user has a calendar app. A dashboard is not a calendar. It doesn't trigger a decision. **Kill entirely.** |
| 5 | **Task Status Distribution chart** | A donut chart showing Backlog/In Progress/Review/Done is interesting but not actionable. The only question that matters: "Are any tasks overdue?" The donut answers a different question ("How is work distributed?") which is a weekly planning question, not a daily dashboard question. **Kill from dashboard. Move to Tasks module.** |
| 6 | **Leave Calendar Heatmap** | Pretty visualization. Takes 200px minimum. Answers "When are people off this week?" — a planning question, not an immediate decision. **Kill. Move to Leave module.** |
| 7 | **Sparkline trends in stat cards** | A 7-day sparkline inside a stat card takes 40px height and requires the user to interpret a micro-chart. A simple "+2 since yesterday" text conveys the same information in 12px. **Kill sparklines. Keep text trends.** |
| 8 | **New Joiner / Probation Alerts widget** | Updates monthly. Does not help a daily 30-second scan. **Kill from dashboard. Move to HR module.** |
| 9 | **"Tickets Resolved Today" metric** | Vanity. Answers "How productive were we?" — that's a retrospective question. **Kill.** |
| 10 | **Active Time Trackers widget** | "Who is working on what right now" — micromanagement, not management. A manager who needs to see live timers has a trust problem, not a dashboard problem. **Kill from dashboard. Available in Tasks module.** |
| 11 | **My Ticket Queue** (for Employee) | Most employees don't handle tickets. For those who do, tickets appear in their Action Center. A separate panel is redundant. **Kill as standalone. Merge into Action Center.** |
| 12 | **Payroll Status Card** (for Employee) | An employee cannot act on payroll processing status. They can only view their own payslip. **Kill for Employee. Keep for Admin/MD only.** |
| 13 | **Context-Aware Quick Actions** | The "enhanced" version of Quick Actions. Still navigation links. Still killed. The Action Center IS the context-aware action system. **Kill.** |
| 14 | **Notification Feed** (as dashboard panel) | Notifications already have a bell icon in the header. Duplicating them as a dashboard panel wastes space. **Kill as panel. Keep bell icon.** |

### What Survives (Per Designation)

Every designation gets **AT MOST** 3 vertical sections above the fold (≤900px viewport height):

| Section | Employee | Manager | Admin/HR | Executive | MD |
|---------|----------|---------|----------|-----------|-----|
| Alert Banner (conditional) | — | ✅ | ✅ | ✅ | ✅ |
| Compact Header (name + clock) | ✅ (with Clock In) | — | — | — | — |
| Workforce Pulse (inline) | — | ✅ (team only) | ✅ (org) | ✅ (org) | ✅ (org) |
| Stat Row (2-3 cards MAX) | ✅ (2 cards) | ✅ (3 cards) | ✅ (3 cards) | ✅ (3 cards) | ✅ (2 cards) |
| Action Center | — | ✅ | ✅ | ✅ | ✅ |
| My Tasks (compact) | ✅ | — | — | — | — |
| Leave Balance (inline) | ✅ | — | — | — | — |
| Team Attendance Grid | — | ✅ | — | — | — |
| Pending Approvals (inline) | — | — | ✅ | — | — |

**Total sections above fold:**
- **Employee:** 3 (Header+Clock, Stats, Tasks+Balance)
- **Manager:** 3 (Pulse+Alert, Stats, ActionCenter+TeamGrid)
- **Admin/HR:** 3 (Pulse+Alert, Stats, ActionCenter)
- **Executive:** 3 (Pulse+Alert, Stats, ActionCenter)
- **MD:** 2 (Pulse+Alert, Stats+ActionCenter merged)

---

## 2. Designation-Based Dashboard Blueprints

### 2.1 EMPLOYEE Dashboard

**Decision the employee makes:** "Am I tracked? What do I work on?"
**Time budget:** 10 seconds to confirm attendance, 20 seconds to pick a task.
**Screen budget:** Everything above the fold. No scrolling required.

```
╔═══════════════════════════════════════════════════════════╗  40px
║ Arun Bharathi · ✅ Checked In 9:02 AM (4h 23m)  [⏸ OUT] ║  ← HEADER ROW
╠═════════════════════════════╦═════════════════════════════╣
║ 📋 My Tasks          3 open ║ 📅 Leave Balance            ║  
║ ┌─────────────────────────┐ ║ ┌─────────────────────────┐ ║
║ │🔴 API Integration      │ ║ │ Casual    ████░░  4/6   │ ║
║ │   Due: Today · High    │ ║ │ Sick      ██████  3/3   │ ║
║ │   [▶ Start Timer]      │ ║ │ Earned    ██░░░░  2/8   │ ║
║ │🟡 UI Review            │ ║ │ Comp-Off  █░░░░░  1/4   │ ║
║ │   Due: Jun 25 · Medium │ ║ ├─────────────────────────┤ ║
║ │🟢 Docs Update          │ ║ │ [Apply Leave]           │ ║
║ │   Due: Jun 28 · Low    │ ║ └─────────────────────────┘ ║
║ └─────────────────────────┘ ║                             ║  
║                MAIN (60%)   ║           SIDE (40%)        ║
╚═════════════════════════════╩═════════════════════════════╝
```

**Total height:** ~360px. Fits on any screen. Zero scroll.

**What's on screen:**
1. **Header Row (40px):** Name, attendance status, duration, Clock Out button. This IS the "stat card" — compressed into a single row. No icon tile, no card border, no subtitle. Just data.
2. **My Tasks (left, 60%):** Top 3 tasks sorted by: overdue first → high priority → nearest deadline. Each shows title, deadline, priority dot, and a "Start Timer" button for the top item only.
3. **Leave Balance (right, 40%):** Per-type progress bars. Total available calculated from `employees.leaveStatus[].available`. "Apply Leave" link at the bottom.

**What's NOT on screen:**
- ~~Greeting~~ (waste)
- ~~Date~~ (they know the date)
- ~~Stat cards~~ (compressed into header row)
- ~~Notifications panel~~ (bell icon in app header)
- ~~Recent Activity~~ (noise)
- ~~Quick Actions~~ (sidebar handles navigation)

> [!IMPORTANT]
> The Employee dashboard has **zero scrollable content**. If an employee needs to scroll to see their tasks, the dashboard has failed. The entire view is a single 360px viewport.

---

### 2.2 MANAGER Dashboard

**Decision the manager makes:** "Is my team available? What's stuck? What needs my approval?"
**Time budget:** 5 seconds to scan attendance, 15 seconds to check pending items, 10 seconds to act.
**Screen budget:** 900px viewport. Slight scroll acceptable for Action Center overflow.

```
╔═══════════════════════════════════════════════════════════════════╗  
║ 🔴 1 overdue task · 1 emergency leave pending                    ║ 32px ALERT (conditional)
╠═══════════════════════════════════════════════════════════════════╣
║ Team: 8/10 present  ▓▓▓▓▓▓▓▓░░  1 late · 1 leave · 0 WFH       ║ 36px PULSE
╠═══════════════════════════════════════════════════════════════════╣
║ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ║
║ │ Pending          │ │ Overdue         │ │ Tickets         │     ║ 88px STATS (3 cards)
║ │ Approvals   ⚡ 4 │ │ Tasks      🔴 1 │ │ Open       🟡 3 │     ║
║ │ +1 today         │ │ +0 today        │ │ -1 today        │     ║
║ └─────────────────┘ └─────────────────┘ └─────────────────┘     ║
╠════════════════════════════════════╦══════════════════════════════╣
║ ⚡ ACTION CENTER              4   ║ 👥 TEAM TODAY                ║
║ ┌────────────────────────────────┐║ ┌────────────────────────────┐║
║ │🔴 Emergency Leave             │║ │ ✅ Sneha M.      9:15 AM  │║
║ │   Priya S. · Today            │║ │ ✅ Rahul K.      9:22 AM  │║
║ │              [Approve] [Deny] │║ │ ⚠️ Dev P.        10:41 AM │║
║ ├────────────────────────────────┤║ │ 🏖️ Priya S.      Leave    │║
║ │🟠 Overdue: API Integration    │║ │ ❓ Amit G.       —        │║
║ │   Arun B. · 1 day late        │║ │ ✅ Neha R.       9:05 AM  │║
║ │              [View] [Reassign]│║ │ ✅ Jay P.        8:58 AM  │║
║ ├────────────────────────────────┤║ │ ✅ Ravi K.       9:10 AM  │║
║ │🟡 Leave: Rahul K.             │║ │ ✅ Meera S.      9:30 AM  │║
║ │   Jun 25-27 · Casual          │║ │ ✅ Sita D.       9:12 AM  │║
║ │              [Approve] [Deny] │║ └────────────────────────────┘║
║ ├────────────────────────────────┤║                              ║
║ │🟡 Regularization: Dev P.      │║                              ║
║ │   Jun 20 · Check-in missed    │║                              ║
║ │              [Approve] [Deny] │║                              ║
║ └────────────────────────────────┘║                              ║
║              MAIN (60%)          ║         SIDE (40%)            ║
╚════════════════════════════════════╩══════════════════════════════╝
```

**Total height:** ~520px. Fits above fold on 900px viewport.

**What's on screen:**
1. **Alert Banner (32px, conditional):** Only appears when critical items exist. Collapses to 0px when clean.
2. **Workforce Pulse (36px):** **Team-scoped.** Shows "8/10 present" with a segmented bar. Not org-level — only direct reports. Single line. No card border.
3. **Stat Row (88px, 3 cards):** Pending Approvals | Overdue Tasks | Open Tickets. Each card is 88px tall. Value + trend text only. Clickable to module.
4. **Action Center (left, 60%):** Urgency-ranked. Max 5 items visible. Inline approve/deny/view buttons. Items sourced from `leaves`, `regularizations`, `wfhrequests`, `compoffrequests`, `tasks` (overdue, team), `Ticket` (critical, team).
5. **Team Today (right, 40%):** Compact list of direct reports with status icon + check-in time. Sorted: unchecked first → late → leave → present. Max 10 visible.

**What's killed for Manager:**
- ~~Hero greeting~~ → replaced by Pulse row
- ~~Quick Actions~~ → sidebar + Action Center
- ~~Task Status Distribution chart~~ → overdue count in stat card is sufficient
- ~~Active Time Trackers~~ → micromanagement
- ~~Upcoming Events~~ → calendar concern, not dashboard

---

### 2.3 ADMIN / HR MANAGER Dashboard

**Decision the admin makes:** "Is the org running? Are approvals stuck? Is payroll ready?"
**Time budget:** 5 seconds for anomalies, 10 seconds for approval volume, 15 seconds to act.
**Screen budget:** 900px. Action Center dominates because HR processes volume.

```
╔═══════════════════════════════════════════════════════════════════╗
║ 🔴 3 unchecked employees · Payroll closes in 5 days              ║ 32px ALERT
╠═══════════════════════════════════════════════════════════════════╣
║ Org: 34/47 present  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  5 leave · 3 WFH · 5?║ 36px PULSE
╠═══════════════════════════════════════════════════════════════════╣
║ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ║
║ │ ALL Pending      │ │ Attendance      │ │ Payroll         │     ║ 88px STATS
║ │ Approvals  ⚡ 12 │ │ Issues    🟠 8  │ │ Status   🟢 OK │     ║
║ │ +3 today         │ │ Late:3 LOP:2    │ │ June: Processed │     ║
║ └─────────────────┘ └─────────────────┘ └─────────────────┘     ║
╠═══════════════════════════════════════════════════════════════════╣
║ ⚡ ACTION CENTER (All Departments)                          12   ║
║ ┌───────────────────────────────────────────────────────────────┐║
║ │🔴 Emergency Leave — Priya S. (Engineering)     [Approve][Dn]│║
║ │🔴 Payroll: 47 slips pending approval           [Review]     │║
║ │🟠 5 unchecked employees (Engineering: 3, Sales: 2)   [View] │║
║ │🟡 Leave — Rahul K. (Engineering) Jun 25-27     [Approve][Dn]│║
║ │🟡 Leave — Meera S. (Design) Jun 26             [Approve][Dn]│║
║ │🟡 Regularization — Sneha M. (QA) Jun 20        [Approve][Dn]│║
║ │🟡 Regularization — Dev P. (Engineering) Jun 19 [Approve][Dn]│║
║ │🔵 WFH — Amit G. (Support) Jun 25              [Approve][Dn]│║
║ │🔵 Comp-Off — Jay P. (Engineering) Jun 15       [Approve][Dn]│║
║ │                                          View All (12) →     │║
║ └───────────────────────────────────────────────────────────────┘║
╚═══════════════════════════════════════════════════════════════════╝
```

**Total height:** ~480px.

**Key difference from Manager:** Action Center is **full-width** (no team grid sidebar — HR sees ALL departments) and shows department names on each item. The "Attendance Issues" stat card replaces "Open Tickets" because HR doesn't manage tickets.

**Stat card #3 — Payroll Status:**
- "June: Draft" → 🟡 yellow (not started)
- "June: Processing" → 🟠 orange (in progress)
- "June: Processed" → 🟢 green (ready for approval)
- "June: Approved" → ✅ complete
- Shows "closes in X days" as subtitle when within 10 days of month-end.

---

### 2.4 EXECUTIVE Dashboard

**Decision the executive makes:** "Is the business healthy? Are there risks?"
**Time budget:** 5 seconds for red flags, 10 seconds for exposure, 15 seconds to delegate.
**Screen budget:** 700px. Executives scan faster and delegate — they don't process queues.

```
╔═══════════════════════════════════════════════════════════════════╗
║ 🔴 2 critical tickets unassigned · 3 tasks overdue               ║ 32px ALERT
╠═══════════════════════════════════════════════════════════════════╣
║ Org: 34/47 present  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  Att: 87% (↓3%)      ║ 36px PULSE
╠═══════════════════════════════════════════════════════════════════╣
║ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ║
║ │ Overdue         │ │ Critical        │ │ Payroll         │     ║ 88px STATS
║ │ Tasks      🔴 3 │ │ Tickets    🔴 2 │ │ Cost   ₹18.4L  │     ║
║ │ Eng:2 QA:1      │ │ Unassigned: 2   │ │ June · Approved │     ║
║ └─────────────────┘ └─────────────────┘ └─────────────────┘     ║
╠═══════════════════════════════════════════════════════════════════╣
║ ⚡ ESCALATIONS & RISKS                                      5   ║
║ ┌───────────────────────────────────────────────────────────────┐║
║ │🔴 TKT000045 — Payment gateway down (Critical, unassigned)   │║
║ │   Client: Acme Corp · 4 hours old               [Assign]    │║
║ │🔴 TKT000048 — Data export failing (Critical, unassigned)    │║
║ │   Client: TechFlow · 2 hours old                [Assign]    │║
║ │🟠 API Integration task — 2 days overdue                      │║
║ │   Assigned: Arun B. (Engineering)         [View] [Escalate] │║
║ │🟠 Attendance rate below 80% in Sales dept (6/10 present)    │║
║ │   3 unchecked · 1 LOP                           [View]      │║
║ │🟡 Payroll: 3 employees with LOP deductions this month       │║
║ │   Engineering: 2, Sales: 1                      [Review]    │║
║ └───────────────────────────────────────────────────────────────┘║
╚═══════════════════════════════════════════════════════════════════╝
```

**Total height:** ~400px.

**Key differences from Admin:**
1. **No approval queue.** Executives don't approve leaves. They see only escalations and risks.
2. **Action Center renamed to "Escalations & Risks"** — because an executive's action is to DELEGATE, not to approve.
3. **Stat cards show IMPACT, not volume:** "Cost ₹18.4L" instead of "Pending Approvals: 12." Executives think in money and risk.
4. **Department breakdown on escalations:** "Eng:2 QA:1" tells the executive WHO to call.
5. **Inline actions are "Assign" and "Escalate"** — not "Approve/Deny." Executives delegate.

---

### 2.5 MD (Managing Director) Dashboard

**Decision the MD makes:** "Should I worry about anything?"
**Time budget:** 5 seconds. That's it. If the MD needs more than 5 seconds, the dashboard has failed.
**Screen budget:** 400px. The MD gets the most compressed view.

```
╔═══════════════════════════════════════════════════════════════════╗
║ 🔴 2 critical client tickets · Attendance at 72% (below target)  ║ 32px ALERT
╠═══════════════════════════════════════════════════════════════════╣
║ ┌───────────────┐ ┌───────────────┐                              ║
║ │ Workforce     │ │ Financial     │                              ║ 100px STATS
║ │ Health   🟡   │ │ Exposure      │                              ║
║ │ 34/47 (72%)   │ │ ₹18.4L June  │                              ║
║ │ 5 late, 3 LOP │ │ 3 LOP impact │                              ║
║ └───────────────┘ └───────────────┘                              ║
╠═══════════════════════════════════════════════════════════════════╣
║ 🚨 REQUIRES YOUR ATTENTION                                  2   ║
║ ┌───────────────────────────────────────────────────────────────┐║
║ │🔴 2 critical tickets unassigned — Acme Corp, TechFlow        │║
║ │   Aged: 4h, 2h · No owner assigned        [Delegate to CTO] │║
║ │🟠 Attendance dropped 15% vs last Monday — Sales dept         │║
║ │   Possible cause: 2 LOP, 1 unexcused      [Delegate to HR]  │║
║ └───────────────────────────────────────────────────────────────┘║
╚═══════════════════════════════════════════════════════════════════╝
```

**Total height:** ~280px.

**Key differences from Executive:**
1. **Only 2 stat cards.** Workforce Health (single gauge) and Financial Exposure (payroll cost + LOP impact). That's all an MD needs.
2. **Action Center renamed to "Requires Your Attention"** and limited to **MAX 3 items.** If there are more, they're below the MD's delegation threshold — the Executive/Admin should handle them.
3. **Actions are "Delegate to [role]"** — not "Assign" or "Approve." The MD doesn't operate; they direct.
4. **Items are AGGREGATED.** Not "TKT000045" and "TKT000048" separately, but "2 critical tickets unassigned" with client names. The MD doesn't need ticket IDs.
5. **Comparative analytics in alerts:** "Attendance dropped 15% vs last Monday" — this is the ONLY place trend analysis belongs. The MD needs to know if things are WORSE, not what they ARE.

---

## 3. Unified Widget Registry — Survival Table

Every widget from V1 is judged below. Each gets a binary verdict per designation.

| Widget | Employee | Manager | Admin/HR | Executive | MD | Verdict |
|--------|----------|---------|----------|-----------|-----|---------|
| Alert Banner | ❌ | ✅ | ✅ | ✅ | ✅ | **KEEP** — conditional, 0px when empty |
| Hero Greeting | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — replaced by inline header/pulse |
| Workforce Pulse | ❌ | ✅ team | ✅ org | ✅ org | ✅ org | **KEEP** — compressed to 36px row |
| Clock In/Out | ✅ header | ❌ | ❌ | ❌ | ❌ | **KEEP** — Employee only, in header row |
| Stat: Total Employees | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — vanity |
| Stat: Present Today | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — merged into Pulse Bar |
| Stat: On Leave | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — merged into Pulse Bar |
| Stat: Pending Approvals | ❌ | ✅ | ✅ | ❌ | ❌ | **KEEP** — actionable count |
| Stat: Overdue Tasks | ❌ | ✅ | ❌ | ✅ | ❌ | **KEEP** — risk indicator |
| Stat: Open Tickets | ❌ | ✅ | ❌ | ✅ | ❌ | **KEEP** — service load |
| Stat: Attendance Rate | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — merged into Pulse Bar |
| Stat: Attendance Issues | ❌ | ❌ | ✅ | ❌ | ❌ | **KEEP** — HR compliance |
| Stat: Payroll Status | ❌ | ❌ | ✅ | ✅ | ✅ | **KEEP** — financial |
| Stat: Workforce Health | ❌ | ❌ | ❌ | ❌ | ✅ | **KEEP** — MD summary |
| Stat: Financial Exposure | ❌ | ❌ | ❌ | ❌ | ✅ | **KEEP** — MD summary |
| Stat: My Attendance | ✅ header | ❌ | ❌ | ❌ | ❌ | **KEEP** — Employee, compressed to header |
| Action Center | ❌ | ✅ | ✅ | ✅ (as Escalations) | ✅ (as Attention, max 3) | **KEEP** — core |
| My Tasks List | ✅ | ❌ | ❌ | ❌ | ❌ | **KEEP** — Employee only |
| Leave Balance | ✅ | ❌ | ❌ | ❌ | ❌ | **KEEP** — Employee only |
| Team Attendance Grid | ❌ | ✅ | ❌ | ❌ | ❌ | **KEEP** — Manager only |
| Quick Actions | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — redundant |
| Recent Tasks Table | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — module concern |
| Recent Activity Feed | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — noise |
| Pending Leaves List | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — merged into Action Center |
| Task Status Distribution | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — module concern |
| Leave Calendar Heatmap | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — module concern |
| Upcoming Events | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — calendar concern |
| Notification Feed Panel | ❌ | ❌ | ❌ | ❌ | ❌ | **KILL** — bell icon sufficient |

### Widget Count Summary

| Designation | Widgets on Screen | V1 Count | Reduction |
|-------------|-------------------|----------|-----------|
| Employee | 3 (header, tasks, balance) | 7+ | **-57%** |
| Manager | 5 (alert, pulse, 3 stats, action center, team grid) | 8+ | **-37%** |
| Admin/HR | 4 (alert, pulse, 3 stats, action center) | 8+ | **-50%** |
| Executive | 4 (alert, pulse, 3 stats, escalations) | 7+ | **-43%** |
| MD | 3 (alert, 2 stats, attention) | 7+ | **-57%** |

---

## 4. Stat Card Allocation — Per Designation

Each designation gets **exactly** the stat cards that drive their decisions. No more.

### Employee: 0 stat cards
Attendance status is inline in the header row. Leave balance is a sidebar panel. No stat cards needed. Stat cards are for managers who monitor aggregates.

### Manager: 3 stat cards

| Card | Value | Trend | Click Target | Why THIS card |
|------|-------|-------|-------------|---------------|
| Pending Approvals | `COUNT(leaves + regularizations + WFH + comp-off WHERE managerId=self AND status=Pending)` | "+N today" | Action Center | **Approvals block employees. Speed matters.** |
| Overdue Tasks | `COUNT(tasks WHERE assignedTo IN team AND endDate < today AND status ≠ Completed)` | "+N today" | Tasks module filtered | **Delivery risk. Any number > 0 = investigate.** |
| Open Tickets | `COUNT(Ticket WHERE assignedTo IN team AND status NOT IN [Resolved, Closed])` | "±N today" | Tickets module filtered | **Client commitments at risk.** |

### Admin/HR: 3 stat cards

| Card | Value | Trend | Click Target | Why THIS card |
|------|-------|-------|-------------|---------------|
| ALL Pending Approvals | `COUNT(all pending across org)` | "+N today" | Action Center | **HR sees ALL departments' queues.** |
| Attendance Issues | `COUNT(Late Entry) + COUNT(LOP) + COUNT(Unchecked)` with breakdown "Late:3 LOP:2" | vs yesterday | Attendance module | **Compliance flag. LOP affects payroll.** |
| Payroll Status | Current month `payrollruns.status` | "closes in X days" | Payroll module | **Monthly critical path. Missed payroll = crisis.** |

### Executive: 3 stat cards

| Card | Value | Trend | Click Target | Why THIS card |
|------|-------|-------|-------------|---------------|
| Overdue Tasks | `COUNT(all overdue)` with dept breakdown | "+N today" | Tasks module | **Delivery health across org.** |
| Critical Tickets | `COUNT(Ticket WHERE priority=Critical AND status ≠ Closed)` + unassigned count | "N unassigned" | Tickets module | **Client escalation risk.** |
| Payroll Cost | `SUM(payrolls.netSalary WHERE month=current)` formatted as ₹ lakhs | vs last month | Payroll module | **Financial exposure. Executive thinks in money.** |

### MD: 2 stat cards

| Card | Value | Trend | Click Target | Why THIS card |
|------|-------|-------|-------------|---------------|
| Workforce Health | `(Present + WFH) / Active × 100` with "N late, N LOP" | vs same day last week | — | **Single number: is the org running?** Red < 70%, Yellow < 85%, Green ≥ 85%. |
| Financial Exposure | `SUM(payrolls.netSalary)` + "N LOP impact" | vs last month | — | **Single number: what's the cost?** |

---

## 5. Action Center — Designation-Specific Variants

The Action Center is NOT one-size-fits-all. Each designation sees different content with different inline actions.

### Manager Action Center

| Source | Filter | Inline Actions | Max Items |
|--------|--------|---------------|-----------|
| Leaves (Pending) | `managerId = self` | Approve · Deny | ∞ |
| Regularizations (Pending) | `managerId = self` | Approve · Deny | ∞ |
| WFH Requests (Pending) | `managerId = self` | Approve · Deny | ∞ |
| Comp-Off Requests (Pending) | `managerId = self` | Approve · Deny | ∞ |
| Tasks (Overdue) | `assignedTo IN team` | View · Reassign | 5 |
| Tickets (Critical) | `assignedTo IN team` | View | 3 |

### Admin/HR Action Center

| Source | Filter | Inline Actions | Max Items |
|--------|--------|---------------|-----------|
| Leaves (Pending) | ALL departments | Approve · Deny | ∞ |
| Regularizations (Pending) | ALL departments | Approve · Deny | ∞ |
| WFH Requests (Pending) | ALL departments | Approve · Deny | ∞ |
| Comp-Off Requests (Pending) | ALL departments | Approve · Deny | ∞ |
| Unchecked Employees | ALL, grouped by dept | View | 5 |
| Payroll (Pending Approval) | ALL | Review · Approve | 1 |

### Executive Action Center (renamed: "Escalations & Risks")

| Source | Filter | Inline Actions | Max Items |
|--------|--------|---------------|-----------|
| Tickets (Critical, unassigned) | ALL | Assign | 5 |
| Tasks (Overdue > 2 days) | ALL, grouped by dept | View · Escalate | 5 |
| Attendance anomalies | Depts below 70% | View | 3 |
| Payroll (LOP impact) | Employees with LOP | Review | 3 |

### MD Action Center (renamed: "Requires Your Attention")

| Source | Filter | Inline Actions | Max Items |
|--------|--------|---------------|-----------|
| Critical tickets (aggregated) | ALL, grouped by client | Delegate to CTO | 1 row |
| Attendance drops | Only if > 10% below same weekday last week | Delegate to HR | 1 row |
| Payroll anomalies | Only if > 5 employees with LOP | Delegate to HR | 1 row |

**MAX 3 items for MD.** Anything beyond 3 is operational noise that should be handled by Admin or Executive.

---

## 6. Layout Specs — Minimal Space Budget

### Vertical Space Budget (Desktop, 1280px+)

| Designation | Alert | Pulse | Stats | Action Center | Side Panel | **TOTAL** |
|-------------|-------|-------|-------|--------------|------------|-----------|
| Employee | — | — | — (in header 40px) | — | Tasks 200px + Balance 140px | **380px** |
| Manager | 32px | 36px | 88px | 280px | Team Grid 280px | **516px** |
| Admin/HR | 32px | 36px | 88px | 340px (full width) | — | **496px** |
| Executive | 32px | 36px | 88px | 300px (full width) | — | **456px** |
| MD | 32px | — | 100px | 180px (full width) | — | **312px** |

> [!TIP]
> **Every designation fits above the fold on a 900px viewport.** The MD fits in 312px — visible on a smartwatch if needed.

### Horizontal Space Budget (Desktop)

| Designation | Layout | Rationale |
|-------------|--------|-----------|
| Employee | 60/40 split (tasks / balance) | Two equal-importance panels |
| Manager | 60/40 split (action center / team grid) | Action center is primary, team grid is reference |
| Admin/HR | 100% single column | HR processes volume — full width for the Action Center maximizes scan speed |
| Executive | 100% single column | Same as Admin — escalation list needs width for department labels |
| MD | 100% single column | Minimal content, maximum clarity |

---

## 7. The 30-Second Audit — Per Designation

### Employee (Target: 10 seconds)

| Second | What they see | Decision made |
|--------|--------------|---------------|
| 0-3 | Header: "✅ Checked In 9:02 AM (4h 23m)" | "I'm tracked. Good." |
| 3-7 | Tasks: 🔴 API Integration — Due Today, High | "That's my focus today." |
| 7-10 | Leave Balance: Casual 4/6 | "I can plan leave next week." |

**Result: 3 decisions in 10 seconds.** Dashboard's job is done.

### Manager (Target: 20 seconds)

| Second | What they see | Decision made |
|--------|--------------|---------------|
| 0-3 | Alert: "1 emergency leave pending" | "Something urgent." |
| 3-6 | Pulse: "8/10 present, 1 late" | "Team mostly covered. Who's late?" → Glance at Team Grid: Dev P. |
| 6-10 | Stats: Pending Approvals ⚡4 | "I have a queue to clear." |
| 10-15 | Action Center: 🔴 Emergency Leave — Priya S. | Decision: Approve/Deny |
| 15-20 | Action Center: 🟡 Leave — Rahul K. Jun 25-27 | Decision: Approve/Deny |

**Result: 2 approvals processed + team status confirmed in 20 seconds.**

### Admin/HR (Target: 25 seconds)

| Second | What they see | Decision made |
|--------|--------------|---------------|
| 0-3 | Alert: "3 unchecked employees · Payroll closes in 5 days" | "Need to chase attendance before payroll." |
| 3-6 | Pulse: "34/47 present" | "5 unknown — need follow-up." |
| 6-10 | Stats: Pending 12 · Issues 8 · Payroll Processed | "Volume is high today. Payroll is on track." |
| 10-20 | Action Center: Process top 5 approvals (approve/deny) | 5 approvals cleared |
| 20-25 | Action Center: View unchecked employees | "Will send reminder to Engineering." |

**Result: 5 approvals + 1 follow-up action in 25 seconds.**

### Executive (Target: 15 seconds)

| Second | What they see | Decision made |
|--------|--------------|---------------|
| 0-3 | Alert: "2 critical tickets unassigned" | "Client risk." |
| 3-6 | Stats: Critical Tickets 🔴2, unassigned | "Who should I assign these to?" |
| 6-10 | Escalations: TKT000045 — Acme Corp, 4h old | Decision: Click [Assign] → pick team lead |
| 10-15 | Escalations: API Integration 2 days overdue, Eng | "Will message Arun's manager." |

**Result: 1 ticket assigned + 1 escalation identified in 15 seconds.**

### MD (Target: 5 seconds)

| Second | What they see | Decision made |
|--------|--------------|---------------|
| 0-2 | Alert banner exists → RED | "Something needs attention." |
| 2-5 | "Requires Attention": 2 critical tickets, Acme Corp + TechFlow | Decision: "CTO handles this." → Click [Delegate to CTO] |

**Result: 1 delegation in 5 seconds.** If no alert banner → dashboard is green → MD moves on. Done.

---

## 8. Visual Design — Compressed Specs

### Spacing (Reduced from V1)

| Token | V1 Value | **V2 Value** | Rationale |
|-------|----------|-------------|-----------|
| Card padding | 20-24px | **16px** | Tighter cards = more data per screen |
| Gap between cards | 20-24px | **12px** | Less whitespace = more density |
| Section gap | 32px | **16px** | Sections are already visually separated by content type |
| Hero padding | 40-64px | **0px** | Hero eliminated |
| Stat card height | 120px | **88px** | Value + label + trend. No icon tile (icon is redundant when the label says "Overdue Tasks") |
| Action Center item height | 80px | **56-64px** | Tighter rows = more items visible |

### Typography (Compressed)

| Element | V1 | **V2** |
|---------|-----|-------|
| Hero greeting | 40px display | **KILLED** |
| Section title | 18px heading | **14px semibold** — saves 8px height per section |
| Stat value | 28px | **24px** — still dominant but 4px tighter |
| Stat label | 13px | **12px** — minimal, above the value |
| Action Center item title | 14px | **13px semibold** — density |
| Action Center item subtitle | 13px | **12px** — minimal |
| Trend text | 12px | **11px** — micro text, just "+2 today" |

### What's Removed from Card Design

| Element | Status | Why |
|---------|--------|-----|
| Icon tiles on stat cards | **KILLED** | The label "Overdue Tasks" doesn't need a ✅ icon to be understood. Icons add 36px width and 36px height per card for zero information gain. |
| Card shadows | **KILLED** | Use borders only. Shadows add visual weight without information. 1px `var(--hairline)` border is sufficient. |
| Hover glow effects | **KILLED** | Decorative. The card is clickable because it has a pointer cursor and the value changes color on hover. No glow needed. |
| Animated counter on load | **KEPT** | Existing `useAnimatedCounter` in [StatCard.jsx](file:///e:/Loigmax/Tracker/frontend/src/components/Common/StatCard.jsx#L37-L75) — this draws attention to the number. Keep but reduce duration from 800ms to 400ms. |
| Card border-left accent color | **KILLED** | Used to differentiate card types. Unnecessary when each card has a clear label. Saves 4px horizontal space. |

---

## 9. Color System — Simplified

V1 had 6 semantic colors + 4 urgency colors + 9 attendance status colors = **19 colors**.

**V2 reduces to 10:**

| Color | Hex (Light) | Hex (Dark) | Usage |
|-------|------------|-----------|-------|
| **Red** | `#DC2626` | `#F87171` | Critical items, overdue, LOP, denied |
| **Orange** | `#D97706` | `#FBBF24` | Urgent items, late entry, warning |
| **Yellow** | `#CA8A04` | `#FACC15` | Normal pending items, caution |
| **Green** | `#059669` | `#34D399` | Present, approved, healthy, complete |
| **Blue** | `#2563EB` | `#60A5FA` | Info, links, WFH, new items |
| **Purple** | `#7C3AED` | `#A78BFA` | On leave (planned absence) |
| **Gray** | `#6B7280` | `#9CA3AF` | Unchecked, disabled, secondary text |
| **Ink** | `#111827` | `#F3F4F6` | Primary text |
| **Surface** | `#FFFFFF` | `#1A1A1D` | Card backgrounds |
| **Canvas** | `#F9FAFB` | `#111113` | Page background |

**Attendance status mapping (7 colors, not 9):**

| Status | Color | Rationale |
|--------|-------|-----------|
| Present | Green | Working ✅ |
| Late Entry | Orange | Caution ⚠️ |
| Leave | Purple | Planned absence 🏖️ |
| WFH | Blue | Remote working 💻 |
| Absent / LOP | Red | Unexcused ❌ |
| Unchecked | Gray | Unknown ❓ |
| Holiday / Week Off | — (not shown on dashboard) | Non-working day — irrelevant to daily attendance pulse |

---

## 10. Dark Mode — Minimal Rules

Only 5 rules. V1 had 8. Fewer rules = more consistent implementation.

1. **Swap `--ink` and `--canvas`.** Text goes light, backgrounds go dark. Everything else follows.
2. **Cards use `#1A1A1D`.** One shade lighter than canvas `#111113`. No shadows in dark mode.
3. **Semantic colors shift to 400-weight.** Red 600 → Red 400. Green 600 → Green 400. Same hue, lighter tone.
4. **Borders shift to `#2D2D30`.** Subtle separation without glowing edges.
5. **Urgency backgrounds use 10% opacity of the semantic color.** `rgba(220,38,38,0.10)` for red bg.

---

## 11. Action Center — Urgency Algorithm (Unchanged from V1)

The ranking algorithm remains valid. Reproduced for completeness:

```
URGENCY_SCORE = BASE_SCORE + TIME_MODIFIER + IMPACT_MODIFIER

BASE_SCORE:
  Emergency Leave Request     = 90
  Critical Ticket (unassigned)= 85
  Critical Ticket (assigned)  = 80
  Overdue Task (> 2 days)     = 75
  Overdue Task (1 day)        = 65
  Payroll Pending Approval    = 70
  Leave Request               = 50
  Regularization Request      = 45
  WFH Request                 = 40
  Comp-Off Request            = 35

TIME_MODIFIER (how long it's been waiting):
  > 48 hours                  = +15
  > 24 hours                  = +10
  > 8 hours                   = +5
  < 1 hour                    = +0

IMPACT_MODIFIER:
  Affects > 5 people          = +10
  Affects payroll/compliance  = +8
  Affects client (ticket)     = +5
  Affects single employee     = +0
```

---

## 12. Implementation Roadmap — Compressed

### V1: Core Rewrite (10 dev days)

| Task | Days | Impact |
|------|------|--------|
| Kill hero, kill quick actions, kill recent tasks table, kill recent activity | 0.5 | Remove noise |
| Build Employee header row (name + attendance + clock button) | 1 | Employee dashboard |
| Build Employee tasks panel + leave balance panel | 2 | Employee dashboard complete |
| Build Workforce Pulse Bar component (team + org variants) | 1.5 | Manager/Admin/Exec |
| Build Alert Banner (conditional, collapsible) | 1 | All Manager+ roles |
| Build Action Center with urgency scoring | 3 | Core value |
| Build compressed stat cards (no icons, 88px height) | 1 | All Manager+ roles |
| Fix `leaveBalance: 2` hardcode → real query | 0.5 | Bug fix |
| Wire designation-based layout selector | 0.5 | Route to correct layout |

### V2: Team + Payroll Integration (8 dev days)

| Task | Days | Impact |
|------|------|--------|
| Build Team Attendance Grid (Manager sidebar) | 2 | Manager context |
| Build Payroll Status stat card | 1 | Admin/Exec |
| Build dedicated `/api/dashboard` aggregation endpoint | 3 | Performance: 1 API call vs 6 |
| MD dashboard variant (aggregated items, delegate actions) | 2 | MD experience |

### V3: Polish (5 dev days)

| Task | Days | Impact |
|------|------|--------|
| Inline approve/deny API integration (no page navigation) | 2 | Speed |
| WebSocket real-time updates for Action Center | 2 | Live data |
| Mobile responsive layout (Employee + Manager) | 1 | Mobile access |

**Total: 23 dev days** (reduced from 67 in V1 roadmap — because we killed 14 widgets).

---

## 13. What Was Cut — And Why You Shouldn't Miss It

| Cut Item | "But what about..." | Answer |
|----------|---------------------|--------|
| Hero greeting | "It's welcoming!" | Warmth doesn't process approvals. The employee already knows they're logged in. |
| Quick Actions | "It helps navigate!" | The sidebar is navigation. The Action Center is contextual navigation. Quick Actions is a third navigation system. Pick two. |
| Task Status Distribution chart | "Managers need to see the pipeline!" | They do. In the Tasks module. A donut chart on the dashboard doesn't help them decide what to do RIGHT NOW. The stat card "Overdue: 3" does. |
| Sparkline trends | "Trends show patterns!" | "+2 today" achieves the same thing in 11px of text instead of a 40px chart. At dashboard scan speed (5 seconds), the user reads text faster than they interpret a micro-chart. |
| Leave Calendar Heatmap | "Helps plan coverage!" | Coverage planning is a weekly activity done in the Leave module. The dashboard is for RIGHT NOW. |
| Upcoming Events | "People need reminders!" | Calendar notifications handle reminders. The dashboard shows what's broken, not what's scheduled. |
| Total Employees stat | "Executives need headcount!" | Headcount changes monthly. It belongs on the HR homepage, not on a real-time dashboard. |
| Notification feed panel | "People miss updates!" | The notification bell icon in the global header handles this. A separate panel on the dashboard duplicates the bell. |

---

## 14. Final Density Comparison

### Before (Current Dashboard)

```
Hero greeting          80px   ← WASTED
                       24px gap
Stat cards (4)        120px   ← 2 vanity metrics
                       24px gap
Quick Actions          100px  ← REDUNDANT
Recent Tasks Table     320px  ← WRONG COMPONENT
Pending Leaves         200px  ← NO ACTIONS
Recent Activity        200px  ← NOISE
─────────────────────────────
TOTAL                1068px   ← requires scrolling
ACTIONABLE PIXELS     ~200px  (Pending Leaves only — no inline actions)
DECISION DENSITY      18.7%
```

### After (Optimized — Manager View)

```
Alert Banner           32px   ← CONDITIONAL (0px when clean)
Workforce Pulse        36px   ← DENSE INFORMATION
Stat Cards (3)         88px   ← ALL ACTIONABLE
Action Center         280px   ← INLINE DECISIONS
Team Grid (sidebar)   280px   ← REFERENCE DATA
─────────────────────────────
TOTAL                 516px   ← NO SCROLL on 900px viewport
ACTIONABLE PIXELS     ~400px  (Action Center + Stats)
DECISION DENSITY      77.5%
```

> [!IMPORTANT]
> **Decision density improved from 18.7% to 77.5%.** That means 77.5% of visible pixels contribute to a decision. The remaining 22.5% is structural (borders, spacing, labels).
>
> **Vertical space reduced by 51.7%.** From 1068px to 516px. Everything is above the fold.

---

## 15. Designation → Role Mapping

The system currently maps roles via [dashboardConfig.js ROLE_CONFIG](file:///e:/Loigmax/Tracker/frontend/src/pages/Dashboard/config/dashboardConfig.js#L18-L71) using 4 role names: `superadmin`, `admin`, `manager`, `employee`.

The optimized architecture needs 5 layout variants. Mapping:

| Dashboard Variant | System Role | Role Level | Designations (Examples) |
|-------------------|-------------|------------|------------------------|
| **Employee** | `employee` | 1-3 | Developer, Designer, QA, Support Agent |
| **Manager** | `manager` | 4-6 | Team Lead, Project Manager, Department Head |
| **Admin/HR** | `admin` | 7-8 | HR Manager, HR Admin, Admin |
| **Executive** | `superadmin` (level ≤ 9) | 9 | CTO, VP Engineering, VP Operations |
| **MD** | `superadmin` (level 10) | 10 | Managing Director, CEO, Founder |

> [!IMPORTANT]
> The Executive vs MD distinction is determined by `roles.level`. Level 10 = MD layout (maximum compression, delegation-only actions). Level 9 = Executive layout (escalation + financial visibility). This requires checking `role.level` in `getRoleConfig()` to split the `superadmin` role into two layout variants.
