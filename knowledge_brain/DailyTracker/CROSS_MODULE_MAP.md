# Cross Module Map - DailyTracker

Reference mapping of Daily Tracker integrations with other system collections and modules.

## Referenced Collections
| Model | Target Field | Schema Ref | Module | Usage |
|---|---|---|---|---|
| Client | `client` | `clients` | CRM / Masters | Links logged activity to a specific client profile. |
| ProjectType | `projectType` | `projecttypes` | CRM / Masters | Sub-categorizes activities under client projects. |
| TaskType | `taskType` | `tasktypes` | Tasks | Categorizes the specific nature of work done (e.g. Bug, Feature). |
| Employee | `user` | `employees` | HR / Profile | Attributes the logged activity to the working developer/user. |
