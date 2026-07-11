// Security Integration Test
// Run this to verify all security components are working correctly

import { buildQuery } from "./policy/policyEngine.js";
import { getPolicy, setCache } from "./cache.js";
import { getRegistry } from "./policy/registry/index.js";

export async function runSecurityTests() {
  // console.log("🔒 Starting Security Integration Tests...\n");

  try {
    // 1. Test Cache Loading
    // console.log("1️⃣ Testing Cache Loading...");
    await setCache();
    // console.log("✅ Cache loaded successfully\n");

    // 2. Test Policy Retrieval
    // console.log("2️⃣ Testing Policy Retrieval...");
    const employeeRole = "68d8b98af397d1d97620ba97";
    const hrRole = "68d8b980f397d1d97620ba96";

    const employeePolicy = getPolicy(employeeRole, "employees");
    const hrPolicy = getPolicy(hrRole, "employees");

    if (employeePolicy) {
      // console.log("✅ Employee policy found");
    } else {
      // console.log("❌ Employee policy NOT found");
    }

    if (hrPolicy) {
      // console.log("✅ HR policy found");
    } else {
      // console.log("❌ HR policy NOT found");
    }
    // console.log("");

    // 3. Test Registry Functions
    // console.log("3️⃣ Testing Registry Functions...");
    const registries = ["isSelf", "isHR", "isManager", "isTeamMember", "isAssigned"];

    for (const regName of registries) {
      const regFn = getRegistry(regName);
      if (typeof regFn === "function") {
        // console.log(`✅ Registry '${regName}' loaded`);
      } else {
        // console.log(`❌ Registry '${regName}' NOT loaded`);
      }
    }
    // console.log("");

    // 4. Test Employee Read Access
    // console.log("4️⃣ Testing Employee Read Access...");
    try {
      const result = await buildQuery({
        role: employeeRole,
        userId: "68d8b9daf397d1d97620ba9a",
        action: "read",
        modelName: "employees",
        docId: "68d8b9daf397d1d97620ba9a",
        fields: "basicInfo.firstName,basicInfo.lastName",
        filter: {},
        body: null
      });
      // console.log("✅ Employee read access working");
    } catch (error) {
      // console.log("❌ Employee read access failed:", error.message);
    }
    // console.log("");

    // 5. Test Forbidden Field Access
    // console.log("5️⃣ Testing Forbidden Field Access...");
    try {
      const result = await buildQuery({
        role: employeeRole,
        userId: "68d8b9daf397d1d97620ba9a",
        action: "read",
        modelName: "employees",
        docId: "68d8b9daf397d1d97620ba9a",
        fields: "authInfo.password,salaryDetails", // Should be blocked
        filter: {},
        body: null
      });
      // console.log("❌ Forbidden field access NOT blocked (security issue!)");
    } catch (error) {
      // console.log("✅ Forbidden field access properly blocked:", error.message);
    }
    // console.log("");

    // 6. Test HR Full Access
    // console.log("6️⃣ Testing HR Full Access...");
    try {
      const result = await buildQuery({
        role: hrRole,
        userId: "68d8b9daf397d1d97620ba99",
        action: "read",
        modelName: "employees",
        fields: "basicInfo,professionalInfo",
        filter: {},
        body: null
      });
      // console.log("✅ HR full access working");
    } catch (error) {
      // console.log("❌ HR full access failed:", error.message);
    }
    // console.log("");

    // 7. Test Create Permission
    // console.log("7️⃣ Testing Create Permission...");
    try {
      const result = await buildQuery({
        role: employeeRole,
        userId: "68d8b9daf397d1d97620ba9a",
        action: "create",
        modelName: "attendances",
        body: {
          employeeId: "68d8b9daf397d1d97620ba9a",
          checkInTime: new Date(),
          date: new Date()
        }
      });
      // console.log("✅ Employee attendance create working");
    } catch (error) {
      // console.log("❌ Employee attendance create failed:", error.message);
    }
    // console.log("");

    // console.log("🎉 Security Integration Tests Completed!\n");

  } catch (error) {
    console.error("💥 Security test failed:", error);
  }
}

// Test individual registry function
export async function testRegistry(registryName, user, record, context = {}) {
  const regFn = getRegistry(registryName);
  if (!regFn) {
    // console.log(`❌ Registry '${registryName}' not found`);
    return false;
  }

  try {
    const result = await regFn(user, record, context);
    // console.log(`✅ Registry '${registryName}' result:`, result);
    return result;
  } catch (error) {
    // console.log(`❌ Registry '${registryName}' error:`, error.message);
    return false;
  }
}

// Export for manual testing
export { runSecurityTests as default };