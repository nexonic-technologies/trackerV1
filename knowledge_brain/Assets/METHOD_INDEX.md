# Method & Model Index: Assets

## Models (Alphabetical)
| Model | Mongoose Name | Source File |
|---|---|---|
| **Asset** | `assets` | `Asset.js` |
| **AssetAllocation** | `assetallocations` | `AssetAllocation.js` |
| **AssetCategory** | `assetcategories` | `AssetCategory.js` |
| **AssetIncident** | `assetincidents` | `AssetIncident.js` |
| **AssetInvoice** | `assetinvoices` | `AssetInvoice.js` |
| **AssetPayment** | `assetpayments` | `AssetPayment.js` |
| **AssetPurchase** | `assetpurchases` | `AssetPurchase.js` |
| **AssetRepair** | `assetrepairs` | `AssetRepair.js` |
| **AssetStockLedger** | `assetstockledgers` | `AssetStockLedger.js` |
| **AssetVendor** | `assetvendors` | `AssetVendor.js` |

## Service Hooks & Helper Functions
| Function Name | File | Description |
|---|---|---|
| **beforeCreate** | `services/assetallocations.js` | Allocation validation guard |
| **afterCreate** | `services/assetallocations.js` | Approval workflow initiation |
| **beforeUpdate** | `services/assetallocations.js` | State transition gate |
| **afterUpdate** | `services/assetallocations.js` | Asset ownership update & stock log |
| **beforeCreate** | `services/assetrepairs.js` | Flags asset as Under Repair |
| **afterUpdate** | `services/assetrepairs.js` | Restores asset to Available or Disposed |
| **beforeCreate** | `services/assetincidents.js` | Damage incident registrar |
| **afterCreate** | `services/assetincidents.js` | Incident approval router |
| **writeLedgerEntry** | `services/assetHooksService.js` | Write stock entry helper |
| **handleGRNReceipt** | `services/assetHooksService.js` | Post-receipt asset generator |
