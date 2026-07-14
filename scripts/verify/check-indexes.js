import fs from 'fs';
import path from 'path';

const INDEXER_FILE = path.resolve(process.cwd(), 'Backend/src/services/databaseIndexer.js');
const SERVICES_DIR = path.resolve(process.cwd(), 'Backend/src/services');
const ROUTES_DIR = path.resolve(process.cwd(), 'Backend/src/routes');

// Extends variable names to DB model names
function resolveModelFromVar(varName) {
  const clean = varName.replace(/^models\./, '').toLowerCase();
  const map = {
    'leave': 'leaves',
    'employee': 'employees',
    'task': 'tasks',
    'attendance': 'attendances',
    'timetrackersession': 'sessions',
    'session': 'sessions',
    'notification': 'notifications',
    'client': 'clients',
    'quotation': 'quotations',
    'dailyactivity': 'dailyactivities',
    'todo': 'todos',
    'apihitlog': 'apihitlogs',
    'jobcategory': 'jobcategories',
    'jobtype': 'jobtypes'
  };
  return map[clean] || clean;
}

function parseIndexesFromIndexer() {
  const indexMap = new Map();
  if (!fs.existsSync(INDEXER_FILE)) {
    console.warn(`🟠 Warning: databaseIndexer.js not found at ${INDEXER_FILE}`);
    return indexMap;
  }

  const content = fs.readFileSync(INDEXER_FILE, 'utf8');
  // Match indexModel('modelName', [ indexes ])
  const regex = /indexModel\(\s*['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const modelName = match[1];
    const arrayContent = match[2];
    const indexes = [];

    // Match individual index objects { 'field': 1, 'field2': -1 }
    const objRegex = /\{([\s\S]*?)\}/g;
    let objMatch;
    while ((objMatch = objRegex.exec(arrayContent)) !== null) {
      const fieldsStr = objMatch[1];
      const fields = [];
      const fieldRegex = /['"]?([a-zA-Z0-9_.-]+)['"]?\s*:/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
        fields.push(fieldMatch[1]);
      }
      if (fields.length > 0) {
        indexes.push(fields);
      }
    }
    indexMap.set(modelName, indexes);
  }
  return indexMap;
}

function extractQueries(content) {
  const queries = [];
  // Match: ModelVar.find(...) or models.collection.find(...)
  const regex = /\b([a-zA-Z0-9_.]+)\.(find|findOne|findOneAndUpdate|updateOne|updateMany|deleteMany|countDocuments|findOneAndDelete|deleteOne)\s*\(\s*\{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const modelVar = match[1];
    const method = match[2];
    const startIndex = regex.lastIndex - 1; // '{'
    
    let braceCount = 1;
    let i = startIndex + 1;
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      i++;
    }
    if (braceCount === 0) {
      const objStr = content.slice(startIndex, i);
      queries.push({ modelVar, method, objStr });
    }
  }
  return queries;
}

function extractAllKeys(objStr) {
  const keys = new Set();
  const regex = /['"]?([a-zA-Z0-9_.-]+)['"]?\s*:/g;
  let match;
  while ((match = regex.exec(objStr)) !== null) {
    const key = match[1];
    if (!key.startsWith('$') && isNaN(Number(key))) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}

function checkIndexes() {
  console.log('=== Starting Database Index Audit ===');
  const indexMap = parseIndexesFromIndexer();
  
  if (indexMap.size === 0) {
    console.error('🔴 Blocker: No database indexes parsed from databaseIndexer.js');
    process.exit(1);
  }

  console.log(`Parsed index configurations for ${indexMap.size} models.`);

  const scanDirs = [SERVICES_DIR, ROUTES_DIR];
  let warnings = 0;
  let errors = 0;

  scanDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const queries = extractQueries(content);

        queries.forEach(q => {
          const modelName = resolveModelFromVar(q.modelVar);
          const filterKeys = extractAllKeys(q.objStr);
          
          if (filterKeys.length === 0) return; // empty filter / findAll

          const modelIndexes = indexMap.get(modelName);

          if (!modelIndexes) {
            // Model index config missing completely from databaseIndexer.js
            // Flag as warning since not all models require custom indexes
            const standardIgnored = ['accesspolicies', 'capabilities', 'roles', 'generalsettings'];
            if (!standardIgnored.includes(modelName)) {
              console.warn(`🟠 Warning: No index definitions found for model "${modelName}" (queried in ${file} via "${q.modelVar}.${q.method}").`);
              warnings++;
            }
            return;
          }

          // Check if each filtered key is indexed
          filterKeys.forEach(key => {
            if (key === '_id' || key === 'id') return; // Default indexed

            // Query key is indexed if it is the prefix (first element) of some index
            const isIndexed = modelIndexes.some(idx => idx[0] === key);

            if (!isIndexed) {
              console.warn(`🟠 Warning: Query filter field "${key}" in ${file} on model "${modelName}" is NOT the prefix of any index! Potential collection scan.`);
              warnings++;
            }
          });
        });
      }
    });
  });

  if (errors === 0) {
    console.log(`✅ PASS: Database index coverage audit complete. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} index issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkIndexes();
