import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be under 200 characters'),
  code: z.string().min(1, 'Project code is required').max(50, 'Project code must be under 50 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional(),
  projectType: z.enum(['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use']).optional().default('residential'),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional().default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  estimatedBudget: z.number().min(0, 'Budget must be non-negative').optional(),
  location: z.string().max(500, 'Location must be under 500 characters').optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>

export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(200, 'Property name must be under 200 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional(),
  propertyType: z.enum(['apartment', 'house', 'villa', 'plot', 'commercial', 'warehouse']).optional().default('apartment'),
  status: z.enum(['available', 'sold', 'rented', 'under_maintenance']).optional().default('available'),
  price: z.number().positive('Price must be positive'),
  rentalPrice: z.number().positive('Rental price must be positive').optional(),
  areaSqft: z.number().positive('Area must be positive').optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  address: z.string().max(500, 'Address must be under 500 characters').optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
})

export type PropertyInput = z.infer<typeof propertySchema>

export const contactSchema = z.object({
  type: z.enum(['customer', 'lead', 'tenant', 'vendor', 'contractor']).optional().default('customer'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be under 100 characters'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name must be under 100 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone must be under 20 characters').optional(),
  company: z.string().max(200, 'Company must be under 200 characters').optional(),
  address: z.string().max(500, 'Address must be under 500 characters').optional(),
  notes: z.string().max(2000, 'Notes must be under 2000 characters').optional(),
  source: z.string().max(100).optional(),
  leadStatus: z.string().max(50).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(500, 'Description must be under 500 characters'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  amount: z.number().optional().default(0),
})

export const invoiceSchema = z.object({
  type: z.enum(['sales', 'purchase', 'proforma', 'credit_note']).default('sales'),
  contactId: z.string().optional().nullable(),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative').optional().default(0),
  taxAmount: z.number().optional().default(0),
  totalAmount: z.number().positive('Total amount must be positive'),
  items: z.array(invoiceItemSchema).max(100, 'Too many items').optional().default([]),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>

export const paymentSchema = z.object({
  type: z.enum(['received', 'made']).default('received'),
  contactId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other']).default('cash'),
  paymentDate: z.string().min(1, 'Payment date is required'),
})

export type PaymentInput = z.infer<typeof paymentSchema>

export const employeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50, 'Employee ID must be under 50 characters'),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required').max(200, 'Designation must be under 200 characters'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional().default('full_time'),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  salary: z.number().positive('Salary must be positive'),
  status: z.enum(['active', 'inactive', 'on_notice', 'terminated']).optional().default('active'),
})

export type EmployeeInput = z.infer<typeof employeeSchema>

export const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be under 200 characters'),
  logo: z.string().max(500).optional(),
  address: z.string().max(500, 'Address must be under 500 characters').optional(),
  phone: z.string().max(20, 'Phone must be under 20 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  dateFormat: z.string().max(20).optional(),
  fiscalYearStart: z.string().optional(),
  passwordMinLength: z.number().optional(),
  requireUppercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
  // First-run admin account fields (only sent by the setup wizard)
  adminFirstName: z.string().min(1, 'Admin first name is required').max(100, 'Admin first name must be under 100 characters').optional(),
  adminLastName: z.string().min(1, 'Admin last name is required').max(100, 'Admin last name must be under 100 characters').optional(),
  adminEmail: z.string().email('Invalid admin email format').optional(),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters').optional(),
})

export type SettingsInput = z.infer<typeof settingsSchema>

export const taskSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1, 'Task title is required').max(300, 'Title must be under 300 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']).optional().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  dueDate: z.string().optional(),
  estimatedHours: z.number().positive('Estimated hours must be positive').max(10000).optional(),
})

export type TaskInput = z.infer<typeof taskSchema>
