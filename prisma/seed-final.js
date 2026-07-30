const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
function uid() { return crypto.randomUUID(); }
async function main() {
  const roles = await Promise.all([
    prisma.role.create({ data: { id: uid(), name: "Super Admin" } }),
    prisma.role.create({ data: { id: uid(), name: "Manager" } }),
    prisma.role.create({ data: { id: uid(), name: "Accountant" } }),
    prisma.role.create({ data: { id: uid(), name: "Engineer" } }),
    prisma.role.create({ data: { id: uid(), name: "Sales Executive" } }),
    prisma.role.create({ data: { id: uid(), name: "HR Manager" } }),
    prisma.role.create({ data: { id: uid(), name: "Viewer" } }),
  ]);
  const pw = "8a678169f3b29d5ae931bb723e4f690bb744a4a53d57823ab46a9b45ad12a149:7dccbf655668ca8b1771b0a5a6328175a79a2c71091fb6982c75591e50744ed5a7feaa3a0e25a6cd85aaacf174035961cc433f5afb29954587a98a9bded50214";
  const users = [];
  for (const u of [
    { e: "admin@buildprop.com", f: "John", l: "Agyapong", r: 0 },
    { e: "manager@buildprop.com", f: "Sarah", l: "Mensah", r: 1 },
    { e: "account@buildprop.com", f: "Mike", l: "Asare", r: 2 },
    { e: "engineer@buildprop.com", f: "Lisa", l: "Ofori", r: 3 },
    { e: "sales@buildprop.com", f: "Kwame", l: "Nkrumah", r: 4 },
    { e: "hr@buildprop.com", f: "Ama", l: "Darkoa", r: 5 },
  ]) { users.push(await prisma.user.create({ data: { id: uid(), email: u.e, passwordHash: pw, firstName: u.f, lastName: u.l, roleId: roles[u.r].id } })); }

  const depts = await Promise.all([
    prisma.department.create({ data: { id: uid(), name: "Executive", code: "EXEC" } }),
    prisma.department.create({ data: { id: uid(), name: "Engineering", code: "ENG" } }),
    prisma.department.create({ data: { id: uid(), name: "Finance", code: "FIN" } }),
    prisma.department.create({ data: { id: uid(), name: "Sales", code: "SALES" } }),
    prisma.department.create({ data: { id: uid(), name: "HR", code: "HR" } }),
  ]);

  for (const e of [
    { u: 0, ei: "EMP-001", d: "CEO", s: 35000, dep: 0 },
    { u: 1, ei: "EMP-002", d: "Operations Manager", s: 22000, dep: 0 },
    { u: 2, ei: "EMP-003", d: "Accountant", s: 18000, dep: 2 },
    { u: 3, ei: "EMP-004", d: "Senior Engineer", s: 20000, dep: 1 },
    { u: 4, ei: "EMP-005", d: "Sales Executive", s: 15000, dep: 3 },
    { u: 5, ei: "EMP-006", d: "HR Manager", s: 16000, dep: 4 },
    { u: -1, ei: "EMP-007", d: "Site Supervisor", s: 12000, dep: 1 },
  ]) {
    await prisma.employee.create({ data: { id: uid(), userId: e.u >= 0 ? users[e.u].id : null, employeeId: e.ei, designation: e.d, salary: e.s, employmentType: "full_time", dateOfJoining: new Date("2024-01-01"), status: "active", departmentId: depts[e.dep].id } });
  }

  await Promise.all([
    prisma.branch.create({ data: { id: uid(), name: "Accra HQ", code: "HQ", city: "Accra", address: "Airport City", isActive: true } }),
    prisma.branch.create({ data: { id: uid(), name: "Kumasi Office", code: "KUM", city: "Kumasi", address: "Adum", isActive: true } }),
    prisma.branch.create({ data: { id: uid(), name: "Takoradi Office", code: "TAK", city: "Takoradi", address: "Harbour Road", isActive: true } }),
  ]);

  const projects = await Promise.all([
    prisma.project.create({ data: { id: uid(), name: "Green Park Residences", code: "GPR-01", projectType: "residential", status: "completed", priority: "high", estimatedBudget: 3200000, actualCost: 2980000, completionPercentage: 100, startDate: new Date("2024-06-01"), city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Ocean View Estates", code: "OVE-01", projectType: "residential", status: "in_progress", priority: "high", estimatedBudget: 5800000, actualCost: 2450000, completionPercentage: 42, startDate: new Date("2025-01-15"), city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Sunrise Villa Phase 2", code: "SVP-02", projectType: "residential", status: "in_progress", priority: "high", estimatedBudget: 4200000, actualCost: 2850000, completionPercentage: 68, startDate: new Date("2025-03-01"), city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Downtown Plaza", code: "DTP-01", projectType: "commercial", status: "planning", priority: "medium", estimatedBudget: 7500000, completionPercentage: 15, startDate: new Date("2026-01-01"), city: "Accra" } }),
    prisma.project.create({ data: { id: uid(), name: "Riverside Gardens", code: "RSG-01", projectType: "residential", status: "planning", priority: "medium", estimatedBudget: 1900000, completionPercentage: 5, startDate: new Date("2026-04-01"), city: "Accra" } }),
  ]);

  const properties = await Promise.all([
    prisma.property.create({ data: { id: uid(), name: "East Legon Executive Duplex", propertyType: "house", price: 850000, bedrooms: 4, bathrooms: 3, area: 350, status: "available", city: "Accra" } }),
    prisma.property.create({ data: { id: uid(), name: "Airport City Penthouse", propertyType: "apartment", price: 1200000, bedrooms: 3, bathrooms: 2, area: 220, status: "available", city: "Accra" } }),
    prisma.property.create({ data: { id: uid(), name: "Ridge Royal Villa", propertyType: "villa", price: 1500000, bedrooms: 5, bathrooms: 4, area: 500, status: "available", city: "Accra" } }),
    prisma.property.create({ data: { id: uid(), name: "Kumasi Apartment", propertyType: "apartment", price: 350000, bedrooms: 2, bathrooms: 2, area: 120, status: "available", city: "Kumasi" } }),
    prisma.property.create({ data: { id: uid(), name: "Takoradi Beach House", propertyType: "house", price: 680000, bedrooms: 4, bathrooms: 3, area: 280, status: "available", city: "Takoradi" } }),
    prisma.property.create({ data: { id: uid(), name: "Cantonments Land", propertyType: "land", price: 450000, status: "available", city: "Accra", area: 0 } }),
  ]);

  const contacts = await Promise.all([
    prisma.contact.create({ data: { id: uid(), firstName: "Esi", lastName: "Mensah", email: "esi@email.com", type: "lead" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Yaw", lastName: "Asante", email: "yaw@email.com", type: "lead" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Nana", lastName: "Akuffo", email: "nana@email.com", type: "buyer" } }),
    prisma.contact.create({ data: { id: uid(), firstName: "Kojo", lastName: "Boateng", email: "kojo@email.com", type: "lead" } }),
  ]);

  for (const f of [
    { t: "income", c: "project_revenue", d: "Green Park completion", a: 975000, dt: "2026-01-15" },
    { t: "income", c: "project_revenue", d: "Ocean View milestone", a: 500000, dt: "2026-02-28" },
    { t: "expense", c: "materials", d: "Steel Ocean View", a: 285000, dt: "2026-02-10" },
    { t: "expense", c: "labour", d: "Site workers Jan", a: 95000, dt: "2026-01-31" },
    { t: "income", c: "deposit", d: "Ridge Villa deposit", a: 150000, dt: "2026-03-20" },
  ]) {
    await prisma.finance.create({ data: { id: uid(), type: f.t, category: f.c, description: f.d, totalAmount: f.a, transactionDate: new Date(f.dt) } });
  }

  for (const inv of [
    { i: "INV-2026-001", amt: 975000, paid: 975000, st: "paid", dd: "2026-02-14" },
    { i: "INV-2026-002", amt: 150000, paid: 150000, st: "paid", dd: "2026-04-19" },
    { i: "INV-2026-003", amt: 402500, paid: 0, st: "sent", dd: "2026-05-31" },
    { i: "INV-2026-004", amt: 21275, paid: 0, st: "overdue", dd: "2026-06-14" },
  ]) {
    await prisma.invoice.create({
      data: { id: uid(), contactId: contacts[0].id, invoiceNumber: inv.i, issueDate: new Date("2026-01-01"), dueDate: new Date(inv.dd), status: inv.st, totalAmount: inv.amt, paidAmount: inv.paid, items: { create: [{ description: "Service", quantity: 1, unitPrice: inv.amt, amount: inv.amt }] } },
    });
  }

  for (const t of [
    { ti: "Foundation pour Ocean View", s: "in_progress", p: "critical", d: "2026-08-14", pi: 1 },
    { ti: "Structural survey Sunrise Villa", s: "todo", p: "high", d: "2026-08-07", pi: 2 },
    { ti: "Monthly progress report", s: "in_progress", p: "high", d: "2026-08-05", pi: 1 },
    { ti: "Permit application Downtown Plaza", s: "todo", p: "medium", d: "2026-08-21", pi: 3 },
    { ti: "Review contractor bids", s: "completed", p: "medium", d: "2026-07-30", pi: 3 },
  ]) {
    await prisma.projectTask.create({ data: { id: uid(), title: t.ti, status: t.s, priority: t.p, dueDate: new Date(t.d), projectId: projects[t.pi].id } });
  }

  for (const i of [
    { n: "Cement 50kg", c: "materials", s: 450, m: 100, u: "bags", p: 65 },
    { n: "Steel Bars 12mm", c: "materials", s: 320, m: 80, u: "pieces", p: 45 },
    { n: "Floor Tiles 60x60cm", c: "finishing", s: 250, m: 50, u: "boxes", p: 95 },
  ]) {
    await prisma.inventory.create({ data: { id: uid(), name: i.n, category: i.c, currentStock: i.s, minimumStock: i.m, unitOfMeasure: i.u, unitPrice: i.p, totalValue: i.s * i.p } });
  }

  await prisma.settings.create({ data: { id: uid(), companyName: "BuildProp Ghana Ltd", currency: "GHS", taxRate: 15, dateFormat: "DD/MM/YYYY", timezone: "Africa/Accra", phone: "+233 30 200 1000" } });
  console.log("Database seeded!");
}
main().then(() => { prisma.$disconnect(); }).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });