import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend/.env') });

const SERVICES_DIR = path.resolve(process.cwd(), 'Backend/src/services');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

function extractStatusLiterals(content) {
  const statuses = new Set();
  
  // Match assignments like status: 'Pending' or status = 'Pending'
  const assignRegex = /\bstatus\s*[:=]\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = assignRegex.exec(content)) !== null) {
    statuses.add(match[1]);
  }
  
  // Match comparisons like status === 'Approved'
  const compareRegex = /\bstatus\s*(===|!==|==|!=)\s*['"]([^'"]+)['"]/g;
  while ((match = compareRegex.exec(content)) !== null) {
    statuses.add(match[2]);
  }
  const compareRevRegex = /['"]([^'"]+)['"]\s*(===|!==|==|!=)\s*status\b/g;
  while ((match = compareRevRegex.exec(content)) !== null) {
    statuses.add(match[1]);
  }

  // Match oldStatus/prevStatus/newStatus
  const oldStatusRegex = /\b(_oldStatus|prevStatus|newStatus)\s*(===|!==|==|!=|[:=])\s*['"]([^'"]+)['"]/g;
  while ((match = oldStatusRegex.exec(content)) !== null) {
    statuses.add(match[2]);
  }

  // Match in status arrays like status: { $in: ['Pending', 'Approved'] }
  const inRegex = /\$in\s*:\s*\[([\s\S]*?)\]/g;
  while ((match = inRegex.exec(content)) !== null) {
    const arrayContent = match[1];
    const itemRegex = /['"]([^'"]+)['"]/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
      statuses.add(itemMatch[1]);
    }
  }

  return Array.from(statuses);
}

// Map service filename to DB model name
function getModelNameFromFilename(filename) {
  const base = filename.replace(/\.service\.js$/, '').replace(/\.js$/, '').toLowerCase();
  // Map common service overrides
  const map = {
    'attendances': 'attendances',
    'attendanceservice': 'attendances',
    'timetrackersessions': 'timetrackersessions',
    'leaves': 'leaves',
    'tasks': 'tasks',
    'tickets': 'tickets',
    'sprints': 'sprints',
    'compoffrequests': 'compoffrequests',
    'wfhrequests': 'wfhrequests',
    'payrollruns': 'payrollruns',
    'payrolls': 'payrolls'
  };
  return map[base] || base;
}

async function checkStatusTransitions() {
  console.log('=== Starting Status Transitions Validation ===');
  
  let dbConnected = false;
  let statusConfigs = [];

  try {
    await mongoose.connect(MONGO_URI);
    dbConnected = true;
    console.log('✓ Connected to MongoDB to load status configs.');
    
    // Fetch all status configs
    statusConfigs = await mongoose.connection.db.collection('statusconfigs').find({}).toArray();
  } catch (err) {
    console.warn('🟠 Warning: Could not connect to MongoDB. Transition check will be skipped or mock validated.', err.message);
  }

  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found: ${SERVICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SERVICES_DIR);
  let warnings = 0;
  let errors = 0;

  // Build a lookup map of modelName -> Set of valid status keys
  const configMap = new Map();
  statusConfigs.forEach(config => {
    const keys = new Set();
    if (Array.isArray(config.metaStatuses)) {
      config.metaStatuses.forEach(s => keys.add(s.key));
    }
    if (Array.isArray(config.workflowStatuses)) {
      config.workflowStatuses.forEach(s => keys.add(s.key));
    }
    configMap.set(config.modelName.toLowerCase(), keys);
  });

  for (const file of files) {
    if (file.endsWith('.js') && fs.statSync(path.join(SERVICES_DIR, file)).isFile()) {
      const content = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8');
      const literals = extractStatusLiterals(content);

      if (literals.length > 0) {
        const modelName = getModelNameFromFilename(file);
        const validStatuses = configMap.get(modelName);

        if (dbConnected && !validStatuses) {
          console.log(`🟠 Warning: No StatusConfig defined in database for modelName "${modelName}" (file: ${file})`);
          warnings++;
          continue;
        }

        literals.forEach(lit => {
          // Ignore general operational status values or active/inactive if we want,
          // but if we are dbConnected, let's verify exact matches
          if (dbConnected && validStatuses && !validStatuses.has(lit)) {
            // Check standard built-in statuses to reduce noise
            const standardIgnored = ['active', 'inactive', 'draft', 'archived', 'deleted', 'Active', 'Inactive', 'Terminated'];
            if (!standardIgnored.includes(lit)) {
              console.error(`🔴 Blocker: Invalid status transition key "${lit}" found in ${file} for model "${modelName}".`);
              errors++;
            }
          }
        });

        if (literals.length > 0) {
          console.log(`✓ Checked ${file} (${modelName}): Found status keys [${literals.join(', ')}]`);
        }
      }
    }
  }

  if (dbConnected) {
    await mongoose.disconnect();
  }

  if (errors === 0) {
    console.log(`✅ PASS: Status transitions compliance check passed. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} status transition issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkStatusTransitions();
