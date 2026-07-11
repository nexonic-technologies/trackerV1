# DailyTracker Module Brain

## Overview
This module manages daily activity tracking, logs client/project/task types associated with work done, and handles user task records. It includes 1 frontend screen (`daily-tracker/index.tsx`) and maps to the `dailyactivities` backend model.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| DailyActivity | DailyActivity.js | 26 | `status` (String, no enum), `metaStatus` (String, default: active) | Refs: clients, projecttypes, employees, tasktypes. Controlled by StatusConfig. |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| index.tsx | GET | `/populate/read/clients?populateFields={"projectTypes":"name"}` | clients |
| index.tsx | GET | `/populate/read/tasktypes` | tasktypes |
| index.tsx | GET | `/populate/read/dailyactivities?filter=...` | dailyactivities |
| index.tsx | POST | `/populate/create/dailyactivities` | dailyactivities |
