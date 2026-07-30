# BuildProp - Construction & Real Estate Management System

A comprehensive administrative management system for construction firms and real estate companies.

## Quick Start

### Option 1: Easy Launch (Recommended)
Double-click `start-app.bat` to launch the application.

### Option 2: Manual Launch
```bash
npm install
npm run dev
```
Then open http://localhost:3000

### Option 3: Desktop App (EXE)
```bash
build-desktop.bat
```
This creates an installer in the `dist-electron` folder.

## Features

- **Dashboard** - Business overview with KPIs and charts
- **Project Management** - Track construction projects, milestones, tasks
- **Property Management** - Real estate inventory, status tracking
- **Land Records** - Documentation and ownership tracking
- **CRM** - Customer relationship management
- **Finance** - Accounting, invoicing, payments
- **Inventory** - Building materials and stock management
- **HR** - Employee records, attendance, payroll
- **Procurement** - Purchase orders and supplier management
- **Reports** - Analytics and export to PDF/Excel
- **And 20+ more modules...**

## Tech Stack

- Next.js 16 (React)
- TypeScript
- Tailwind CSS
- Prisma ORM (SQLite)
- Electron (Desktop)

## All 30 Modules

1. User & Role Management
2. Dashboard
3. Customer (CRM)
4. Property Management
5. Construction Project Management
6. Land Documentation
7. Sales Management
8. Payment Management
9. Accounting & Finance
10. Procurement
11. Inventory Management
12. Equipment Management
13. Human Resource Management
14. Document Management
15. Task Management
16. Calendar & Scheduling
17. Communication
18. Reports & Analytics
19. Asset Management
20. Fleet Management
21. Security
22. Notification System
23. Mobile Application
24. Website Integration
25. Legal & Compliance
26. Multi-Branch Management
27. Backup & Recovery
28. System Integrations
29. Customer Self-Service Portal
30. AI & Automation

## Editions

BuildProp comes in two editions, built from the same codebase:

- **BuildProp Standard** — Full management system without AI features. All 29 core modules included.
- **BuildProp Premium** — Everything in Standard + AI-powered insights, predictions, chatbot assistant, and workflow automation.

### Building Each Edition

```bash
# Standard (no AI)
build-standard.bat

# Premium (with AI)
build-premium.bat
```

Or for desktop (Electron) builds:

```bash
# Standard desktop installer
build-standard.bat

# Premium desktop installer
build-premium.bat
```

The editions are controlled by the `NEXT_PUBLIC_AI_ENABLED` environment variable at build time.

## Database Setup

1. Install SQLite
2. Create a `.env` file:
```
DATABASE_URL="SQLite://user:password@localhost:5432/buildprop"
```
3. Run: `npx prisma db push`
4. Seed: `npx prisma db seed`
