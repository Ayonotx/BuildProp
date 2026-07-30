import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 32;
const HASH_LENGTH = 64;
const ALGORITHM = 'sha256';

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH, ALGORITHM, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

function id(): string {
  return crypto.randomUUID();
}

function d(daysOffset: number, date?: Date): Date {
  const base = date || new Date('2026-07-27');
  const result = new Date(base);
  result.setDate(result.getDate() + daysOffset);
  return result;
}

function dt(dateStr: string): Date {
  return new Date(dateStr);
}

async function main() {
  console.log('Seeding database...\n');

  await prisma.complianceItem.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryCategory.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.transactionLine.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.landTransaction.deleteMany();
  await prisma.landRecord.deleteMany();
  await prisma.leasePayment.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.propertyUnit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.changeOrder.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.projectTask.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('Cleared existing data.');

  // ─── Roles ───────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.create({ data: { id: id(), name: 'Super Admin', description: 'Full system access', level: 100, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Admin', description: 'Administrative access', level: 90, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Manager', description: 'Project and team management', level: 70, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Accountant', description: 'Financial operations', level: 60, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Engineer', description: 'Engineering and technical tasks', level: 50, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'HR Manager', description: 'Human resources management', level: 60, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Sales Executive', description: 'Sales and client relations', level: 50, isSystem: true } }),
    prisma.role.create({ data: { id: id(), name: 'Viewer', description: 'Read-only access', level: 10, isSystem: true } }),
  ]);

  const [superAdmin, admin, manager, accountant, engineer, hrManager, salesExec, viewer] = roles;
  console.log(`Created ${roles.length} roles.`);

  // ─── Permissions ─────────────────────────────────────
  const modules = ['projects', 'properties', 'contacts', 'invoices', 'payments', 'inventory', 'employees', 'reports', 'settings', 'documents'];
  const actions = ['create', 'read', 'update', 'delete'];
  const permissions: { id: string; module: string; action: string; resource: string | null }[] = [];

  for (const mod of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.create({
        data: { id: id(), module: mod, action, resource: null },
      });
      permissions.push(perm);
    }
  }

  for (const role of roles) {
    const perms = role.level >= 50 ? permissions : permissions.filter(p => p.action === 'read');
    for (const perm of perms) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log(`Created ${permissions.length} permissions.`);

  // ─── Users ───────────────────────────────────────────
  const defaultPassword = await hashPassword('demo123');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: id(), email: 'admin@buildprop.com', passwordHash: defaultPassword,
        firstName: 'John', lastName: 'Admin', phone: '+233 24 000 0001',
        roleId: superAdmin.id, isActive: true, lastLoginAt: d(-1),
      },
    }),
    prisma.user.create({
      data: {
        id: id(), email: 'manager@buildprop.com', passwordHash: defaultPassword,
        firstName: 'Sarah', lastName: 'Manager', phone: '+233 24 000 0002',
        roleId: manager.id, isActive: true, lastLoginAt: d(-2),
      },
    }),
    prisma.user.create({
      data: {
        id: id(), email: 'account@buildprop.com', passwordHash: defaultPassword,
        firstName: 'Mike', lastName: 'Accountant', phone: '+233 24 000 0003',
        roleId: accountant.id, isActive: true, lastLoginAt: d(-3),
      },
    }),
    prisma.user.create({
      data: {
        id: id(), email: 'engineer@buildprop.com', passwordHash: defaultPassword,
        firstName: 'Lisa', lastName: 'Engineer', phone: '+233 24 000 0004',
        roleId: engineer.id, isActive: true, lastLoginAt: d(-1),
      },
    }),
    prisma.user.create({
      data: {
        id: id(), email: 'sales@buildprop.com', passwordHash: defaultPassword,
        firstName: 'Kwame', lastName: 'Sales', phone: '+233 24 000 0005',
        roleId: salesExec.id, isActive: true, lastLoginAt: d(-5),
      },
    }),
    prisma.user.create({
      data: {
        id: id(), email: 'hr@buildprop.com', passwordHash: defaultPassword,
        firstName: 'Ama', lastName: 'HR', phone: '+233 24 000 0006',
        roleId: hrManager.id, isActive: true, lastLoginAt: d(-4),
      },
    }),
  ]);

  const [userAdmin, userManager, userAccount, userEngineer, userSales, userHr] = users;
  console.log(`Created ${users.length} users.`);

  // ─── Projects ────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        id: id(), name: 'Sunrise Villa Phase 2', code: 'PRJ-001', description: 'Luxury 12-unit residential villa development with modern amenities in East Legon.',
        projectType: 'residential', status: 'in_progress', priority: 'high',
        startDate: dt('2024-06-01'), endDate: dt('2025-08-30'),
        estimatedBudget: 850000, actualCost: 578000, completionPercentage: 68,
        location: 'East Legon, Accra', latitude: 5.6388, longitude: -0.1663,
        projectManagerId: userManager.id,
      },
    }),
    prisma.project.create({
      data: {
        id: id(), name: 'Ocean View Estates', code: 'PRJ-002', description: 'Waterfront apartment complex with 24 units and commercial ground floor.',
        projectType: 'residential', status: 'in_progress', priority: 'high',
        startDate: dt('2024-09-15'), endDate: dt('2026-03-15'),
        estimatedBudget: 1200000, actualCost: 504000, completionPercentage: 42,
        location: 'Tema, Accra', latitude: 5.6698, longitude: -0.0166,
        projectManagerId: userManager.id,
      },
    }),
    prisma.project.create({
      data: {
        id: id(), name: 'Downtown Plaza', code: 'PRJ-003', description: 'Mixed-use commercial plaza with 8 floors of office space and retail.',
        projectType: 'commercial', status: 'planning', priority: 'medium',
        startDate: dt('2025-03-01'), endDate: dt('2026-12-31'),
        estimatedBudget: 2500000, actualCost: 375000, completionPercentage: 15,
        location: 'Osu, Accra', latitude: 5.5600, longitude: -0.1720,
        projectManagerId: userManager.id,
      },
    }),
    prisma.project.create({
      data: {
        id: id(), name: 'Green Park Residences', code: 'PRJ-004', description: 'Eco-friendly townhouse community with solar power and rainwater harvesting.',
        projectType: 'residential', status: 'completed', priority: 'medium',
        startDate: dt('2023-10-01'), endDate: dt('2025-02-28'),
        estimatedBudget: 650000, actualCost: 612000, completionPercentage: 100,
        location: 'Airport Residential, Accra', latitude: 5.6037, longitude: -0.1770,
        projectManagerId: userManager.id,
      },
    }),
    prisma.project.create({
      data: {
        id: id(), name: 'Hilltop Commercial Center', code: 'PRJ-005', description: 'Shopping center with cinema, supermarket and food court.',
        projectType: 'commercial', status: 'on_hold', priority: 'low',
        startDate: dt('2024-11-01'), endDate: dt('2026-06-30'),
        estimatedBudget: 1800000, actualCost: 450000, completionPercentage: 25,
        location: 'Pantang, Accra', latitude: 5.6800, longitude: -0.1500,
        projectManagerId: userManager.id,
      },
    }),
    prisma.project.create({
      data: {
        id: id(), name: 'Riverside Gardens', code: 'PRJ-006', description: 'Mid-range housing development with 30 units along the Volta River.',
        projectType: 'residential', status: 'planning', priority: 'medium',
        startDate: dt('2025-06-01'), endDate: dt('2027-01-31'),
        estimatedBudget: 950000, actualCost: 0, completionPercentage: 0,
        location: 'Tema Industrial, Accra', latitude: 5.6800, longitude: -0.0100,
        projectManagerId: userManager.id,
      },
    }),
  ]);

  const [prj1, prj2, prj3, prj4, prj5, prj6] = projects;
  console.log(`Created ${projects.length} projects.`);

  // ─── Project Members ─────────────────────────────────
  const memberRoles = ['Lead Engineer', 'Architect', 'Site Supervisor', 'Financial Controller'];
  for (const project of projects) {
    await prisma.projectMember.create({
      data: { id: id(), projectId: project.id, userId: userManager.id, role: 'Project Manager' },
    });
    await prisma.projectMember.create({
      data: { id: id(), projectId: project.id, userId: userEngineer.id, role: memberRoles[Math.floor(Math.random() * memberRoles.length)] },
    });
  }
  console.log('Created project members.');

  // ─── Project Milestones ──────────────────────────────
  const milestoneData = [
    { projectId: prj1.id, name: 'Foundation Complete', status: 'completed', completedDate: dt('2024-08-15'), dueDate: dt('2024-08-30'), budgetAllocated: 150000, budgetSpent: 142000, sortOrder: 1 },
    { projectId: prj1.id, name: 'Structural Frame', status: 'completed', completedDate: dt('2024-12-01'), dueDate: dt('2024-12-15'), budgetAllocated: 250000, budgetSpent: 238000, sortOrder: 2 },
    { projectId: prj1.id, name: 'Interior Finishing', status: 'in_progress', dueDate: dt('2026-09-30'), budgetAllocated: 300000, budgetSpent: 198000, sortOrder: 3 },
    { projectId: prj2.id, name: 'Site Preparation', status: 'completed', completedDate: dt('2024-11-20'), dueDate: dt('2024-11-30'), budgetAllocated: 200000, budgetSpent: 185000, sortOrder: 1 },
    { projectId: prj2.id, name: 'Foundation & Basement', status: 'in_progress', dueDate: dt('2026-08-31'), budgetAllocated: 350000, budgetSpent: 319000, sortOrder: 2 },
    { projectId: prj2.id, name: 'Superstructure', status: 'pending', dueDate: dt('2026-12-31'), budgetAllocated: 400000, budgetSpent: 0, sortOrder: 3 },
    { projectId: prj3.id, name: 'Design Approval', status: 'in_progress', dueDate: dt('2026-08-15'), budgetAllocated: 100000, budgetSpent: 75000, sortOrder: 1 },
    { projectId: prj3.id, name: 'Ground Breaking', status: 'pending', dueDate: dt('2026-09-01'), budgetAllocated: 150000, budgetSpent: 0, sortOrder: 2 },
    { projectId: prj4.id, name: 'All Phases Complete', status: 'completed', completedDate: dt('2025-02-20'), dueDate: dt('2025-02-28'), budgetAllocated: 650000, budgetSpent: 612000, sortOrder: 1 },
    { projectId: prj5.id, name: 'Architectural Design', status: 'in_progress', dueDate: dt('2026-07-31'), budgetAllocated: 200000, budgetSpent: 200000, sortOrder: 1 },
    { projectId: prj5.id, name: 'Permitting', status: 'pending', dueDate: dt('2026-09-15'), budgetAllocated: 50000, budgetSpent: 0, sortOrder: 2 },
    { projectId: prj6.id, name: 'Feasibility Study', status: 'in_progress', dueDate: dt('2026-08-01'), budgetAllocated: 50000, budgetSpent: 0, sortOrder: 1 },
    { projectId: prj6.id, name: 'Environmental Assessment', status: 'pending', dueDate: dt('2026-10-01'), budgetAllocated: 75000, budgetSpent: 0, sortOrder: 2 },
  ];
  for (const m of milestoneData) {
    await prisma.projectMilestone.create({ data: { id: id(), ...m } });
  }
  console.log(`Created ${milestoneData.length} milestones.`);

  // ─── Project Tasks ───────────────────────────────────
  const taskData = [
    { projectId: prj1.id, title: 'Pour foundation slab', status: 'completed', priority: 'high', assignedTo: userEngineer.id, estimatedHours: 120, actualHours: 115, startDate: dt('2024-07-01'), dueDate: dt('2024-07-30'), completedDate: dt('2024-07-28') },
    { projectId: prj1.id, title: 'Install plumbing rough-in', status: 'completed', priority: 'medium', assignedTo: userEngineer.id, estimatedHours: 80, actualHours: 90, startDate: dt('2024-10-01'), dueDate: dt('2024-11-15'), completedDate: dt('2024-11-20') },
    { projectId: prj1.id, title: 'Electrical wiring first floor', status: 'in_progress', priority: 'high', assignedTo: userEngineer.id, estimatedHours: 60, startDate: dt('2026-07-01'), dueDate: dt('2026-08-15') },
    { projectId: prj1.id, title: 'Roof installation', status: 'in_progress', priority: 'high', assignedTo: userEngineer.id, estimatedHours: 100, startDate: dt('2026-07-10'), dueDate: dt('2026-08-30') },
    { projectId: prj2.id, title: 'Excavate basement level', status: 'completed', priority: 'high', assignedTo: userEngineer.id, estimatedHours: 200, actualHours: 210, startDate: dt('2024-10-01'), dueDate: dt('2024-11-15'), completedDate: dt('2024-11-18') },
    { projectId: prj2.id, title: 'Waterproof basement walls', status: 'in_progress', priority: 'medium', assignedTo: userEngineer.id, estimatedHours: 40, startDate: dt('2026-07-05'), dueDate: dt('2026-08-01') },
    { projectId: prj3.id, title: 'Finalize architectural drawings', status: 'in_progress', priority: 'high', assignedTo: userEngineer.id, estimatedHours: 160, startDate: dt('2026-07-01'), dueDate: dt('2026-08-20') },
    { projectId: prj3.id, title: 'Submit building permit application', status: 'todo', priority: 'high', assignedTo: userManager.id, estimatedHours: 20, startDate: dt('2026-08-15'), dueDate: dt('2026-09-15') },
    { projectId: prj5.id, title: 'Complete conceptual design', status: 'in_progress', priority: 'medium', assignedTo: userEngineer.id, estimatedHours: 80, startDate: dt('2026-07-01'), dueDate: dt('2026-07-31') },
  ];
  for (const t of taskData) {
    await prisma.projectTask.create({ data: { id: id(), ...t } });
  }
  console.log(`Created ${taskData.length} tasks.`);

  // ─── Properties ──────────────────────────────────────
  const properties = await Promise.all([
    prisma.property.create({
      data: {
        id: id(), name: 'Sunrise Villa Block A', slug: 'sunrise-villa-block-a',
        description: '4-bedroom detached villa with modern finishes, large compound, and servant quarters.',
        propertyType: 'house', status: 'available', price: 245000, areaSqft: 3200,
        bedrooms: 4, bathrooms: 3, address: '12 Sunrise Avenue', city: 'East Legon', state: 'Accra',
        features: '{"compound": true, "servants_quarters": true, "garage": true, "swimming_pool": false}',
        images: '["villa1.jpg", "villa2.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Ocean View Apartment 12B', slug: 'ocean-view-apt-12b',
        description: '2-bedroom apartment on the 12th floor with panoramic ocean views.',
        propertyType: 'apartment', status: 'sold', price: 180000, areaSqft: 1400,
        bedrooms: 2, bathrooms: 2, address: '45 Ocean Drive, Block B', city: 'Tema', state: 'Accra',
        features: '{"balcony": true, "ocean_view": true, "parking": true}',
        images: '["apt1.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Downtown Office Suite 301', slug: 'downtown-office-301',
        description: 'Class A office space with open plan layout, meeting rooms, and reception area.',
        propertyType: 'commercial', status: 'available', price: 350000, areaSqft: 2100,
        address: '8 Independence Avenue, 3rd Floor', city: 'Osu', state: 'Accra',
        features: '{"elevator": true, "backup_power": true, "central_ac": true, "meeting_rooms": 2}',
        images: '["office1.jpg", "office2.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Green Park Townhouse 5', slug: 'green-park-townhouse-5',
        description: '3-bedroom townhouse with solar panels and rainwater harvesting system.',
        propertyType: 'house', status: 'reserved', price: 320000, areaSqft: 2400,
        bedrooms: 3, bathrooms: 2, address: '5 Green Park Lane', city: 'Airport Residential', state: 'Accra',
        features: '{"solar_power": true, "rainwater_harvesting": true, "garden": true}',
        images: '["townhouse1.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Hilltop Land Plot 12', slug: 'hilltop-land-plot-12',
        description: '0.75 acre residential land with road access and utilities nearby.',
        propertyType: 'land', status: 'available', price: 85000, areaSqft: 32670,
        address: 'Plot 12, Hilltop Estates', city: 'Pantang', state: 'Accra',
        features: '{"road_access": true, "electricity_nearby": true, "title_deed": true}',
        images: '["land1.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Riverside Warehouse', slug: 'riverside-warehouse',
        description: '5000 sqft warehouse with loading dock, office space, and secure compound.',
        propertyType: 'commercial', status: 'available', price: 520000, areaSqft: 5000,
        address: '22 Industrial Road', city: 'Tema Industrial Area', state: 'Accra',
        features: '{"loading_dock": true, "office_space": true, "generator": true, "cctv": true}',
        images: '["warehouse1.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Sunset Heights Condo', slug: 'sunset-heights-condo',
        description: '1-bedroom luxury condo with city views, gym access, and 24hr security.',
        propertyType: 'apartment', status: 'available', price: 275000, areaSqft: 950,
        bedrooms: 1, bathrooms: 1, address: '3 Sunset Heights Road', city: 'Cantonments', state: 'Accra',
        features: '{"gym": true, "security": true, "city_view": true, "concierge": true}',
        images: '["condo1.jpg", "condo2.jpg"]',
      },
    }),
    prisma.property.create({
      data: {
        id: id(), name: 'Lakeside Villa 7', slug: 'lakeside-villa-7',
        description: '5-bedroom luxury villa on the lakefront with private dock and gardens.',
        propertyType: 'house', status: 'sold', price: 420000, areaSqft: 4500,
        bedrooms: 5, bathrooms: 4, address: '7 Lakeside Drive', city: 'Adjiringanor', state: 'Accra',
        features: '{"lakefront": true, "private_dock": true, "gardens": true, "swimming_pool": true}',
        images: '["villa_lake1.jpg"]',
      },
    }),
  ]);
  console.log(`Created ${properties.length} properties.`);

  // ─── Property Units ──────────────────────────────────
  const aptUnits = [
    { propertyId: properties[1].id, unitNumber: '12B', floor: 12, type: '2-bed-apartment', price: 180000, status: 'sold' },
    { propertyId: properties[1].id, unitNumber: '12C', floor: 12, type: '2-bed-apartment', price: 185000, status: 'available' },
    { propertyId: properties[6].id, unitNumber: 'PH1', floor: 15, type: 'penthouse', price: 450000, status: 'available' },
  ];
  for (const u of aptUnits) {
    await prisma.propertyUnit.create({ data: { id: id(), ...u } });
  }
  console.log('Created property units.');

  // ─── Leases ──────────────────────────────────────────
  const lease = await prisma.lease.create({
    data: {
      id: id(), propertyId: properties[1].id, tenantId: 'tenant-001',
      startDate: dt('2024-03-01'), endDate: dt('2025-02-28'),
      rentAmount: 2500, securityDeposit: 5000, paymentDay: 1,
      status: 'expired', autoRenew: true,
    },
  });
  await prisma.leasePayment.createMany({
    data: [
      { id: id(), leaseId: lease.id, amount: 2500, dueDate: dt('2024-03-01'), paidDate: dt('2024-02-28'), status: 'paid' },
      { id: id(), leaseId: lease.id, amount: 2500, dueDate: dt('2024-04-01'), paidDate: dt('2024-04-01'), status: 'paid' },
      { id: id(), leaseId: lease.id, amount: 2500, dueDate: dt('2024-05-01'), paidDate: dt('2024-05-02'), status: 'paid' },
      { id: id(), leaseId: lease.id, amount: 2500, dueDate: dt('2024-06-01'), status: 'overdue' },
    ],
  });
  console.log('Created lease and payments.');

  // ─── Land Records ────────────────────────────────────
  await prisma.landRecord.create({
    data: {
      id: id(), title: 'East Legon Extension Plot', surveyNumber: 'SL-2024-0456',
      areaAcres: 2.5, areaSqft: 108900, landType: 'residential',
      marketValue: 500000, address: 'Off Trasacco Road', city: 'East Legon',
      ownerName: 'BuildProp Holdings Ltd', ownershipType: 'freehold',
      encumbranceStatus: 'clear', status: 'owned',
      images: '["land_photo1.jpg"]',
    },
  });
  await prisma.landRecord.create({
    data: {
      id: id(), title: 'Tema Industrial Plot A', surveyNumber: 'SL-2024-0789',
      areaAcres: 5.0, areaSqft: 217800, landType: 'commercial',
      marketValue: 1200000, address: 'Community 25', city: 'Tema',
      ownerName: 'BuildProp Holdings Ltd', ownershipType: 'leasehold',
      encumbranceStatus: 'clear', status: 'owned',
      images: '[]',
    },
  });
  console.log('Created 2 land records.');

  // ─── Accounts (Chart of Accounts) ────────────────────
  const accounts = await Promise.all([
    prisma.account.create({ data: { id: id(), code: '1000', name: 'Assets', type: 'asset', balance: 0 } }),
    prisma.account.create({ data: { id: id(), code: '1010', name: 'Cash & Bank', type: 'asset', balance: 250000 } }),
    prisma.account.create({ data: { id: id(), code: '1020', name: 'Accounts Receivable', type: 'asset', balance: 85000 } }),
    prisma.account.create({ data: { id: id(), code: '1030', name: 'Inventory', type: 'asset', balance: 45000 } }),
    prisma.account.create({ data: { id: id(), code: '2000', name: 'Liabilities', type: 'liability', balance: 0 } }),
    prisma.account.create({ data: { id: id(), code: '2010', name: 'Accounts Payable', type: 'liability', balance: 62000 } }),
    prisma.account.create({ data: { id: id(), code: '2020', name: 'Loans', type: 'liability', balance: 500000 } }),
    prisma.account.create({ data: { id: id(), code: '3000', name: 'Equity', type: 'equity', balance: 1000000 } }),
    prisma.account.create({ data: { id: id(), code: '4000', name: 'Revenue', type: 'revenue', balance: 0 } }),
    prisma.account.create({ data: { id: id(), code: '4010', name: 'Property Sales', type: 'revenue', balance: 895000 } }),
    prisma.account.create({ data: { id: id(), code: '4020', name: 'Rental Income', type: 'revenue', balance: 75000 } }),
    prisma.account.create({ data: { id: id(), code: '5000', name: 'Expenses', type: 'expense', balance: 0 } }),
    prisma.account.create({ data: { id: id(), code: '5010', name: 'Construction Costs', type: 'expense', balance: 2100000 } }),
    prisma.account.create({ data: { id: id(), code: '5020', name: 'Salaries', type: 'expense', balance: 480000 } }),
    prisma.account.create({ data: { id: id(), code: '5030', name: 'Utilities', type: 'expense', balance: 36000 } }),
  ]);
  console.log(`Created ${accounts.length} accounts.`);

  // ─── Transactions ────────────────────────────────────
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        id: id(), transactionNumber: 'TXN-001', date: dt('2026-01-15'), type: 'expense',
        description: 'Payment to Kofi Construction for foundation work', totalAmount: 85000, status: 'posted', createdBy: userAccount.id,
      },
    }),
    prisma.transaction.create({
      data: {
        id: id(), transactionNumber: 'TXN-002', date: dt('2026-02-01'), type: 'income',
        description: 'Property sale receipt - Sunrise Villa Block A', totalAmount: 245000, status: 'posted', createdBy: userAccount.id,
      },
    }),
    prisma.transaction.create({
      data: {
        id: id(), transactionNumber: 'TXN-003', date: dt('2026-02-15'), type: 'expense',
        description: 'Staff salaries - February 2026', totalAmount: 95000, status: 'posted', createdBy: userAccount.id,
      },
    }),
  ]);

  const [acctCash, acctAP, acctConstruction, acctSalaries, acctPropSales] = accounts;
  const txnLines = [
    { id: id(), transactionId: transactions[0].id, accountId: acctConstruction.id, debit: 85000, credit: 0, description: 'Foundation work PRJ-001' },
    { id: id(), transactionId: transactions[0].id, accountId: acctCash.id, debit: 0, credit: 85000, description: 'Bank transfer' },
    { id: id(), transactionId: transactions[1].id, accountId: acctCash.id, debit: 245000, credit: 0, description: 'Received from property sale' },
    { id: id(), transactionId: transactions[1].id, accountId: acctPropSales.id, debit: 0, credit: 245000, description: 'Property sale revenue' },
    { id: id(), transactionId: transactions[2].id, accountId: acctSalaries.id, debit: 95000, credit: 0, description: 'Monthly payroll' },
    { id: id(), transactionId: transactions[2].id, accountId: acctCash.id, debit: 0, credit: 95000, description: 'Bank transfer for salaries' },
  ];
  await prisma.transactionLine.createMany({ data: txnLines });
  console.log(`Created ${transactions.length} transactions with ${txnLines.length} lines.`);

  // ─── Contacts / CRM ──────────────────────────────────
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        id: id(), type: 'customer', firstName: 'Nana', lastName: 'Asante', email: 'nana.asante@gmail.com',
        phone: '+233 20 123 4567', company: 'Asante Holdings', address: '15 Labone Avenue, Accra',
        notes: 'Interested in Ocean View apartments. Budget up to $200k.', source: 'website', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'lead', firstName: 'Kofi', lastName: 'Mensah', email: 'kofi.mensah@outlook.com',
        phone: '+233 24 234 5678', address: '23 Cantonments Road, Accra',
        notes: 'Referred by Nana Asante. Looking for commercial space.', source: 'referral', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'customer', firstName: 'Akua', lastName: ' Boateng', email: 'akua.boateng@yahoo.com',
        phone: '+233 26 345 6789', company: 'Boateng Enterprises', address: '8 Airport Hills, Accra',
        notes: 'Purchased Lakeside Villa 7. Repeat customer.', source: 'walk_in', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'tenant', firstName: 'Yaw', lastName: 'Owusu', email: 'yaw.owusu@gmail.com',
        phone: '+233 50 456 7890', address: '45 Tema Comm 7, Accra',
        notes: 'Current tenant in Ocean View apartment. Good payment history.', source: 'website', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'vendor', firstName: 'Samuel', lastName: 'Adjaye', email: 'samuel@adjaye-supply.com',
        phone: '+233 27 567 8901', company: 'Adjaye Building Supplies', address: '12 Spintex Road, Accra',
        notes: 'Primary building materials supplier. Net 30 terms.', source: 'trade_show', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'lead', firstName: 'Esi', lastName: 'Darko', email: 'esi.darko@gmail.com',
        phone: '+233 23 678 9012', address: '7 East Legon Hills, Accra',
        notes: 'Inquired about Green Park Townhouses. Wants eco-friendly features.', source: 'social_media', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'vendor', firstName: 'Abdul', lastName: 'Rahman', email: 'abdul@rahman-electrical.com',
        phone: '+233 55 789 0123', company: 'Rahman Electrical Services', address: '33 Osu Oxford Street, Accra',
        notes: 'Electrical contractor. Licensed and insured.', source: 'referral', status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        id: id(), type: 'customer', firstName: 'Efua', lastName: 'Sutherland', email: 'efua.sutherland@gmail.com',
        phone: '+233 20 890 1234', company: 'Sutherland & Co', address: '55 Ridge Road, Accra',
        notes: 'Corporate buyer looking for office space downtown. Budget $300k-$500k.', source: 'website', status: 'lead',
      },
    }),
  ]);
  console.log(`Created ${contacts.length} contacts.`);

  // ─── Communications ──────────────────────────────────
  const comms = [
    { id: id(), contactId: contacts[0].id, type: 'email', direction: 'inbound', subject: 'Inquiry about Ocean View Apartments', content: 'Hi, I would like to schedule a viewing for the available units at Ocean View.', createdBy: userSales.id },
    { id: id(), contactId: contacts[0].id, type: 'email', direction: 'outbound', subject: 'RE: Inquiry about Ocean View Apartments', content: 'Thank you for your interest! We have units available from $180,000. When would you like to visit?', createdBy: userSales.id },
    { id: id(), contactId: contacts[1].id, type: 'call', direction: 'outbound', subject: 'Follow-up call', content: 'Called to discuss commercial space requirements. Prefers ground floor with parking.', createdBy: userSales.id },
    { id: id(), contactId: contacts[2].id, type: 'meeting', direction: 'outbound', subject: 'Final walkthrough Lakeside Villa', content: 'Conducted final walkthrough. Client satisfied with all finishes.', createdBy: userManager.id },
    { id: id(), contactId: contacts[4].id, type: 'email', direction: 'inbound', subject: 'Invoice submission - January 2026', content: 'Please find attached invoice for materials supplied to PRJ-001.', createdBy: userAccount.id },
  ];
  await prisma.communication.createMany({ data: comms });
  console.log(`Created ${comms.length} communications.`);

  // ─── Appointments ────────────────────────────────────
  const appointments = [
    { id: id(), contactId: contacts[0].id, title: 'Property Viewing - Ocean View Apt 12C', description: 'Show available 2-bedroom apartment', startTime: dt('2026-08-05T10:00:00'), endTime: dt('2026-08-05T11:30:00'), status: 'scheduled', createdBy: userSales.id },
    { id: id(), contactId: contacts[1].id, title: 'Site Visit - Downtown Plaza', description: 'Walk through the planned site with client', startTime: dt('2026-08-07T14:00:00'), endTime: dt('2026-08-07T16:00:00'), status: 'scheduled', createdBy: userSales.id },
    { id: id(), contactId: contacts[7].id, title: 'Needs Analysis Meeting', description: 'Discuss office space requirements and budget', startTime: dt('2026-07-25T09:00:00'), endTime: dt('2026-07-25T10:00:00'), status: 'completed', createdBy: userSales.id },
  ];
  await prisma.appointment.createMany({ data: appointments });
  console.log(`Created ${appointments.length} appointments.`);

  // ─── Complaints ──────────────────────────────────────
  const complaints = [
    { id: id(), contactId: contacts[3].id, subject: 'Water pressure issue - Apt 12B', description: 'Low water pressure on 12th floor, especially during peak hours.', priority: 'high', status: 'open' },
    { id: id(), contactId: contacts[2].id, subject: 'Fence repair needed', description: 'Boundary fence near gate has a crack.', priority: 'low', status: 'resolved', resolution: 'Fence repaired on 2026-06-20', resolvedAt: dt('2026-06-20') },
  ];
  await prisma.complaint.createMany({ data: complaints });
  console.log(`Created ${complaints.length} complaints.`);

  // ─── Invoices ────────────────────────────────────────
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        id: id(), invoiceNumber: 'INV-2026-001', type: 'sales', contactId: contacts[0].id,
        issueDate: dt('2026-01-15'), dueDate: dt('2026-02-15'),
        subtotal: 245000, taxAmount: 36750, totalAmount: 281750, paidAmount: 281750,
        status: 'paid', createdBy: userAccount.id,
      },
    }),
    prisma.invoice.create({
      data: {
        id: id(), invoiceNumber: 'INV-2026-002', type: 'purchase', contactId: contacts[4].id,
        issueDate: dt('2026-02-01'), dueDate: dt('2026-03-01'),
        subtotal: 42000, taxAmount: 6300, totalAmount: 48300, paidAmount: 48300,
        status: 'paid', createdBy: userAccount.id,
      },
    }),
    prisma.invoice.create({
      data: {
        id: id(), invoiceNumber: 'INV-2026-003', type: 'sales', contactId: contacts[1].id,
        issueDate: dt('2026-03-20'), dueDate: dt('2026-04-20'),
        subtotal: 350000, taxAmount: 52500, totalAmount: 402500, paidAmount: 100000,
        status: 'partial', createdBy: userAccount.id,
      },
    }),
    prisma.invoice.create({
      data: {
        id: id(), invoiceNumber: 'INV-2026-004', type: 'purchase', contactId: contacts[6].id,
        issueDate: dt('2026-05-01'), dueDate: dt('2026-06-01'),
        subtotal: 18500, taxAmount: 2775, totalAmount: 21275, paidAmount: 0,
        status: 'overdue', createdBy: userAccount.id,
      },
    }),
    prisma.invoice.create({
      data: {
        id: id(), invoiceNumber: 'INV-2026-005', type: 'sales', contactId: contacts[7].id,
        issueDate: dt('2026-06-15'), dueDate: dt('2026-07-15'),
        subtotal: 520000, taxAmount: 78000, totalAmount: 598000, paidAmount: 0,
        status: 'draft', createdBy: userAccount.id,
      },
    }),
  ]);

  const [inv1, inv2, inv3, inv4, inv5] = invoices;
  const invoiceItems = [
    { id: id(), invoiceId: inv1.id, description: 'Sunrise Villa Block A - Unit 1', quantity: 1, unitPrice: 245000, amount: 245000 },
    { id: id(), invoiceId: inv2.id, description: 'Building materials - Cement (200 bags)', quantity: 200, unitPrice: 95, amount: 19000 },
    { id: id(), invoiceId: inv2.id, description: 'Building materials - Steel rebar (tons)', quantity: 8, unitPrice: 2875, amount: 23000 },
    { id: id(), invoiceId: inv3.id, description: 'Downtown Office Suite 301 - Deposit', quantity: 1, unitPrice: 100000, amount: 100000 },
    { id: id(), invoiceId: inv3.id, description: 'Downtown Office Suite 301 - Balance', quantity: 1, unitPrice: 250000, amount: 250000 },
    { id: id(), invoiceId: inv4.id, description: 'Electrical installation - PRJ-001', quantity: 1, unitPrice: 18500, amount: 18500 },
    { id: id(), invoiceId: inv5.id, description: 'Sunset Heights Condo - Unit PH1', quantity: 1, unitPrice: 450000, amount: 450000 },
    { id: id(), invoiceId: inv5.id, description: 'Parking space (underground)', quantity: 1, unitPrice: 70000, amount: 70000 },
  ];
  await prisma.invoiceItem.createMany({ data: invoiceItems });
  console.log(`Created ${invoices.length} invoices with ${invoiceItems.length} items.`);

  // ─── Payments ────────────────────────────────────────
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-001', type: 'received', contactId: contacts[0].id,
        invoiceId: inv1.id, amount: 281750, paymentMethod: 'bank_transfer',
        paymentDate: dt('2026-02-10'), createdBy: userAccount.id,
      },
    }),
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-002', type: 'received', contactId: contacts[1].id,
        invoiceId: inv3.id, amount: 100000, paymentMethod: 'bank_transfer',
        paymentDate: dt('2026-05-01'), createdBy: userAccount.id,
      },
    }),
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-003', type: 'made', contactId: contacts[4].id,
        invoiceId: inv2.id, amount: 48300, paymentMethod: 'bank_transfer',
        paymentDate: dt('2026-03-25'), createdBy: userAccount.id,
      },
    }),
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-004', type: 'made', contactId: contacts[6].id,
        invoiceId: inv4.id, amount: 21275, paymentMethod: 'mobile_money',
        paymentDate: dt('2026-06-05'), createdBy: userAccount.id,
      },
    }),
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-005', type: 'received', contactId: contacts[7].id,
        invoiceId: inv5.id, amount: 75000, paymentMethod: 'bank_transfer',
        paymentDate: dt('2026-01-15'), createdBy: userAccount.id,
      },
    }),
    prisma.payment.create({
      data: {
        id: id(), paymentNumber: 'PAY-2026-006', type: 'received', contactId: contacts[0].id,
        invoiceId: inv3.id, amount: 45000, paymentMethod: 'bank_transfer',
        paymentDate: dt('2026-04-20'), createdBy: userAccount.id,
      },
    }),
  ]);
  console.log(`Created ${payments.length} payments.`);

  // ─── Budget Items ────────────────────────────────────
  const budgetItems = [
    { id: id(), projectId: prj1.id, category: 'Foundation & Structure', budgetedAmount: 300000, spentAmount: 280000, fiscalYear: 2025 },
    { id: id(), projectId: prj1.id, category: 'Electrical & Plumbing', budgetedAmount: 150000, spentAmount: 90000, fiscalYear: 2025 },
    { id: id(), projectId: prj1.id, category: 'Interior Finishing', budgetedAmount: 200000, spentAmount: 108000, fiscalYear: 2025 },
    { id: id(), projectId: prj2.id, category: 'Site Works', budgetedAmount: 200000, spentAmount: 185000, fiscalYear: 2025 },
    { id: id(), projectId: prj2.id, category: 'Structure', budgetedAmount: 450000, spentAmount: 200000, fiscalYear: 2025 },
    { id: id(), projectId: prj2.id, category: 'MEP', budgetedAmount: 300000, spentAmount: 119000, fiscalYear: 2025 },
    { id: id(), projectId: prj3.id, category: 'Design & Permits', budgetedAmount: 250000, spentAmount: 375000, fiscalYear: 2025 },
    { id: id(), projectId: prj3.id, category: 'Construction', budgetedAmount: 1800000, spentAmount: 0, fiscalYear: 2025 },
    { id: id(), projectId: prj3.id, category: 'Furnishing', budgetedAmount: 450000, spentAmount: 0, fiscalYear: 2025 },
  ];
  await prisma.budget.createMany({ data: budgetItems });
  console.log(`Created ${budgetItems.length} budget items.`);

  // ─── Departments ─────────────────────────────────────
  const departments = await Promise.all([
    prisma.department.create({ data: { id: id(), name: 'Construction', code: 'CONST' } }),
    prisma.department.create({ data: { id: id(), name: 'Sales & Marketing', code: 'SALES' } }),
    prisma.department.create({ data: { id: id(), name: 'Finance', code: 'FIN' } }),
    prisma.department.create({ data: { id: id(), name: 'Human Resources', code: 'HR' } }),
    prisma.department.create({ data: { id: id(), name: 'Administration', code: 'ADMIN' } }),
  ]);
  const [deptConstruction, deptSales, deptFinance, deptHR, deptAdmin] = departments;
  console.log(`Created ${departments.length} departments.`);

  // ─── Employees ───────────────────────────────────────
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        id: id(), userId: userEngineer.id, employeeId: 'EMP-001', departmentId: deptConstruction.id,
        designation: 'Senior Engineer', employmentType: 'full_time', dateOfJoining: dt('2023-03-15'),
        salary: 12000, status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        id: id(), userId: userSales.id, employeeId: 'EMP-002', departmentId: deptSales.id,
        designation: 'Sales Executive', employmentType: 'full_time', dateOfJoining: dt('2023-06-01'),
        salary: 8500, status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        id: id(), userId: userAccount.id, employeeId: 'EMP-003', departmentId: deptFinance.id,
        designation: 'Senior Accountant', employmentType: 'full_time', dateOfJoining: dt('2022-11-10'),
        salary: 10000, status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        id: id(), userId: userHr.id, employeeId: 'EMP-004', departmentId: deptHR.id,
        designation: 'HR Manager', employmentType: 'full_time', dateOfJoining: dt('2023-01-20'),
        salary: 9000, status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        id: id(), employeeId: 'EMP-005', departmentId: deptConstruction.id,
        designation: 'Site Supervisor', employmentType: 'full_time', dateOfJoining: dt('2024-02-01'),
        salary: 7500, status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        id: id(), employeeId: 'EMP-006', departmentId: deptAdmin.id,
        designation: 'Office Manager', employmentType: 'full_time', dateOfJoining: dt('2023-08-15'),
        salary: 6500, status: 'active',
      },
    }),
  ]);
  console.log(`Created ${employees.length} employees.`);

  // ─── Attendance ──────────────────────────────────────
  const attendanceRecords: { id: string; employeeId: string; date: Date; clockIn: Date | null; clockOut: Date | null; status: string }[] = [];
  for (const emp of employees) {
    for (let dayOffset = -5; dayOffset <= 0; dayOffset++) {
      const baseDate = d(dayOffset);
      const dayOfWeek = baseDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const clockIn = new Date(baseDate);
      clockIn.setHours(8, Math.floor(Math.random() * 15), 0, 0);
      const clockOut = new Date(baseDate);
      clockOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);

      attendanceRecords.push({
        id: id(),
        employeeId: emp.id,
        date: baseDate,
        clockIn,
        clockOut: dayOffset < 0 ? clockOut : null,
        status: dayOffset < 0 ? 'present' : 'present',
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceRecords });
  console.log(`Created ${attendanceRecords.length} attendance records.`);

  // ─── Payroll ─────────────────────────────────────────
  for (const emp of employees) {
    const basic = emp.salary;
    const allowances = Math.round(basic.toNumber() * 0.25);
    const deductions = Math.round(basic.toNumber() * 0.15);
    await prisma.payroll.create({
      data: {
        id: id(), employeeId: emp.id,
        periodStart: dt('2026-06-01'), periodEnd: dt('2026-06-30'),
        basicSalary: basic, allowances: allowances, deductions: deductions,
        netPay: basic.toNumber() + allowances - deductions,
        status: 'paid', paidDate: dt('2026-07-05'),
      },
    });
  }
  console.log('Created payroll for all employees.');

  // ─── Inventory Categories & Items ────────────────────
  const [catBuilding, catElectrical, catPlumbing, catFinishing] = await Promise.all([
    prisma.inventoryCategory.create({ data: { id: id(), name: 'Building Materials' } }),
    prisma.inventoryCategory.create({ data: { id: id(), name: 'Electrical' } }),
    prisma.inventoryCategory.create({ data: { id: id(), name: 'Plumbing' } }),
    prisma.inventoryCategory.create({ data: { id: id(), name: 'Finishing' } }),
  ]);
  console.log('Created 4 inventory categories.');

  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'BM-001', name: 'Portland Cement (50kg)', categoryId: catBuilding.id,
        unitOfMeasure: 'bag', minStock: 100, maxStock: 500, currentStock: 250, unitCost: 95, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'BM-002', name: 'Concrete Blocks (6")', categoryId: catBuilding.id,
        unitOfMeasure: 'piece', minStock: 500, maxStock: 2000, currentStock: 1200, unitCost: 8.5, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'EL-001', name: '2.5mm Twin & Earth Cable (100m)', categoryId: catElectrical.id,
        unitOfMeasure: 'roll', minStock: 20, maxStock: 80, currentStock: 45, unitCost: 320, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'EL-002', name: 'MCB Circuit Breaker 20A', categoryId: catElectrical.id,
        unitOfMeasure: 'piece', minStock: 30, maxStock: 120, currentStock: 75, unitCost: 45, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'PL-001', name: 'PVC Pipe 4" (6m)', categoryId: catPlumbing.id,
        unitOfMeasure: 'length', minStock: 50, maxStock: 200, currentStock: 120, unitCost: 65, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'PL-002', name: 'Ball Valve 1"', categoryId: catPlumbing.id,
        unitOfMeasure: 'piece', minStock: 20, maxStock: 80, currentStock: 50, unitCost: 35, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'FN-001', name: 'Ceramic Floor Tiles (60x60)', categoryId: catFinishing.id,
        unitOfMeasure: 'sqm', minStock: 100, maxStock: 500, currentStock: 300, unitCost: 45, isActive: true,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        id: id(), sku: 'FN-002', name: 'Emulsion Paint (20L)', categoryId: catFinishing.id,
        unitOfMeasure: 'gallon', minStock: 30, maxStock: 100, currentStock: 60, unitCost: 280, isActive: true,
      },
    }),
  ]);
  console.log(`Created ${inventoryItems.length} inventory items.`);

  // ─── Suppliers ───────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        id: id(), name: 'Adjaye Building Supplies', contactPerson: 'Samuel Adjaye',
        email: 'samuel@adjaye-supply.com', phone: '+233 27 567 8901',
        address: '12 Spintex Road, Accra', rating: 4.5, status: 'active',
      },
    }),
    prisma.supplier.create({
      data: {
        id: id(), name: 'Rahman Electrical Services', contactPerson: 'Abdul Rahman',
        email: 'abdul@rahman-electrical.com', phone: '+233 55 789 0123',
        address: '33 Osu Oxford Street, Accra', rating: 4.2, status: 'active',
      },
    }),
    prisma.supplier.create({
      data: {
        id: id(), name: 'Goldstar Plumbing', contactPerson: 'Emmanuel Tetteh',
        email: 'info@goldstarplumbing.com', phone: '+233 30 277 8899',
        address: '8 Nima Highway, Accra', rating: 3.8, status: 'active',
      },
    }),
    prisma.supplier.create({
      data: {
        id: id(), name: 'Paint Master Ghana', contactPerson: 'Grace Osei',
        email: 'sales@paintmastergh.com', phone: '+233 24 111 2233',
        address: '55 Madina Zongo Junction, Accra', rating: 4.0, status: 'active',
      },
    }),
  ]);
  console.log(`Created ${suppliers.length} suppliers.`);

  // ─── Purchase Orders ─────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: {
      id: id(), poNumber: 'PO-2026-001', supplierId: suppliers[0].id, projectId: prj1.id,
      orderDate: dt('2026-01-10'), expectedDelivery: dt('2026-01-25'),
      totalAmount: 48300, status: 'received', createdBy: userAccount.id,
    },
  });
  const po2 = await prisma.purchaseOrder.create({
    data: {
      id: id(), poNumber: 'PO-2026-002', supplierId: suppliers[1].id, projectId: prj1.id,
      orderDate: dt('2026-02-01'), expectedDelivery: dt('2026-02-20'),
      totalAmount: 21275, status: 'pending', createdBy: userAccount.id,
    },
  });
  await prisma.purchaseOrderItem.createMany({
    data: [
      { id: id(), poId: po1.id, itemId: inventoryItems[0].id, description: 'Portland Cement 50kg', quantity: 200, unitPrice: 95, amount: 19000, receivedQty: 200 },
      { id: id(), poId: po1.id, itemId: inventoryItems[1].id, description: 'Concrete Blocks 6"', quantity: 2000, unitPrice: 8.5, amount: 17000, receivedQty: 2000 },
      { id: id(), poId: po1.id, description: 'Steel Rebar 12mm (tons)', quantity: 5, unitPrice: 2460, amount: 12300, receivedQty: 5 },
      { id: id(), poId: po2.id, itemId: inventoryItems[2].id, description: '2.5mm Cable 100m rolls', quantity: 30, unitPrice: 320, amount: 9600, receivedQty: 0 },
      { id: id(), poId: po2.id, itemId: inventoryItems[3].id, description: 'MCB Breaker 20A', quantity: 50, unitPrice: 45, amount: 2250, receivedQty: 0 },
      { id: id(), poId: po2.id, description: 'Switch sockets', quantity: 100, unitPrice: 94.25, amount: 9425, receivedQty: 0 },
    ],
  });
  console.log('Created 2 purchase orders with items.');

  // ─── Warehouses ──────────────────────────────────────
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { id: id(), name: 'Main Warehouse', address: '15 Tema Industrial Area', status: 'active' } }),
    prisma.warehouse.create({ data: { id: id(), name: 'Site Storage - PRJ-001', address: 'East Legon Construction Site', status: 'active' } }),
  ]);
  const stockData = [
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[0].id, quantity: 150 },
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[1].id, quantity: 800 },
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[2].id, quantity: 30 },
    { id: id(), warehouseId: warehouses[1].id, itemId: inventoryItems[0].id, quantity: 100 },
    { id: id(), warehouseId: warehouses[1].id, itemId: inventoryItems[1].id, quantity: 400 },
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[4].id, quantity: 80 },
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[6].id, quantity: 200 },
    { id: id(), warehouseId: warehouses[0].id, itemId: inventoryItems[7].id, quantity: 40 },
  ];
  await prisma.warehouseStock.createMany({ data: stockData });
  console.log(`Created ${warehouses.length} warehouses with ${stockData.length} stock records.`);

  // ─── Assets ──────────────────────────────────────────
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        id: id(), name: 'CAT 320 Excavator', assetCode: 'AST-001', category: 'Heavy Equipment',
        purchaseDate: dt('2023-06-15'), purchasePrice: 185000, currentValue: 145000,
        status: 'active', location: 'Sunrise Villa Site', insuranceExpiry: dt('2026-12-15'),
      },
    }),
    prisma.asset.create({
      data: {
        id: id(), name: 'Toyota Hilux (GB-1234-24)', assetCode: 'AST-002', category: 'Vehicle',
        purchaseDate: dt('2024-01-10'), purchasePrice: 45000, currentValue: 38000,
        status: 'active', location: 'Head Office', insuranceExpiry: dt('2026-12-10'),
      },
    }),
    prisma.asset.create({
      data: {
        id: id(), name: 'JCB Backhoe Loader', assetCode: 'AST-003', category: 'Heavy Equipment',
        purchaseDate: dt('2022-03-20'), purchasePrice: 120000, currentValue: 75000,
        status: 'maintenance', location: 'Workshop', insuranceExpiry: dt('2026-12-20'),
      },
    }),
  ]);
  console.log(`Created ${assets.length} assets.`);

  await prisma.maintenanceRecord.createMany({
    data: [
      { id: id(), assetId: assets[0].id, type: 'scheduled', description: '6-month service - oil change, filter replacement', cost: 2500, performedAt: dt('2024-12-15') },
      { id: id(), assetId: assets[2].id, type: 'repair', description: 'Hydraulic hose replacement and bucket repair', cost: 8500, performedAt: dt('2025-02-20') },
    ],
  });
  console.log('Created maintenance records.');

  // ─── Notifications ───────────────────────────────────
  const notifications = [
    { id: id(), userId: userAdmin.id, type: 'alert', title: 'System Update Available', message: 'A new system update is available for installation.', isRead: false },
    { id: id(), userId: userManager.id, type: 'reminder', title: 'Milestone Deadline Approaching', message: 'Architectural Design milestone for PRJ-005 is due on July 31.', isRead: false },
    { id: id(), userId: userAccount.id, type: 'alert', title: 'Overdue Invoice', message: 'INV-2026-004 is overdue. Please follow up with vendor.', isRead: false },
    { id: id(), userId: userEngineer.id, type: 'task', title: 'Task Assignment', message: 'You have been assigned "Electrical wiring first floor" on PRJ-001.', isRead: true },
    { id: id(), userId: userSales.id, type: 'reminder', title: 'Appointment Tomorrow', message: 'Property Viewing - Ocean View Apt 12C with Nana Asante at 10:00 AM.', isRead: false },
  ];
  await prisma.notification.createMany({ data: notifications });
  console.log(`Created ${notifications.length} notifications.`);

  // ─── Branches ────────────────────────────────────────
  const branches = await Promise.all([
    prisma.branch.create({
      data: { id: id(), name: 'Head Office - Accra', code: 'ACC-HQ', address: '123 Independence Ave', city: 'Accra', phone: '+233 30 277 1234', email: 'accra@buildprop.com', manager: 'James Anderson', status: 'active' },
    }),
    prisma.branch.create({
      data: { id: id(), name: 'Kumasi Office', code: 'KMS-001', address: '789 Adum Road', city: 'Kumasi', phone: '+233 32 208 5678', email: 'kumasi@buildprop.com', manager: 'David Kim', status: 'active' },
    }),
    prisma.branch.create({
      data: { id: id(), name: 'Takoradi Site', code: 'TKD-001', address: '321 Market Circle', city: 'Takoradi', phone: '+233 31 202 9012', email: 'takoradi@buildprop.com', manager: 'Sarah Williams', status: 'active' },
    }),
  ]);
  const [branchAccra, branchKumasi, branchTakoradi] = branches;
  console.log(`Created ${branches.length} branches.`);

  // ─── Vehicles ────────────────────────────────────────
  await prisma.vehicle.createMany({
    data: [
      { id: id(), name: 'Toyota Hilux', make: 'Toyota', model: 'Hilux', year: 2024, licensePlate: 'GR-1234', status: 'active', fuelType: 'diesel', mileage: 45230, branchId: branchAccra.id },
      { id: id(), name: 'Ford Ranger', make: 'Ford', model: 'Ranger', year: 2023, licensePlate: 'GR-5678', status: 'active', fuelType: 'diesel', mileage: 32100, branchId: branchAccra.id },
      { id: id(), name: 'Hyundai Elantra', make: 'Hyundai', model: 'Elantra', year: 2022, licensePlate: 'GR-9012', status: 'maintenance', fuelType: 'petrol', mileage: 28450, branchId: branchKumasi.id },
      { id: id(), name: 'Nissan NP300', make: 'Nissan', model: 'NP300', year: 2024, licensePlate: 'GR-3456', status: 'active', fuelType: 'diesel', mileage: 15800, branchId: branchTakoradi.id },
      { id: id(), name: 'Kia Morning', make: 'Kia', model: 'Morning', year: 2019, licensePlate: 'GR-2345', status: 'retired', fuelType: 'petrol', mileage: 98120, branchId: branchAccra.id },
    ],
  });
  console.log('Created 5 vehicles.');

  // ─── Contracts ───────────────────────────────────────
  await prisma.contract.createMany({
    data: [
      { id: id(), title: 'Main Contractor Agreement', type: 'vendor', partyName: 'BuildRight Construction', value: 850000, status: 'active', startDate: '2025-01-01', endDate: '2026-12-31', branchId: branchAccra.id, notes: 'Primary construction contract for Sunrise Villa Phase 2' },
      { id: id(), title: 'Subcontractor — Plumbing', type: 'vendor', partyName: 'PlumbPro Ghana', value: 120000, status: 'active', startDate: '2025-02-01', endDate: '2026-08-15', branchId: branchAccra.id, notes: null },
      { id: id(), title: 'Land Lease Agreement', type: 'lease', partyName: 'Estate Developers Ltd', value: 240000, status: 'active', startDate: '2024-01-01', endDate: '2028-12-31', branchId: branchKumasi.id, notes: '5-year lease for Kumasi office premises' },
      { id: id(), title: 'Equipment Rental Contract', type: 'service', partyName: 'HeavyMach Rentals', value: 48000, status: 'pending', startDate: '2025-01-15', endDate: '2025-07-30', branchId: branchTakoradi.id, notes: 'Expiring soon — renewal under review' },
    ],
  });
  console.log('Created 4 contracts.');

  // ─── Compliance Items ────────────────────────────────
  await prisma.complianceItem.createMany({
    data: [
      { id: id(), title: 'Building Permit for Sunrise Villa Phase 2', description: 'Approved by AMA', category: 'regulatory', status: 'compliant', dueDate: '2026-12-30', completedDate: '2026-03-15', assignedTo: 'James Anderson' },
      { id: id(), title: 'Environmental Impact Assessment (EIA)', description: 'Required for all residential projects above 20 units', category: 'environmental', status: 'compliant', dueDate: '2026-09-30', completedDate: '2026-01-20', assignedTo: 'Lisa Engineer' },
      { id: id(), title: 'Occupancy Certificate — Green Park', description: 'Final inspection required before handover', category: 'safety', status: 'compliant', dueDate: '2026-08-28', completedDate: '2026-06-20', assignedTo: 'David Kim' },
      { id: id(), title: 'Electrical Installation Permit', description: 'Pending inspection from ECG', category: 'safety', status: 'pending', dueDate: '2026-08-15', completedDate: null, assignedTo: 'Lisa Engineer' },
      { id: id(), title: 'Fire Safety Inspection Report', description: 'Annual fire safety compliance', category: 'safety', status: 'compliant', dueDate: '2026-12-31', completedDate: '2026-01-10', assignedTo: 'Sarah Williams' },
      { id: id(), title: 'Structural Engineering Certification', description: 'Required before superstructure begins on PRJ-003', category: 'regulatory', status: 'overdue', dueDate: '2026-08-15', completedDate: null, assignedTo: 'Lisa Engineer' },
    ],
  });
  console.log('Created 6 compliance items.');

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
