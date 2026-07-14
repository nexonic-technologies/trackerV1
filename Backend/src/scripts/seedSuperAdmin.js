// Backend/src/scripts/seedSuperAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import bcrypt from 'bcryptjs';

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
    const { default: pageCapabilityMapping } = await import('../Config/pageCapabilityMapping.js');
    const { setCache } = await import('../utils/cache.js');

    console.log('--- Seeding Capabilities ---');
    const { PAGE_CAPABILITY_MAPPING } = pageCapabilityMapping;
    const capabilityIds = [];

    for (const item of PAGE_CAPABILITY_MAPPING) {
      const key = item.capability;
      const parts = key.split(':');
      const moduleName = parts[0] || 'System';
      const label = item.description || `Access to ${key}`;

      const capDoc = await models.capabilities.findOneAndUpdate(
        { key },
        {
          $setOnInsert: {
            key,
            module: moduleName,
            label,
            description: label,
            status: 'active',
            type: 'ui'
          }
        },
        { upsert: true, new: true }
      ).lean();

      if (capDoc && capDoc._id) {
        capabilityIds.push(capDoc._id);
      }
    }
    console.log(`Seeded/verified ${PAGE_CAPABILITY_MAPPING.length} UI capabilities.`);

    console.log('--- Seeding Business Capabilities ---');
    const businessCapabilities = [
      { key: 'manage:salarystructures', label: 'Manage Salary Structures', desc: 'Create & update salary structures' },
      { key: 'manage:payroll',          label: 'Manage Payroll',           desc: 'Run payroll, approve, mark paid' },
      { key: 'manage:employees',        label: 'Manage Employees',         desc: 'Create & update employee records' },
      { key: 'manage:expenses',         label: 'Manage Expenses',          desc: 'Approve / reject expense submissions' },
      { key: 'manage:agents',           label: 'Manage Agents',            desc: 'Create agents' },
      { key: 'manage:leaves',           label: 'Manage Leaves',            desc: 'Approve / reject leave requests' },
      { key: 'manage:attendance',       label: 'Manage Attendance',        desc: 'Correct attendance records' },
      { key: 'view:reports',            label: 'View Reports',             desc: 'Access HR reports & analytics' },
    ];

    for (const item of businessCapabilities) {
      const key = item.key;
      const parts = key.split(':');
      const moduleName = parts[0] || 'System';

      const capDoc = await models.capabilities.findOneAndUpdate(
        { key },
        {
          $setOnInsert: {
            key,
            module: moduleName,
            label: item.label,
            description: item.desc,
            status: 'active',
            type: 'business'
          }
        },
        { upsert: true, new: true }
      ).lean();

      if (capDoc && capDoc._id) {
        capabilityIds.push(capDoc._id);
      }
    }
    console.log(`Seeded/verified ${businessCapabilities.length} business capabilities.`);

    console.log('--- Seeding Super Admin Role ---');
    let superAdminRole = await models.roles.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await models.roles.create({
        name: 'Super Admin',
        isSuperAdmin: true,
        level: 10,
        isActive: true,
        permissionVersion: 1,
        capabilities: capabilityIds,
        description: 'Super Admin role with absolute privileges'
      });
      console.log('Created Super Admin Role');
    } else {
      superAdminRole.isSuperAdmin = true;
      superAdminRole.level = 10;
      superAdminRole.isActive = true;
      superAdminRole.capabilities = capabilityIds;
      await superAdminRole.save();
      console.log('Updated existing Super Admin Role');
    }

    console.log('--- Seeding Access Policies ---');
    const collections = Object.keys(models);
    for (const col of collections) {
      await models.accesspolicies.findOneAndUpdate(
        { role: superAdminRole._id, modelName: col },
        {
          $set: {
            role: superAdminRole._id,
            modelName: col,
            actions: ['read', 'create', 'update', 'delete'],
            forbiddenAccess: { read: [], create: [], update: [], delete: [] },
            allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
            registry: [],
            conditions: {}
          }
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Configured full access policies for all ${collections.length} models for Super Admin.`);

    // --- Seeding Standard Roles & Access Policies ---
    console.log('--- Seeding Standard Roles & Access Policies ---');
    const standardRoles = [
      { name: 'Admin', level: 9, isSuperAdmin: false },
      { name: 'HR', level: 8, isSuperAdmin: false },
      { name: 'Manager', level: 5, isSuperAdmin: false },
      { name: 'Employee', level: 1, isSuperAdmin: false }
    ];

    for (const rSpec of standardRoles) {
      let roleDoc = await models.roles.findOne({ name: rSpec.name });
      if (!roleDoc) {
        roleDoc = await models.roles.create({
          name: rSpec.name,
          level: rSpec.level,
          isSuperAdmin: rSpec.isSuperAdmin,
          isActive: true,
          permissionVersion: 1,
          capabilities: capabilityIds, // Give standard ui capabilities initially
          description: `${rSpec.name} role`
        });
        console.log(`Created Role: ${rSpec.name}`);
      } else {
        roleDoc.level = rSpec.level;
        roleDoc.isActive = true;
        await roleDoc.save();
      }

      // Configure default access policies for each collection
      for (const col of collections) {
        let actions = ['read'];
        let forbiddenAccess = { read: [], create: [], update: [], delete: [] };
        let allowAccess = { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] };

        if (rSpec.name === 'Admin' || rSpec.name === 'HR') {
          // Admins & HR get all permissions
          actions = ['read', 'create', 'update', 'delete'];
        } else {
          // Employee & Manager get standard read, create, update, delete on relevant data
          actions = ['read', 'create', 'update'];
          
          // Field Gating configurations replacing validateFieldUpdateRules.js
          if (col === 'employees') {
            forbiddenAccess = {
              read: ['authInfo.password', 'salaryDetails'],
              create: ['employeeId', 'authInfo', 'salaryDetails'],
              update: ['employeeId', 'authInfo', 'salaryDetails'],
              delete: ['*']
            };
          } else if (col === 'attendances') {
            forbiddenAccess = {
              read: [],
              create: [],
              update: ['employee', 'approvalBy', 'approvedAt'],
              delete: ['*']
            };
          } else if (col === 'leaves') {
            forbiddenAccess = {
              read: [],
              create: [],
              update: ['employee', 'approvalBy', 'approvedAt', 'leavePolicy'],
              delete: ['*']
            };
          } else if (col === 'departments') {
            forbiddenAccess = {
              read: [],
              create: [],
              update: ['leavePolicy'],
              delete: ['*']
            };
          }
        }

        await models.accesspolicies.findOneAndUpdate(
          { role: roleDoc._id, modelName: col },
          {
            $set: {
              role: roleDoc._id,
              modelName: col,
              actions,
              forbiddenAccess,
              allowAccess,
              registry: [],
              conditions: {}
            }
          },
          { upsert: true }
        );
      }
      console.log(`✓ Configured Access Policies for Role "${rSpec.name}".`);
    }

    console.log('--- Seeding Department & Designation ---');
    let dept = await models.departments.findOne({ name: 'Super Admin' });
    if (!dept) {
      dept = await models.departments.create({
        name: 'Super Admin',
        shortCode: 'SA',
        description: 'Super Admin Department'
      });
      console.log('Created Super Admin Department');
    }

    let desig = await models.designations.findOne({ title: 'Super Admin' });
    if (!desig) {
      desig = await models.designations.create({
        title: 'Super Admin',
        description: 'Super Admin Designation'
      });
      console.log('Created Super Admin Designation');
    }

    // Link designation to department if not done
    if (!dept.designations.includes(desig._id)) {
      dept.designations.push(desig._id);
      await dept.save();
    }

    console.log('--- Seeding Developer Employee ---');
    const email = 'developer@workhub.com';
    let employee = await models.employees.findOne({ 'authInfo.workEmail': email });

    const passwordHash = await bcrypt.hash('password123', 12);

    if (!employee) {
      employee = await models.employees.create({
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
    } else {
      employee.professionalInfo.department = dept._id;
      employee.professionalInfo.designation = desig._id;
      employee.professionalInfo.role = superAdminRole._id;
      employee.authInfo.password = passwordHash;
      employee.status = 'Active';
      employee.isActive = true;
      await employee.save();
      console.log('Updated existing Developer SuperAdmin Employee info and password');
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
