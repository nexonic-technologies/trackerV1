import fs from 'fs';
import path from 'path';

const SERVICES_DIR = path.resolve(process.cwd(), 'Backend/src/services');

async function checkServiceHooks() {
  console.log('=== Starting Service Hooks Interface Check ===');
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found: ${SERVICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SERVICES_DIR);
  let warnings = 0;
  let errors = 0;

  for (const file of files) {
    if (file.endsWith('.js') && file !== 'fcmService.js') {
      try {
        const modulePath = path.join(SERVICES_DIR, file);
        const serviceModule = await import(`file://${modulePath}`);
        const factory = serviceModule.default;

        if (typeof factory !== 'function') {
          console.error(`🔴 Blocker: Service "${file}" does not export a default factory function.`);
          errors++;
          continue;
        }

        const hooks = factory();
        const hookKeys = Object.keys(hooks);
        const VALID_HOOKS = ['beforeCreate', 'afterCreate', 'beforeRead', 'afterRead', 'beforeUpdate', 'afterUpdate', 'beforeDelete', 'afterDelete'];
        
        const invalidKeys = hookKeys.filter(k => !VALID_HOOKS.includes(k));
        if (invalidKeys.length > 0) {
          console.warn(`🟠 Warning: Service "${file}" has non-standard hook exports: ${invalidKeys.join(', ')}`);
          warnings++;
        }

        console.log(`✓ Service "${file}" has valid hooks: [${hookKeys.filter(k => VALID_HOOKS.includes(k)).join(', ')}]`);
      } catch (err) {
        console.error(`🔴 Blocker: Failed to import service ${file}:`, err.message);
        errors++;
      }
    }
  }

  if (errors === 0) {
    console.log(`✅ PASS: Service hooks parsed successfully. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} services failed compliance checks.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkServiceHooks();
