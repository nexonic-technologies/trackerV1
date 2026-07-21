import { setCache, getPolicy, getRoleMeta } from "../cache.js";
import { getService } from "../servicesCache.js";
import { getModel } from "../appRegistry.js";
import validator from "../Validator.js";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

// Remove immediate cache initialization
// setCache(); // This will be called from index.js after DB connection

export async function buildQuery(ctx) {
  const {
    action: rawAction,
    modelName,
    docId,
    fields,
    body,
    filter,
    populateFields,
    returnFilter = false, // New flag for returning just the filter
    user
  } = ctx;

  let role = user?.role;
  if (role === 'agent') {
    role = '6a25cbc1cd36294f5e578696';
  }
  const userId = user?.id;

  // Normalize action aliases so "list" → "read", "statistics" → "report", etc.
  const PERMISSION_ALIASES = { list: 'read', statistics: 'report' };
  const action = PERMISSION_ALIASES[rawAction] || rawAction;

  if (!role || !modelName) throw new Error(`Role and modelName are required (role=${role}, modelName=${modelName})`);


  const Model = getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  // Load role metadata to check for Super Admin
  const roleMeta = getRoleMeta(role);
  const isSuperAdmin = !!roleMeta?.isSuperAdmin || role === 'agent' || role === '6a25cbc1cd36294f5e578696';

  // Load model-specific policy or construct virtual policy for Super Admin / Guest
  let policy = getPolicy(role, modelName);

  if (isSuperAdmin) {
    policy = {
      role,
      modelName,
      permissions: { read: true, create: true, update: true, delete: true },
      forbiddenAccess: { read: [], create: [], update: [], delete: [] },
      allowAccess: { read: ["*"], create: ["*"], update: ["*"], delete: ["*"] },
      conditions: {}
    };
  } else if (role === 'guest' || role === 'GuestCandidate') {
    if (modelName === 'jobopenings' && action === 'read') {
      policy = {
        role,
        modelName,
        permissions: { read: true, create: false, update: false, delete: false },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ["*"], create: [], update: [], delete: [] },
        conditions: {}
      };
    } else if (modelName === 'candidates') {
      policy = {
        role,
        modelName,
        permissions: { read: true, create: true, update: true, delete: false },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ["*"], create: ["*"], update: ["*"], delete: [] },
        conditions: {}
      };
    }
  }

  // STRICT MODE: Fail Closed
  if (!policy) {
    throw new Error(`⛔ CRITICAL SECURITY: No policy defined for role '${role}' on model '${modelName}'. Request Blocked.`);
  }


  // --------------------------------------------------
  //  1️⃣ VALIDATE BEFORE CRUD (NO FAIL-OPEN ANYMORE)
  // --------------------------------------------------
  const { filter: safeFilter, fields: safeFields, body: safeBody } = validator({
    action,
    modelName,
    role,
    userId,
    docId,
    filter,
    fields,
    body,
    policy,
    getPolicy        // <-- important for lookup protection
  });

  // If only filter is requested, return it
  if (returnFilter) {
    return safeFilter;
  }
  // --------------------------------------------------
  //  2️⃣ IMPORT THE CORRECT CRUD HANDLER
  // --------------------------------------------------
  const crudFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    `../../crud/build${capitalize(action)}Query.js`
  );
  let crudHandler;
  try {
    crudHandler = (await import(pathToFileURL(crudFile).href)).default;
  } catch (err) {
    console.error(`[policyEngine] Failed to import CRUD handler from ${crudFile}:`, err);
    throw new Error(`❌ CRUD handler not found: ${crudFile}`);
  }

  // --------------------------------------------------
  //  3️⃣ EXECUTE CRUD WITH SAFE DATA ONLY
  // --------------------------------------------------
  ctx.fields = safeFields;
  ctx.body = safeBody;
  ctx.filter = safeFilter;
  ctx.policy = policy;

  return await crudHandler(ctx);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
