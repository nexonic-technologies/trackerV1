import { fork } from 'child_process';
import path from 'path';

const VERIFY_SCRIPTS = [
  'check-raw-routes.js',
  'check-service-hooks.js',
  'check-status-transitions.js',
  'check-indexes.js',
  'check-tx-boundaries.js',
  'check-abac-fields.js'
];

const args = process.argv.slice(2);
const isSystem = args.includes('--system');
const modelArg = args.find(arg => arg.startsWith('--model='));

if (!isSystem && !modelArg) {
  console.error('❌ Error: Please specify either --system or --model=<ModelName> (e.g. --model=Ticket)');
  process.exit(1);
}

const scriptsDir = path.resolve(process.cwd(), 'scripts/verify');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running verification script: ${scriptName}`);
    
    // Pass args down to individual scripts
    const child = fork(path.join(scriptsDir, scriptName), args);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAll() {
  console.log('=============================================');
  console.log(`  Tracker Code Compliance Suite (Runner)     `);
  console.log(`  Scope: ${isSystem ? 'SYSTEM-WIDE' : modelArg} `);
  console.log('=============================================');

  try {
    for (const script of VERIFY_SCRIPTS) {
      await runScript(script);
    }
    console.log('\n=============================================');
    console.log('✅ SUCCESS: All verification audits passed!');
    console.log('=============================================');
    process.exit(0);
  } catch (err) {
    console.error('\n=============================================');
    console.error(`❌ FAILED: Verification suite failed.`);
    console.error(err.message);
    console.error('=============================================');
    process.exit(1);
  }
}

runAll();
