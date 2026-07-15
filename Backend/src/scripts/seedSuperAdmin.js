// Backend/src/scripts/seedSuperAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

// Force Node.js to use reliable public DNS for MongoDB SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

async function seed() {
  console.log('Connecting to database:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  try {
    const { default: models } = await import('../models/Collection.js');
    const { setCache } = await import('../utils/cache.js');

    // 1. Clear All Database Collections dynamically
    console.log('--- Clearing All Database Collections ---');
    for (const mName of Object.keys(models)) {
      await models[mName].deleteMany({});
      console.log(`Cleared collection: ${mName}`);
    }

    // 2. Seed Super Admin Role (No capabilities)
    console.log('--- Seeding Super Admin Role ---');
    const superAdminId = '6a25cbc1cd36294f5e578696';
    const superAdminRole = await models.roles.create({
      _id: new mongoose.Types.ObjectId(superAdminId),
      name: 'Super Admin',
      isSuperAdmin: true,
      level: 10,
      isActive: true,
      permissionVersion: 1,
      capabilities: [],
      description: 'Super Admin role with absolute privileges'
    });
    console.log('Created Super Admin Role');

    // 3. Seed Department & Designation
    console.log('--- Seeding Department & Designation ---');
    const dept = await models.departments.create({
      name: 'Super Admin',
      shortCode: 'SA',
      description: 'Super Admin Department',
      designations: []
    });
    console.log('Created Super Admin Department');

    const desig = await models.designations.create({
      title: 'Super Admin',
      description: 'Super Admin Designation'
    });
    console.log('Created Super Admin Designation');

    dept.designations.push(desig._id);
    await dept.save();

    // 4. Seed Access Policies (Only for accesspolicies, roles, and employees to configure other models)
    console.log('--- Seeding Access Policies ---');
    const configModels = ['accesspolicies', 'roles', 'employees'];
    for (const modelName of configModels) {
      await models.accesspolicies.create({
        role: superAdminRole._id,
        modelName,
        actions: ['read', 'create', 'update', 'delete'],
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
        registry: [],
        conditions: {}
      });
      console.log(`Configured full permissions for model: ${modelName}`);
    }

    // 4.5 Seed Capabilities from pageCapabilityMapping
    console.log('--- Seeding Capabilities ---');
    const { default: pageCapabilityMappingHelper } = await import('../Config/pageCapabilityMapping.js');
    const capIdMap = new Map();
    for (const mapping of pageCapabilityMappingHelper.PAGE_CAPABILITY_MAPPING) {
      const key = mapping.capability;
      const parts = key.split(':');
      const module = parts[0].toLowerCase();
      const action = parts[1] || 'view';

      // Avoid duplicate keys just in case
      let capDoc = await models.capabilities.findOne({ key });
      if (!capDoc) {
        capDoc = await models.capabilities.create({
          key,
          module,
          action,
          label: mapping.description || `Access to ${parts[0]} ${action}`,
          description: mapping.description || `Access to ${parts[0]} ${action}`,
          status: 'active',
          type: 'ui'
        });
      }
      capIdMap.set(key, capDoc._id);
    }
    console.log(`Seeded ${capIdMap.size} capabilities`);

    const getSidebarCapabilities = (route) => {
      const key = pageCapabilityMappingHelper.getCapabilityForRoute(route);
      if (key && capIdMap.has(key)) {
        return [capIdMap.get(key)];
      }
      return [];
    };

    // 5. Seed Developer Employee
    console.log('--- Seeding Developer Employee ---');
    const email = 'developer@workhub.com';
    const passwordHash = await bcrypt.hash('password123', 12);
    const employee = await models.employees.create({
      basicInfo: {
        firstName: 'Developer',
        lastName: 'SuperAdmin',
        gender: 'male',
        phone: '9876543210',
        email: email
      },
      professionalInfo: {
        empId: 'EMP001',
        department: dept._id,
        designation: desig._id,
        role: superAdminRole._id,
        level: 'L4'
      },
      authInfo: {
        workEmail: email,
        password: passwordHash
      },
      status: 'Active',
      isActive: true
    });
    console.log('Created Developer SuperAdmin Employee');

    // 6. Dynamically build Sidebars from Frontend/src/pages
    console.log('--- Recreating Sidebars from Frontend pages ---');
    const pagesDir = path.resolve(process.cwd(), '../Frontend/src/pages');

    const iconMap = {
      dashboard: 'MdDashboard',
      accounts: 'MdAccountBalanceWallet',
      assets: 'MdWebAsset',
      attendance: 'MdCalendarToday',
      crm: 'MdPeople',
      hrms: 'MdSupervisedUserCircle',
      payroll: 'MdPayment',
      playground: 'MdPlayArrow',
      profile: 'MdPerson',
      search: 'MdSearch',
      settings: 'MdSettings',
      tickets: 'MdConfirmationNumber',
      'travel-expenses': 'MdReceipt',
      feed: 'MdRssFeed',
      policies: 'MdPolicy',
      tasks: 'MdAssignment',
      logout: 'MdExitToApp',
      teams: 'MdGroup'
    };

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const cleanTitle = (name) => {
      return name
        .replace(/\.jsx$/, '')
        .replace(/\.js$/, '')
        .split(/[-_]/)
        .map(capitalize)
        .join(' ');
    };

    const isPageFile = (fileName) => {
      if (fileName.startsWith('[') || fileName.startsWith('_')) return false;
      if (fileName.includes('Modal') || fileName.includes('Panel') || fileName.includes('Update')) return false;
      if (fileName.endsWith('.js') && !fileName.endsWith('index.js')) return false;
      return true;
    };

    const folders = await fs.readdir(pagesDir, { withFileTypes: true });
    let order = 1;

    for (const folder of folders) {
      const folderNameLower = folder.name.toLowerCase();

      // Skip public/auth/dynamic files & specific playground or doc routes
      if (
        folder.name.startsWith('[') ||
        folderNameLower.startsWith('login') ||
        folderNameLower.startsWith('forgot-password') ||
        folderNameLower.startsWith('reset-password') ||
        folderNameLower.startsWith('playground') ||
        folderNameLower.startsWith('populate-engine-documentation') ||
        folderNameLower.startsWith('documentations')
      ) {
        continue;
      }

      if (folder.isDirectory()) {
        const subDirPath = path.join(pagesDir, folder.name);
        const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });
        
        const childFiles = subEntries.filter(
          e => e.isFile() && (e.name.endsWith('.jsx') || e.name.endsWith('.js')) && isPageFile(e.name)
        );

        if (childFiles.length === 0) continue;

        const hasIndex = childFiles.some(f => f.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase() === 'index');
        const otherFiles = childFiles.filter(f => f.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase() !== 'index');

        if (otherFiles.length === 0 && hasIndex) {
          await models.sidebars.create({
            title: cleanTitle(folder.name),
            icon: {
              iconName: iconMap[folderNameLower] || 'MdFolder',
              iconPackage: 'react-icons/md'
            },
            mainRoute: `/${folderNameLower}`,
            visibility: 'protected',
            capabilities: getSidebarCapabilities(`/${folderNameLower}`),
            routes: [],
            isParent: true,
            hasChildren: false,
            order: order++,
            isActive: true,
            isDeleted: false
          });
          console.log(`Created top-level menu item: /${folderNameLower}`);
        } else {
          const parentId = new mongoose.Types.ObjectId();
          await models.sidebars.create({
            _id: parentId,
            title: cleanTitle(folder.name),
            icon: {
              iconName: iconMap[folderNameLower] || 'MdFolder',
              iconPackage: 'react-icons/md'
            },
            mainRoute: `/${folderNameLower}`,
            visibility: 'protected',
            capabilities: getSidebarCapabilities(`/${folderNameLower}`),
            routes: [],
            isParent: true,
            hasChildren: true,
            order: order++,
            isActive: true,
            isDeleted: false
          });

          let childOrder = 1;
          for (const childFile of childFiles) {
            const childNameLower = childFile.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase();
            if (childNameLower === 'index') continue;

            const childRoute = `/${folderNameLower}/${childNameLower}`;
            await models.sidebars.create({
              title: cleanTitle(childFile.name),
              icon: {
                iconName: 'MdInsertDriveFile',
                iconPackage: 'react-icons/md'
              },
              mainRoute: childRoute,
              visibility: 'protected',
              capabilities: getSidebarCapabilities(childRoute),
              routes: [],
              parentId: parentId,
              isParent: false,
              hasChildren: false,
              order: childOrder++,
              isActive: true,
              isDeleted: false
            });
            console.log(`  Created child menu item: ${childRoute}`);
          }
          console.log(`Created parent menu "${cleanTitle(folder.name)}" with its submenus.`);
        }

      } else if (folder.isFile() && (folder.name.endsWith('.jsx') || folder.name.endsWith('.js')) && isPageFile(folder.name)) {
        const fileNameLower = folder.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase();
        await models.sidebars.create({
          title: cleanTitle(folder.name),
          icon: {
            iconName: iconMap[fileNameLower] || 'MdInsertDriveFile',
            iconPackage: 'react-icons/md'
          },
          mainRoute: `/${fileNameLower}`,
          visibility: 'protected',
          capabilities: getSidebarCapabilities(`/${fileNameLower}`),
          routes: [],
          isParent: true,
          hasChildren: false,
          order: order++,
          isActive: true,
          isDeleted: false
        });
        console.log(`Created top-level menu item: /${fileNameLower}`);
      }
    }

    // Refresh Policy Cache
    console.log('Refreshing Cache...');
    await setCache();
    console.log('Cache version updated.');

    console.log('\n=============================================');
    console.log('✅ Seeding completed successfully!');
    console.log(`📧 Login Email: ${email}`);
    console.log('🔑 Password: password123');
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
