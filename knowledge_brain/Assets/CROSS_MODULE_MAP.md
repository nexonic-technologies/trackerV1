# Cross Module Map: Assets

## Outbound References (Mongoose Schema relations)
| Target Collection | Source Collection | Reference Field | Purpose |
|---|---|---|---|
| **employees** | `assets` | `createdBy` | Audit of creator |
| **employees** | `assets` | `currentAllocatedTo` | Holder reference for query projection |
| **employees** | `assetallocations` | `employeeId` | Target assignee |
| **employees** | `assetallocations` | `managerId` | Manager responsible for approval |
| **employees** | `assetincidents` | `employeeId` | Person responsible for damage/loss |
| **employees** | `assetrepairs` | `createdBy` | Authorizer of repair order |
| **departments** | `assetallocations` | `departmentId` | Department visibility scope |
| **departments** | `assetincidents` | `departmentId` | Department responsibility scope |
| **approvalworkflows** | `assetallocations` | `workflowId` | Workflow instance status |
| **approvalworkflows** | `assetincidents` | `workflowId` | Workflow instance status |
| **payrolls** | `assetincidents` | `recoveryPayrollId` | Triggers salary deduction |
| **assetcategories** | `assets` | `categoryId` | Equipment category classification |
| **assetpurchases** | `assets` | `purchaseId` | Procurement order reference |
