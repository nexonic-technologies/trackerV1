# Data Flow - DailyTracker

Detail of the data flow path for creating and reading daily tracker activities.

## 1. Fetching Work Metadata & Activity Log
```
[Daily Tracker index.tsx] 
  ├── (mount / date change) ──> GET /populate/read/clients?populateFields={"projectTypes":"name"}
  ├── (mount) ────────────────> GET /populate/read/tasktypes
  └── (mount / date change) ──> GET /populate/read/dailyactivities?filter={...}&populateFields={"client":"name","projectType":"name","taskType":"name"}
                                  │
                                  └── [Mongoose] ──> Fetch activities matching user and selectedDate
```

## 2. Activity Creation Form Flow
```
[Form Input] ──> User details, Client, Project Type, Task Type, Activity Text
  └── [handleSubmitActivity]
        └── POST /populate/create/dailyactivities
              ├── [Body]: { user, client, projectType, taskType, activity, date }
              └── [Mongoose] ──> Save record to database
                    └── [Success Callback] ──> Refresh local logs, clear inputs
```
