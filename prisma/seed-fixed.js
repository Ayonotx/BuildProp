const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
function uid() { return crypto.randomUUID(); }
async function main() {
  console.log("?? Seeding BuildProp Ghana\n");
  // Roles
  const roles = await Promise.all([
    prisma.role.create({ data: { id: uid(), name: "Super Admin", description: "Full access" } }),
    prisma.role.create({ data: { id: uid(), name: "Manager", description: "Management" } }),
    prisma.role.create({ data: { id: uid(), name: "Accountant", description: "Finance" } }),
    prisma.role.create({ data: { id: uid(), name: "Engineer", description: "Engineering" } }),
    prisma.role.create({ data: { id: uid(), name: "Sales Executive", description: "Sales" } }),
    prisma.role.create({ data: { id: uid(), name: "HR Manager", description: "HR" } }),
    prisma.role.create({ data: { id: uid(), name: "Viewer", description: "Read-only" } }),
  ]);
  console.log("  Roles: " + roles.length);

  // Users with demo123 passwords
  
  const pw = "8a678169f3b29d5ae931bb723e4f690bb744a4a53d57823ab46a9b45ad12a149:7dccbf655668ca8b1771b0a5a6328175a79a2c71091fb6982c75591e50744ed5a7feaa3a0e25a6cd85aaacf174035961cc433f5afb29954587a98a9bded50214";
  const userData = [
    { e: "admin@buildprop.com", f: "John", l: "Agyapong", r: "Super Admin" },
    { e: "manager@buildprop.com", f: "Sarah", l: "Mensah", r: "Manager" },
    { e: "account@buildprop.com", f: "Mike", l: "Asare", r: "Accountant" },
    { e: "engineer@buildprop.com", f: "Lisa", l: "Ofori", r: "Engineer" },
    { e: "sales@buildprop.com", f: "Kwame", l: "Nkrumah", r: "Sales Executive" },
    { e: "hr@buildprop.com", f: "Ama", l: "Darkoa", r: "HR Manager" },
  ];
  const users = [];
  for (const u of userData) {
    users.push(await prisma.user.create({
      data: { id: uid(), email: u.e, passwordHash: pw, firstName: u.f, lastName: u.l, roleId: roles.find(r => r.name === u.r).id },
    }));
  }
  console.log("  Users: " + users.length);

  // Departments
  const depts = await Promise.all([
    prisma.department.create({ data: { id: uid(), name: "Executive", code: "EXEC" } }),
    prisma.department.create({ data: { id: uid(), name: "Engineering", code: "ENG" } }),
    prisma.department.create({ data: { id: uid(), name: "Finance", code: "FIN" } }),
    prisma.department.create({ data: { id: uid(), name: "Sales", code: "SALES" } }),
    prisma.department.create({ data: { id: uid(), name: "Human Resources", code: "HR" } }),
  ]);
  console.log("  Departments: " + depts.length);

  // Employees
  const empData = [
    { uid: users[0].id, eid: "EMP-001", des: "CEO", sal: 35000, dep: 0 },
    { uid: users[1].id, eid: "EMP-002", des: "Operations Manager", sal: 22000, dep: 0 },
    { uid: users[2].id, eid: "EMP-003", des: "Senior Accountant", sal: 18000, dep: 2 },
    { uid: users[3].id, eid: "EMP-004", des: "Senior Engineer", sal: 20000, dep: 1 },
    { uid: users[4].id, eid: "EMP-005", des: "Sales Executive", sal: 15000, dep: 3 },
    { uid: users[5].id, eid: "EMP-006", des: "HR Manager", sal: 16000, dep: 4 },
    { uid: null, eid: "EMP-007", des: "Site Supervisor", sal: 12000, dep: 1 },
    { uid: null, eid: "EMP-008", des: "Junior Engineer", sal: 9000, dep: 1 },
  ];
  for (const e of empData) {
    await prisma.employee.create({
      data: { id: uid(), userId: e.uid, employeeId: e.eid, designation: e.des, salary: e.sal, employmentType: "full_time", dateOfJoining: "2024-01-01", status: "active", departmentId: depts[e.dep].id },
    });
  }
  console.log("  Employees: " + empData.length);

  // Branches
  await Promise.all([
    prisma.branch.create({ data: { id: uid(), name: "Accra HQ", code: "HQ", city: "Accra", isActive: true } }),
    prisma.branch.create({ data: { id: uid(), name: "Kumasi Office", code: "KUM", city: "Kumasi", isActive: true } }),
    prisma.branch.create({ data: { id: uid(), name: "Takoradi Office", code: "TAK", city: "Takoradi", isActive: true } }),
  ]);

  // Projects
  const projects = await Promise.all([
    prisma.project.create({ data: { id: uid(), name: "Green Park Residences", code: "GPR-01", projectType: "residential", status: "completed", priority: "high", estimatedBudget: 3200000, actualCost: 2980000, completionPercentage: 100, description: "Luxury 24-unit complex in East Legon", startDate: "2024-06-01", city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Ocean View Estates", code: "OVE-01", projectType: "residential", status: "in_progress", priority: "high", estimatedBudget: 5800000, actualCost: 2450000, completionPercentage: 42, description: "Waterfront villa development — 18 units", startDate: "2025-01-15", city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Sunrise Villa Phase 2", code: "SVP-02", projectType: "residential", status: "in_progress", priority: "high", estimatedBudget: 4200000, actualCost: 2850000, completionPercentage: 68, description: "12 premium townhouses", startDate: "2025-03-01", city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Downtown Plaza", code: "DTP-01", projectType: "commercial", status: "planning", priority: "medium", estimatedBudget: 7500000, completionPercentage: 15, description: "Mixed-use commercial complex", startDate: "2026-01-01", city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Hilltop Commercial Center", code: "HCC-01", projectType: "commercial", status: "on_hold", priority: "low", estimatedBudget: 2800000, actualCost: 700000, completionPercentage: 25, description: "Office complex — pending permits", startDate: "2025-08-01", city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Riverside Gardens", code: "RSG-01", projectType: "residential", status: "planning", priority: "medium", estimatedBudget: 1900000, completionPercentage: 5, description: "Affordable housing 40-unit estate", startDate: "2026-04-01", city: "Accra" } }),
  ]);
  console.log("  Projects: " + projects.length);

  // Properties
  const properties = await Promise.all([
    prisma.property.create({ data: { id: uid(), name: "East Legon Executive Duplex", propertyType: "house", price: 850000, bedrooms: 4, bathrooms: 3, area: 350, status: "available", city: "Accra", description: "Modern 4-bedroom duplex with pool" } }),
    prisma.property.create({ data: { id: uid(), name: "Airport City Penthouse", propertyType: "apartment", price: 1200000, bedrooms: 3, bathrooms: 2, area: 220, status: "available", city: "Accra", description: "Luxury penthouse with city views" } }),
    prisma.property.create({ data: { id: uid(), name: "Ridge Royal Villa", propertyType: "villa", price: 1500000, bedrooms: 5, bathrooms: 4, area: 500, status: "available", city: "Accra", description: "Stunning 5-bedroom villa with pool" } }),
    prisma.property.create({ data: { id: uid(), name: "Kumasi Apartment", propertyType: "apartment", price: 350000, bedrooms: 2, bathrooms: 2, area: 120, status: "available", city: "Kumasi", description: "Modern 2-bedroom in prime area" } }),
    prisma.property.create({ data: { id: uid(), name: "Takoradi Beach House", propertyType: "house", price: 680000, bedrooms: 4, bathrooms: 3, area: 280, status: "available", city: "Takoradi", description: "Beachfront property" } }),
    prisma.property.create({ data: { id: uid(), name: "Tema Warehouse", propertyType: "commercial", price: 920000, status: "sold", city: "Tema", description: "Large warehouse with loading bay", area: 1500 } }),
    prisma.property.create({ data: { id: uid(), name: "Cantonments Land", propertyType: "land", price: 450000, status: "available", city: "Accra", description: "Prime building plot", area: 0 } }),
  ]);
  console.log("  Properties: " + properties.length);

  // Contacts
  const contacts = await Promise.all([
    prisma.contact.create({ data: { id: uid(), firstName: "Esi", lastName: "Mensah", email: "esi.mensah@email.com", phone: "+233 24 555 0101", type: "lead", source: "Website" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Yaw", lastName: "Asante", email: "yaw.asante@email.com", phone: "+233 24 555 0102", type: "lead", source: "Referral" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Nana", lastName: "Akuffo", email: "nana.akuffo@email.com", phone: "+233 24 555 0103", type: "buyer", source: "Open House" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Akua", lastName: "Mensah", email: "akua.m@email.com", phone: "+233 24 555 0104", type: "lead", source: "Social Media" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Kojo", lastName: "Boateng", email: "kojo.b@email.com", phone: "+233 20 444 0505", type: "lead", source: "Referral" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Abena", lastName: "Osei", email: "abena.osei@email.com", phone: "+233 24 666 0707", type: "buyer", source: "Agent Referral" } }),
  ]);
  console.log("  Contacts: " + contacts.length);

  // Finance
  for (const f of [
    { t: "income", c: "project_revenue", d: "Green Park completion", a: 975000, dt: "2026-01-15" },
    { t: "income", c: "project_revenue", d: "Ocean View milestone", a: 500000, dt: "2026-02-28" },
    { t: "expense", c: "materials", d: "Steel — Ocean View", a: 285000, dt: "2026-02-10" },
    { t: "expense", c: "labour", d: "Site workers Jan", a: 95000, dt: "2026-01-31" },
    { t: "expense", c: "materials", d: "Cement — Sunrise", a: 180000, dt: "2026-03-05" },
    { t: "income", c: "deposit", d: "Ridge Villa deposit", a: 150000, dt: "2026-03-20" },
    { t: "expense", c: "labour", d: "Electricians — Sunrise", a: 72000, dt: "2026-03-28" },
    { t: "expense", c: "utilities", d: "Office utilities Q1", a: 18500, dt: "2026-04-01" },
    { t: "expense", c: "professional_fees", d: "Consultancy — Plaza", a: 45000, dt: "2026-04-15" },
    { t: "income", c: "project_revenue", d: "Sunrise drawdown", a: 375000, dt: "2026-05-10" },
  ]) {
    await prisma.finance.create({ data: { id: uid(), type: f.t, category: f.c, description: f.d, totalAmount: f.a, transactionDate: f.dt } });
  }
  console.log("  Finance: 10 records");

  // Invoices
  for (const inv of [
    { i: "INV-2026-001", amt: 975000, paid: 975000, st: "paid", dd: "2026-02-14" },
    { i: "INV-2026-002", amt: 150000, paid: 150000, st: "paid", dd: "2026-04-19" },
    { i: "INV-2026-003", amt: 402500, paid: 0, st: "sent", dd: "2026-05-31" },
    { i: "INV-2026-004", amt: 21275, paid: 0, st: "overdue", dd: "2026-06-14" },
    { i: "INV-2026-005", amt: 598000, paid: 0, st: "sent", dd: "2026-07-01" },
    { i: "INV-2026-006", amt: 125000, paid: 0, st: "overdue", dd: "2026-07-31" },
  ]) {
    await prisma.invoice.create({
      data: { id: uid(), contactId: contacts[0].id, invoiceNumber: inv.i, issueDate: "2026-01-01", dueDate: inv.dd, status: inv.st, totalAmount: inv.amt, paidAmount: inv.paid, items: { create: [{ description: "Service", quantity: 1, unitPrice: inv.amt, amount: inv.amt }] } },
    });
  }
  console.log("  Invoices: 6");

  // Tasks
  for (const t of [
    { ti: "Foundation pour — Ocean View Block B", s: "in_progress", p: "critical", d: "2026-08-14", pi: 1 },
    { ti: "Review structural survey — Sunrise Villa roof", s: "todo", p: "high", d: "2026-08-07", pi: 2 },
    { ti: "Order plumbing fixtures — Sunrise Villa", s: "todo", p: "high", d: "2026-08-10", pi: 2 },
    { ti: "Monthly progress report — Ocean View", s: "in_progress", p: "high", d: "2026-08-05", pi: 1 },
    { ti: "Permit application — Downtown Plaza", s: "todo", p: "medium", d: "2026-08-21", pi: 3 },
    { ti: "Site inspection — Ocean View waterproofing", s: "todo", p: "high", d: "2026-08-05", pi: 1 },
    { ti: "Review contractor bids — Downtown Plaza", s: "completed", p: "medium", d: "2026-07-30", pi: 3 },
    { ti: "Approve material tests — Sunrise Villa", s: "todo", p: "medium", d: "2026-08-12", pi: 2 },
    { ti: "Update project schedule — Ocean View", s: "in_progress", p: "medium", d: "2026-08-06", pi: 1 },
    { ti: "Site handover docs — Green Park", s: "completed", p: "low", d: "2026-07-15", pi: 0 },
  ]) {
    await prisma.projectTask.create({ data: { id: uid(), title: t.ti, status: t.s, priority: t.p, dueDate: t.d, projectId: projects[t.pi].id } });
  }
  console.log("  Tasks: 10");

  // Inventory
  for (const i of [
    { n: "Cement (50kg)", c: "materials", s: 450, m: 100, u: "bags", p: 65 },
    { n: "Steel Bars (12mm)", c: "materials", s: 320, m: 80, u: "pieces", p: 45 },
    { n: "Red Clay Bricks", c: "materials", s: 12000, m: 2000, u: "pieces", p: 0.85 },
    { n: "PVC Pipes (4inch)", c: "plumbing", s: 85, m: 30, u: "lengths", p: 120 },
    { n: "Electrical Cable 2.5mm", c: "electrical", s: 45, m: 20, u: "rolls", p: 380 },
    { n: "Floor Tiles 60x60cm", c: "finishing", s: 250, m: 50, u: "boxes", p: 95 },
    { n: "Emulsion Paint 20L", c: "finishing", s: 38, m: 15, u: "gallons", p: 280 },
  ]) {
    await prisma.inventory.create({ data: { id: uid(), name: i.n, category: i.c, currentStock: i.s, minimumStock: i.m, unitOfMeasure: i.u, unitPrice: i.p, totalValue: i.s * i.p } });
  }
  console.log("  Inventory: 7 items");

  // Fleet
  for (const f of [
    { v: "GR-1420-24", mk: "Toyota", md: "Hilux", yr: 2024, tp: "pickup", ft: "diesel", as: "Site Ops" },
    { v: "GR-1520-24", mk: "Isuzu", md: "D-Max", yr: 2024, tp: "pickup", ft: "diesel", as: "Engineering" },
    { v: "GR-1620-24", mk: "Nissan", md: "Navara", yr: 2023, tp: "pickup", ft: "diesel", as: "Project Mgmt" },
    { v: "GR-1720-24", mk: "Toyota", md: "Hiace", yr: 2024, tp: "bus", ft: "diesel", as: "Staff Transport" },
    { v: "GR-1820-24", mk: "Mercedes", md: "Sprinter", yr: 2023, tp: "van", ft: "diesel", as: "Executive" },
  ]) {
    await prisma.fleet.create({ data: { id: uid(), vehicleNumber: f.v, make: f.mk, model: f.md, year: f.yr, type: f.tp, fuelType: f.ft, registrationDate: "2024-01-01", status: "active", assignee: f.as } });
  }
  console.log("  Fleet: 5 vehicles");

  // Suppliers + PO
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { id: uid(), name: "Ghana Cement Works", phone: "+233 30 222 1000", category: "Materials" } }),
    prisma.supplier.create({ data: { id: uid(), name: "Steel Africa Ghana", phone: "+233 30 222 2000", category: "Steel" } }),
    prisma.supplier.create({ data: { id: uid(), name: "Builders Warehouse", phone: "+233 30 222 3000", category: "General" } }),
  ]);
  await prisma.purchaseOrder.create({ data: { id: uid(), poNumber: "PO-2026-001", supplierId: suppliers[0].id, orderDate: "2026-07-15", status: "approved", totalAmount: 32500, items: { create: [{ description: "Cement 42.5R", quantity: 500, unitPrice: 65, total: 32500 }] } } });
  console.log("  Suppliers: 3 + 1 PO");

  // Calendar
  for (const e of [
    { t: "Weekly Project Review", tp: "meeting", s: "2026-08-03T09:00:00Z", e: "2026-08-03T10:30:00Z" },
    { t: "Board Meeting Q3", tp: "meeting", s: "2026-08-15T10:00:00Z", e: "2026-08-15T12:00:00Z" },
    { t: "Ocean View Site Inspection", tp: "site_visit", s: "2026-08-05T08:00:00Z", e: "2026-08-05T11:00:00Z" },
    { t: "Staff Safety Training", tp: "training", s: "2026-08-12T09:00:00Z", e: "2026-08-12T16:00:00Z" },
  ]) {
    await prisma.calendar.create({ data: { id: uid(), title: e.t, type: e.tp, startTime: new Date(e.s), endTime: new Date(e.e) } });
  }
  console.log("  Calendar: 4 events");

  // Settings
  await prisma.settings.create({ data: { id: uid(), companyName: "BuildProp Ghana Ltd", currency: "GHS", taxRate: 15, dateFormat: "DD/MM/YYYY", timezone: "Africa/Accra", phone: "+233 30 200 1000", email: "info@buildprop.com" } });
  console.log("\n? Database seeded! Password for all: demo123");
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });