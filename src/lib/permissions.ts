import { prisma } from '@/lib/prisma'

// Returns the permission strings (e.g. "projects.read") for a role.
// role_permissions is mapped by the RolePermission model in the Prisma schema.
export async function getUserPermissions(roleId: string): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: {
      permission: {
        select: { module: true, action: true },
      },
    },
  })
  return rows.map((row) => `${row.permission.module}.${row.permission.action}`)
}

export function canAccess(perms: string[], module: string, action: string): boolean {
  return perms.includes(`${module}.${action}`)
}

export function isAdminRole(roleName: string): boolean {
  return roleName === 'Super Admin' || roleName === 'Admin'
}
