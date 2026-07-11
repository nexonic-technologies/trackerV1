# Data Flow: Assets

## Dynamic API Payloads
Extracted from React pages targeting the generic `/populate` endpoint:

### 1. Asset Registry (`register.jsx`)
- **Query Assets**: `POST /populate/read/assets`
  - Payload: `{ filter: { metaStatus: "active" }, populateFields: [{ path: "categoryId", select: "name code" }] }`
- **Create Asset**: `POST /populate/create/assets`
  - Payload: `{ assetId, categoryId, name, make, model, purchaseCost, serialNumber, condition }`
- **Update Asset**: `PUT /populate/update/assets/:id`
  - Payload: `{ name, storageLocation, condition, notes }`

### 2. Allocations (`allocations.jsx`)
- **Query Allocations**: `POST /populate/read/assetallocations`
  - Payload: `{ populateFields: [{ path: "assetId" }, { path: "employeeId" }] }`
- **Request Allocation**: `POST /populate/create/assetallocations`
  - Payload: `{ assetId, employeeId, allocationType, expectedReturn, notes }`
- **Action Allocation (Approve/Reject)**: `PUT /populate/update/assetallocations/:id`
  - Payload: `{ status: "Active" }` or `{ status: "Rejected" }`
- **Return Asset**: `PUT /populate/update/assetallocations/:id`
  - Payload: `{ status: "Returned", returnedCondition, returnNotes, actualReturn: Date }`

### 3. Incidents & Damages (`incidents.jsx`)
- **Report Damage**: `POST /populate/create/assetincidents`
  - Payload: `{ assetId, employeeId, incidentType, incidentDate, description, estimatedRepairCost }`
- **Approve Salary Recovery**: `PUT /populate/update/assetincidents/:id`
  - Payload: `{ recoveryAmount, recoveryApproved: true }`

### 4. Repairs (`repairs.jsx`)
- **Send for Repair**: `POST /populate/create/assetrepairs`
  - Payload: `{ assetId, incidentId, vendorName, vendorContact, repairDescription, expectedReturnDate }`
- **Close Repair**: `PUT /populate/update/assetrepairs/:id`
  - Payload: `{ status: "Repaired", actualReturnDate: Date, repairCost, repairCondition }`

### 5. Procurement / GRN (`grn.jsx`)
- **Submit Purchase Order**: `POST /populate/create/assetpurchases`
  - Payload: `{ poNumber, vendorId, purchaseDate, items: [{ categoryId, name, model, quantity, unitPrice }] }`
- **Receive Goods (GRN Receipt)**: `PUT /populate/update/assetpurchases/:id`
  - Payload: `{ status: "Received" }`
  - *Trigger*: `assetHooksService.handleGRNReceipt` runs automatically, creating corresponding `AST-xxxxxx` asset records.
