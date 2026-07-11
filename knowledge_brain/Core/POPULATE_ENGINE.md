# The Populate Engine (Core API Architecture)

This document centralizes the knowledge regarding the dynamic `populateHelper.js` API, which forms the spine of the entire application. When debugging any API issue, start here.

## 1. The Core Files
The engine is distributed across these crucial core files:

| Responsibility | File Path |
|---|---|
| **Routing & Entry Gates** | `backend/src/routes/populateRoutes.js` |
| **Authentication** | `backend/src/Controller/AuthController.js` (`authMiddleware`) |
| **File Uploads (Multer)**| `backend/src/middlewares/multerConfig.js` (`upload`) |
| **Request Orchestrator** | `backend/src/helper/populateHelper.js` |
| **Security & Policies** | `backend/src/utils/policy/policyEngine.js` |
| **Policy Registry (FBAC)**| `backend/src/utils/policy/registry/` (e.g. `isSelf`, `isManager`) |
| **CRUD Query Builders** | `backend/src/crud/build*Query.js` |
| **Data Parsing & Compilation** | `filterParser.js`, `mongoFilterCompiler.js` |
| **Query Optimization** | `queryOptimizer.js`, `safeAggregator.js`, `defaultPopulateFields.js` |
| **Data Sanitization** | `sanitizeWrite.js`, `sanitizeUpdate.js`, `sanitizeRead.js`, `sanitizePopulated.js` |
| **Field Validation** | `validateFieldUpdateRules.js` |
| **Service Execution** | `servicesCache.js`, `registryExecutor.js` |
| **Tracing & Auditing** | `requestTracer.js`, `apiHitLogger.js`, `auditLogger.js`, `errorHandler.js` |
| **Concurrency & Queuing**| `backend/src/services/requestQueue.js` & `raceConditionHandler.js` |

## 2. Request Lifecycle (The "One API" Flow)

When the frontend issues a dynamic request (e.g. `axiosInstance.post('/populate/read/tickets', payload)`), the following sequence occurs:

1. **Routing & Entry Gates (`populateRoutes.js` & Middlewares)**: 
   - **Request Tracing (`requestTracer.js`)**: Every incoming request is assigned a unique `req.id` (Trace ID) to track it across logs.
   - **Performance Monitoring (`performanceMiddleware.js`)**: Starts a timer to track query execution times.
   - **Authentication (`authMiddleware`)**: Verifies the JWT, checks device session validity, and populates `req.user`. If invalid, the request is rejected immediately (401/403).
   - **File Upload Parsing (`multerConfig.js`)**: If the request is `multipart/form-data`, Multer intercepts it and attaches files to `req.files`.
2. **Orchestration & Concurrency (`populateHelper.js`)**: 
   - Checks the request action (`read`, `create`, `update`, `delete`, `report`).
   - Parses the JSON payload (merging `req.body` and legacy `req.query`).
   - Extracts the `x-device-uuid` fingerprint to identify the client.
   - Enqueues the request in the **Request Queue** (`requestQueue.js`) to prevent backend overload and manage per-device rate limiting.
   - Delegates execution to the `policyEngine.js`.
3. **Data Parsing & Input Sanitization**:
   - `filterParser.js` tokenizes and parses the user-provided filter object.
   - `mongoFilterCompiler.js` safely compiles the parsed syntax tree into a secure MongoDB filter (preventing NoSQL injection).
   - Inputs are sanitized using `sanitizeWrite.js` (for creates) and `sanitizeUpdate.js` (for updates) to ensure the payload strictly conforms to the Mongoose schema.
4. **Security Check & Policy Routing (`policyEngine.js` & `registry/`)**:
   - The engine looks up the access policy for the target model.
   - It evaluates a hybrid of **Role-Based (RBAC)** and **Fine-Grained/Field-Based Access Control (FBAC)**.
   - Using functions dynamically loaded from `backend/src/utils/policy/registry/` (e.g., `isSelf`, `isManager`, `isAssigned`, `isTeamMember`), the policy engine can execute complex conditional rules (e.g., "Allow update only if the user is the assigned employee").
   - Validates that the specific fields being modified are permitted for the user's role/status using `validateFieldUpdateRules.js`.
   - If allowed, it fetches the appropriate business logic service using `servicesCache.js`.
5. **Execution, Hooks, & Query Optimization**:
   - Based on the request action (`read`, `create`, etc.), the policy engine dynamically imports the specific query builder from `backend/src/crud/` (e.g., `buildReadQuery.js`).
   - `registryExecutor.js` is responsible for safely executing the dynamic `before*` and `after*` service hooks attached to the model.
   - **`before*` hooks**: Executes validation/logic before touching MongoDB.
   - **Race Condition Lock**: If the action is an `update`, `raceConditionHandler.js` applies an optimistic/pessimistic lock.
   - **Query Compilation**: For reads/reports, `defaultPopulateFields.js` determines which nested relations to load, while `queryOptimizer.js` optimizes the Mongoose `.populate()` payload to prevent N+1 issues and massive memory spikes. `safeAggregator.js` is utilized for secure data aggregation.
   - **Database Query**: The CRUD Query Builder executes the Mongoose CRUD operation securely, automatically injecting the ABAC policy filters.
   - **Audit Logging (`auditLogger.js`)**: Any mutations (creates, updates, deletes) are automatically recorded in the Audit Log collection for compliance and debugging.
   - **`after*` hooks**: Executes post-processing via `registryExecutor.js`.
6. **Output Sanitization & Finalization**:
   - Before returning the data, it is passed through `sanitizeRead.js` and `sanitizePopulated.js`.
   - **API Hit Logging (`apiHitLogger.js`)**: The final response time, status code, and payload size are logged.
   - **Error Handling (`errorHandler.js`)**: If *any* step in this pipeline throws an error, the global error handler catches it, sanitizes the error message for the frontend, and logs the stack trace with the Trace ID.

## 3. How Business Logic is Injected

If you need to add custom business logic (e.g., "when a task is created, update the milestone"), **DO NOT edit `populateHelper.js`**. 

Instead, find or create the corresponding service file in `backend/src/services/` and export the designated lifecycle hooks:

```javascript
// backend/src/services/tasks.js
export async function beforeCreate({ data, user }) {
  // Validate or mutate data before it saves to the DB
  if (!data.dueDate) throw new Error("Due date required");
  return { ...data, status: 'Pending' };
}

export async function afterCreate({ doc, user }) {
  // Trigger side-effects after successful DB save
  await sendNotification(user, `Task ${doc.title} assigned`);
}
```

## 4. Debugging & Error Tracing

If an API call to `/populate/...` fails or behaves unexpectedly, use the tracing system:
1. **Find the Trace ID**: Look at the frontend network tab. The failed request will have a Trace ID.
2. **Check the Error Log (`errorHandler.js`)**: The backend logs will show the exact file and line number where the pipeline crashed for that Trace ID.
3. **Payload Structure**: Check `frontend/src/components/useGenericAPI.js` to ensure the frontend is sending a valid JSON body.
4. **Policy Rejection**: Check `backend/src/utils/policy/` (or the FBAC registry) to ensure the user's role has permission.
5. **Debugging & Error Tracing**: Check the specific `backend/src/services/<model>.js` to see if a `beforeCreate` or `beforeUpdate` hook threw the exception.

## 5. Populate Strategy: Flat Populate (Not Tree-Based)

> **Critical**: `buildReadQuery.js` uses a **flat populate** approach. Each dot-notation path from `defaultPopulateFields.js` is checked directly against the Mongoose schema and populated individually.

### Why Not Tree-Based?
A previous tree-based approach split paths like `professionalInfo.designation` into a tree where `professionalInfo` was the parent. Since `Model.schema.path('professionalInfo')` returns `undefined` for nested subdocument parents, the fallback incorrectly treated it as a ref. This caused Mongoose "Path collision" errors.

### How Flat Populate Works
```
populateFields = {
  "professionalInfo.designation": "title",
  "professionalInfo.department": "name"
}

→ Schema check: schema.path("professionalInfo.designation") → ObjectId ref ✓
→ Schema check: schema.path("professionalInfo.department") → ObjectId ref ✓
→ query.populate([
    { path: "professionalInfo.designation", select: "title" },
    { path: "professionalInfo.department", select: "name" }
  ])
```

### Schema Path Resolution Rules
- If `schema.path(fullPath)` finds a ref → populate it
- If path not found AND single-segment (top-level) → treat as possible virtual/ref
- If path not found AND multi-segment → skip (it's a nested subdocument parent)

## 6. sanitizeRead: Path Collision Guard

`sanitizeRead.js` includes a deduplication step that collapses parent/child field conflicts:
- Input: `['professionalInfo', 'professionalInfo.designation']`
- Output: `['professionalInfo']` (child removed, parent covers it)

This prevents Mongoose projection errors when both a parent path and its children appear in a `.select()` call. The guard runs globally — for both main queries and all populated sub-queries.

## 7. Default Populate Fields

All default populate configurations live in `backend/src/Config/defaultPopulateFields.js`. When adding a new model:

1. Add an entry to `DEFAULT_POPULATE_FIELDS` with full dot-notation paths
2. Ensure all paths point to actual ref fields (not nested subdocument parents)
3. Use comma-separated field names for the select value (e.g., `'basicInfo.firstName,basicInfo.lastName'`)

