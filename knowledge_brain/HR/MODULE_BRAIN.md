# HR Module Brain

## Overview
This module contains 5 models, 3 services, and 0 frontend files.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Agent | Agent.js | 40 | — | Refs: clients, departments |
| Department | Department.js | 26 | — | Refs: leavepolicies |
| Designation | Designation.js | 20 | — | |
| Employee | Employee.js | 93 | status (enum: Active/Inactive/Terminated) | Refs: designations, departments, roles, employees, leavetypes. Note: Employee.status is NOT dynamic — intentionally kept as fixed enum. |
| HRPolicy | HRPolicy.js | 57 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by StatusConfig (`modelName: 'hrpolicies'`). Refs: Employee, Department. |
| Role | Role.js | 34 | — | |

> **Dynamic status (as of 2026-06-10)**: HRPolicy — `enum: ['Draft','Active','Archived']` removed from `status`. Values now from `statusconfigs.workflowStatuses`. `metaStatus` added (default: `'active'`).
> Employee.status remains a fixed enum — it is a system field, not a user-configurable workflow.

## Backend Services (Business Logic Hooks)
| Service File | Lines | Exported Functions |
|---|---|---|
| AgentInviteService.js | 115 |  |
| agents.js | 36 |  |
| employee.js | 26 |  |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
