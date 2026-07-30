import { PrismaClient } from '@prisma/client'
import { hashPassword } from './auth-utils'

const prisma = new PrismaClient()

async function migratePasswords() {
  const users = await prisma.user.findMany({
    where: {
      passwordHash: { startsWith: 'plain:' },
    },
  })

  console.log(`Found ${users.length} users with plain-text passwords.`)

  for (const user of users) {
    const plainPassword = user.passwordHash.slice(6)
    const hashedPassword = await hashPassword(plainPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    })
    console.log(`Migrated password for: ${user.email}`)
  }

  console.log('Password migration complete.')
}

migratePasswords()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
