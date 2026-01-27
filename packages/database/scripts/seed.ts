#!/usr/bin/env node

/**
 * Database seed script
 *
 * Creates test account for Swagger auto-login using better-auth schema
 *
 * Usage: pnpm run db:seed
 */

import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import pg from 'pg'

// Load environment variables
config()

// Inline schema definitions matching better-auth structure
const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

const accountsTable = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Simple nanoid-like ID generator
function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not configured')
    process.exit(1)
  }

  const email = process.env.SWAGGER_TEST_EMAIL
  const password = process.env.SWAGGER_TEST_PASSWORD

  if (!email || !password) {
    console.error('❌ SWAGGER_TEST_EMAIL or SWAGGER_TEST_PASSWORD not configured')
    console.log('Please configure in .env file:')
    console.log('  SWAGGER_TEST_EMAIL=test@example.com')
    console.log('  SWAGGER_TEST_PASSWORD=TestPassword123')
    process.exit(1)
  }

  console.log('🔄 Connecting to database...')

  const pool = new pg.Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    // Check if user already exists
    console.log(`🔍 Checking test account: ${email}`)
    const existingUsers = await db.select().from(usersTable).where(eq(usersTable.email, email))

    if (existingUsers.length > 0) {
      console.log('✅ Test account already exists, skipping creation')
      return
    }

    // Create user
    console.log('📝 Creating test account...')

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = generateId()

    const [newUser] = await db
      .insert(usersTable)
      .values({
        id: userId,
        name: 'Test User',
        email,
        emailVerified: true,
        role: 'user',
        banned: false,
      })
      .returning()

    if (!newUser) {
      throw new Error('Failed to create user')
    }

    // Create account with password (email provider)
    await db.insert(accountsTable).values({
      id: generateId(),
      userId: newUser.id,
      accountId: email,
      providerId: 'email',
      password: passwordHash,
    })

    console.log('✅ Test account created successfully!')
    console.log(`   Email: ${email}`)
    console.log(`   Name: Test User`)
    console.log(`   Role: user`)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
    console.log('🔒 Database connection closed')
  }
}

await seed()
