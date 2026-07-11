# Attendance Module Brain

## Overview
This module contains 7 models, 3 services, and 9 frontend files.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Attendance | Attendance.js | 46 | status | Refs: employees, leavetypes |
| DailyActivity | DailyActivity.js | 26 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by StatusConfig. Refs: clients, projecttypes, employees, tasktypes |
| Leave | Leave.js | 33 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by StatusConfig. Refs: employees, departments, leavetypes |
| LeavePolicy | LeavePolicy.js | ~25 | `status`, `effectiveFrom`, `effectiveTo`, `version` | Refs: leavetypes, roles, departments, designations |
| LeaveTypes | LeaveTypes.js | 23 | — | |
| Regularization | Regularization.js | 46 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by StatusConfig. Refs: employees, departments, attendances |
| Shift | Shift.js | 43 | — | Refs: Employee, Shift |

> **Dynamic status (as of 2026-06-10)**: Leave, Regularization, DailyActivity — all had hardcoded `enum: ['Pending','Approved','Rejected']` removed. Status values now come from `statusconfigs` collection. `metaStatus` (default: `'active'`) added for record lifecycle tracking.

## Backend Services (Business Logic Hooks)
| Service File | Lines | Exported Functions | Notes |
|---|---|---|---|
| attendances.js | 141 | — | |
| leaves.js | 221 | `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate` | Handles request validation and balance adjustments |
| regularizations.js | 141 | — | |
| leavepolicy.js | ~180 | `beforeUpdate`, `afterUpdate` | Immutability checks + balance propagation to employees |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| [id].jsx | POST | /populate/read/dailyactivities/${id} | dailyactivities |
| add-daily-activity.jsx | POST | /populate/create/dailyactivities | dailyactivities |
| index.jsx | POST | /populate/read/dailyactivities | dailyactivities |
| index.jsx | GET | /populate/read/attendances?filter=${encodeURIComponent(filter)} | attendances?filter=${encodeURIComponent(filter)} |
| index.jsx | POST | /populate/create/attendances | attendances |
| index.jsx | PUT | /populate/update/attendances/${todayRec._id} | attendances |
| leave-regularization.jsx | POST | /populate/read/employees/${user.id} | employees |
| leave-regularization.jsx | POST | /populate/read/attendances | attendances |
| leave-regularization.jsx | POST | /populate/read/employees/${user.id} | employees |
| leave-regularization.jsx | POST | /populate/create/leaves | leaves |
| leave-regularization.jsx | POST | /populate/create/regularizations | regularizations |
| model.jsx | GET | /populate/read/leaves/${id} | leaves |
| pending-approvals.jsx | GET | /populate/read/leaves | leaves |
| pending-approvals.jsx | GET | /populate/read/regularizations | regularizations |
