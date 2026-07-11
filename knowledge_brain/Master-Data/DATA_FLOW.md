# Data Flow: Master-Data

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **index.jsx** -> `POST /populate/read/clients`
- **index.jsx** -> `GET /populate/read/agents?populateFields=${encodeURIComponent(JSON.stringify(populateFields))}`
- **index.jsx** -> `DELETE /populate/delete/clients/${row._id}`
- **index.jsx** -> `PUT /populate/update/clients/${row._id}`
- **index.jsx** -> `POST /populate/create/agents`
- **index.jsx** -> `PUT /populate/update/clients/${editingClient._id}`
- **index.jsx** -> `POST /populate/create/clients`
- **index.jsx** -> `POST /populate/read/departments`
- **index.jsx** -> `DELETE /populate/delete/departments/${row._id}`
- **index.jsx** -> `PUT /populate/update/departments/${row._id}`
- **index.jsx** -> `PUT /populate/update/departments/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/departments`
- **index.jsx** -> `POST /populate/read/designations`
- **index.jsx** -> `DELETE /populate/delete/designations/${row._id}`
- **index.jsx** -> `PUT /populate/update/designations/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/designations`
- **index.jsx** -> `POST /populate/read/employees`
- **index.jsx** -> `POST /populate/read/departments`
- **index.jsx** -> `POST /populate/read/designations`
- **index.jsx** -> `POST /populate/read/roles`
- **index.jsx** -> `POST /populate/read/employees`
- **index.jsx** -> `DELETE /populate/delete/employees/${row._id}`
- **index.jsx** -> `PUT /populate/update/employees/${row._id}`
- **index.jsx** -> `PUT /populate/update/employees/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/employees`
- **index.jsx** -> `POST /populate/read/hrpolicies`
- **index.jsx** -> `DELETE /populate/delete/hrpolicies/${row._id}`
- **index.jsx** -> `PUT /populate/update/hrpolicies/${row._id}`
- **index.jsx** -> `PUT /populate/update/hrpolicies/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/hrpolicies`
- **index.jsx** -> `POST /populate/read/leadtypes`
- **index.jsx** -> `DELETE /populate/delete/leadtypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/leadtypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/leadtypes/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/leadtypes`
- **index.jsx** -> `POST /populate/read/leavepolicy`
- **index.jsx** -> `DELETE /populate/delete/leavepolicy/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavepolicy/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavepolicy/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/leavepolicy`
- **index.jsx** -> `POST /populate/read/leavetypes`
- **index.jsx** -> `DELETE /populate/delete/leavetypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavetypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavetypes/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/leavetypes`
- **index.jsx** -> `POST /populate/read/milestones`
- **index.jsx** -> `DELETE /populate/delete/milestones/${row._id}`
- **index.jsx** -> `PUT /populate/update/milestones/${row._id}`
- **index.jsx** -> `PUT /populate/update/milestones/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/milestones`
- **index.jsx** -> `POST /populate/read/projecttypes`
- **index.jsx** -> `DELETE /populate/delete/projecttypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/projecttypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/projecttypes/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/projecttypes`
- **index.jsx** -> `POST /populate/read/referencetypes`
- **index.jsx** -> `DELETE /populate/delete/referencetypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/referencetypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/referencetypes/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/referencetypes`
- **index.jsx** -> `POST /populate/read/roles`
- **index.jsx** -> `DELETE /populate/delete/roles/${row._id}`
- **index.jsx** -> `PUT /populate/update/roles/${row._id}`
- **index.jsx** -> `PUT /populate/update/roles/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/roles`
- **index.jsx** -> `POST /populate/read/shifts`
- **index.jsx** -> `DELETE /populate/delete/shifts/${row._id}`
- **index.jsx** -> `PUT /populate/update/shifts/${row._id}`
- **index.jsx** -> `PUT /populate/update/shifts/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/shifts`
- **index.jsx** -> `POST /populate/read/tasktypes`
- **index.jsx** -> `DELETE /populate/delete/tasktypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/tasktypes/${row._id}`
- **index.jsx** -> `PUT /populate/update/tasktypes/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/tasktypes`

## Status-Master UI (added 2026-06-10)

The Status Master page (`frontend/src/pages/Master-Data/Status-Master/index.jsx`) manages two collections:

### StatusConfig Panel
| Component | Method | URL | Payload |
|---|---|---|---|
| StatusConfigPanel | GET | `/api/config/status-configs` | — returns all StatusConfig docs |
| StatusConfigPanel | PUT | `/api/config/status-configs/:modelName` | `{ metaStatuses[], workflowStatuses[] }` (strip `_id`, `__v`, timestamps before send) |

### StatusMapping Panel
| Component | Method | URL | Payload |
|---|---|---|---|
| StatusMappingPanel | GET | `/api/config/status-mappings` | — returns all StatusMapping docs |
| StatusMappingPanel | PUT | `/api/config/status-mappings/:id` | `{ sourceModel, targetModel, linkField, reverseLinkField, mappings[], isActive }` (strip `_id`, `__v`, timestamps before send) |

> ⚠️ **Known gotcha**: `_id` must be deleted from the payload before PUT or Mongoose throws `Field "_id" cannot be modified`. This was fixed in the Status-Master save handlers (2026-06-10).

