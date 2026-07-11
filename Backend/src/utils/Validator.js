//  src/utils/validator.js

/* ─────────────────────────────────────────────── */
/*     ⚡️ CONDITION RESOLUTION ENGINE             */
/* ─────────────────────────────────────────────── */
function resolveConditions({ conditions = [], context }) {
  for (const rule of conditions) {
    let matched = true;

    for (const key in rule) {
      if (["effect", "fields"].includes(key)) continue;

      // "!key" → NOT condition
      if (key.startsWith("!")) {
        const prop = key.slice(1);
        if (context[prop] === true) matched = false;
      } else if (context[key] !== true) {
        matched = false;
      }
    }
    if (matched) return rule;
  }
  return null;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 1. CONDITIONS VALIDATION                */
/* ─────────────────────────────────────────────── */
export function conditionsValidator({ policy, action, filter, fields, body, context }) {
  const conditions = policy.conditions?.[action];
  if (!conditions || !conditions.length) return { filter, fields, body };

  const matched = resolveConditions({ conditions, context });
  if (!matched) return { filter, fields, body }; // nothing applies

  if (matched.effect === "deny") {
    throw new Error(`⛔ Access denied by conditional rule for ${action}`);
  }

  if (matched.effect === "allow") {
    if (matched.fields?.includes("*")) return { filter, fields, body };
    fields = matched.fields?.join(",") ?? fields;
  }

  return { filter, fields, body };
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 2. FIELDS (select & populate)           */
/* ─────────────────────────────────────────────── */
export function fieldsValidator({ policy, action, modelName, fields }) {
    // If no fields specified, let sanitizeRead handle it based on policy
    if (!fields) return fields;

  const blocked = policy.forbiddenAccess?.[action] || [];
  const allowed = policy.allowAccess?.[action] || [];

  // ❌ full restriction
  if (blocked.includes("*")) {
    throw new Error(`⛔ Access denied: ${modelName} fields forbidden for ${action}`);
  }

  // ❌ forbidden fields
  blocked.forEach((f) => {
    if (fields.includes(f)) {
      throw new Error(`⛔ Field '${f}' forbidden for ${action} on ${modelName}`);
    }
  });

  // ✔ allow-only field whitelist
  if (allowed.length && !allowed.includes("*")) {
    fields.split(",").forEach((f) => {
      if (!allowed.includes(f)) {
        throw new Error(`⛔ '${f}' not allowed for ${action} on ${modelName}`);
      }
    });
  }

  return fields;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 3. BODY (create / update)               */
/* ─────────────────────────────────────────────── */
export function bodyValidator({ policy, action, modelName, body }) {
  if (!body || typeof body !== "object") return body;

  const blocked = policy.forbiddenAccess?.[action] || [];
  const allowed = policy.allowAccess?.[action] || [];

  // ❌ Full block
  if (blocked.includes("*")) {
    throw new Error(`⛔ Body update blocked for ${action} on ${modelName}`);
  }

  for (const key of Object.keys(body)) {
    if (blocked.includes(key)) {
      throw new Error(`⛔ Cannot ${action} field '${key}' on ${modelName}`);
    }

    if (allowed.length && !allowed.includes("*") && !allowed.includes(key)) {
      throw new Error(`⛔ Field '${key}' not allowed for ${action} on ${modelName}`);
    }
  }

  return body;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 4. FILTER valid fields in query         */
/* ─────────────────────────────────────────────── */
export function filterValidator({ policy, action, modelName, filter }) {
  if (!filter || typeof filter !== "object") return filter;

  const blocked = policy.forbiddenAccess?.[action] || [];
  const allowed = policy.allowAccess?.[action] || [];

  for (const key of Object.keys(filter)) {
    if (blocked.includes("*") || blocked.includes(key)) {
      throw new Error(`⛔ Cannot use forbidden filter '${key}' on ${modelName}`);
    }

    if (allowed.length && !allowed.includes("*") && !allowed.includes(key)) {
      throw new Error(`⛔ Cannot filter by '${key}' for ${action} on ${modelName}`);
    }
  }

  return filter;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 5. AGGREGATION (lookup + project)       */
/* ─────────────────────────────────────────────── */
export function aggregateValidator({ filter, role, action, modelName, getPolicy }) {
  if (!filter?.aggregate || !Array.isArray(filter.stages)) return filter;

  // get ALL models this role has access to
  const allPolicies = getPolicy(role); // NOT model-specific!
  const permittedModels = Object.values(allPolicies)
    .filter((p) => p.permissions?.read)
    .map((p) => p.modelName.toLowerCase());

  filter.stages.forEach((stage) => {
    /* ❌ Lookup unauthorized model → BLOCK */
    if (stage.$lookup) {
      const target = stage.$lookup.from.toLowerCase();
      if (!permittedModels.includes(target)) {
        throw new Error(
          `⛔ Lookup access denied: '${role}' has no policy for '${target}' (while reading '${modelName}')`
        );
      }
    }

    /* ⚠ Projection — remove forbidden fields silently */
    if (stage.$project) {
      const allowed = allPolicies[modelName]?.allowAccess?.[action] || [];
      Object.keys(stage.$project).forEach((key) => {
        if (!allowed.includes("*") && !allowed.includes(key)) {
          delete stage.$project[key];
        }
      });
    }
  });

  return filter;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 6. MAIN VALIDATOR (default export)      */
/* ─────────────────────────────────────────────── */
export default function validator({
  action,
  modelName,
  role,
  userId,
  docId,
  filter,
  fields,
  body,
  policy,
  getPolicy, // needed for aggregation
}) {
  // If no policy, allow all operations (temporary fix)
  if (!policy) {
    return { filter: filter || {}, fields, body };
  }

  let resolvedRole = role;
  if (role === 'agent') {
    resolvedRole = '6a25cbc1cd36294f5e578696';
  }

  if (String(policy.role) !== String(resolvedRole)) {
    throw new Error(`⛔ Role mismatch`);
  }
  if (policy.permissions?.[action] === false) {
    throw new Error(`⛔ '${role}' has no permission to ${action} '${modelName}'`);
  }

  /* 🔥 Context auto-generation */
  const context = {
    isSelf: docId && String(docId) === String(userId),
    isLeave: body?.status === "Leave" || filter?.status === "Leave",
    isPopulate: !!fields,
    isSalary: fields?.includes("salary") || body?.salary != null,
    isTeamMember: false, // This needs to be determined by registry
    isAssigned: false, // This needs to be determined by registry
    isRecipient: false, // This needs to be determined by registry
  };

  // 1️⃣ Conditional rules
  ({ filter, fields, body } = conditionsValidator({
    policy,
    action,
    filter,
    fields,
    body,
    context,
  }));

  // 2️⃣ Field select access
  fields = fieldsValidator({ policy, action, modelName, fields });

  // 3️⃣ Body access (create / update)
  if (["create", "update"].includes(action)) {
    body = bodyValidator({ policy, action, modelName, body });
  }

  // 4️⃣ Filter (query) field access
  filter = filterValidator({ policy, action, modelName, filter });

  // 5️⃣ Aggregation protection (lookup + projection)
  filter = aggregateValidator({ filter, role, action, modelName, getPolicy });

  return { filter, fields, body };
}
