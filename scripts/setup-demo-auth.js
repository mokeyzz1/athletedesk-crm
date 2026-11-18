/**
 * Provisions a Supabase auth account for the demo user in Default Agency
 * and links it to the existing users row.
 *
 * Run with: node scripts/setup-demo-auth.js
 *
 * Idempotent — safe to re-run.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  const raw = fs.readFileSync(envPath, 'utf8')
  return Object.fromEntries(
    raw
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx), line.slice(idx + 1).replace(/^['"]|['"]$/g, '')]
      })
  )
}

const env = loadEnv()

const DEMO_EMAIL = 'demo@athletedesk.app'
const LEGACY_DEMO_EMAIL = 'ava@defaultagency.demo'
const DEMO_PASSWORD = env.DEMO_USER_PASSWORD || 'demo-' + Math.random().toString(36).slice(2)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  console.log(`Setting up demo auth for ${DEMO_EMAIL}...`)

  let { data: existingUserRow } = await admin
    .from('users')
    .select('id, name, email, auth_user_id, organization_id')
    .eq('email', DEMO_EMAIL)
    .single()

  if (!existingUserRow) {
    const { data: legacyRow } = await admin
      .from('users')
      .select('id, name, email, auth_user_id, organization_id')
      .eq('email', LEGACY_DEMO_EMAIL)
      .single()
    if (legacyRow) {
      console.log(`Migrating ${LEGACY_DEMO_EMAIL} → ${DEMO_EMAIL}`)
      const { error: renameErr } = await admin
        .from('users')
        .update({ email: DEMO_EMAIL })
        .eq('id', legacyRow.id)
      if (renameErr) {
        console.error('Failed to rename users.email:', renameErr.message)
        process.exit(1)
      }
      existingUserRow = { ...legacyRow, email: DEMO_EMAIL }
    }
  }

  if (!existingUserRow) {
    console.error(`No users row found for ${DEMO_EMAIL} or ${LEGACY_DEMO_EMAIL}. Run seed-default-agency-demo.js first.`)
    process.exit(1)
  }

  console.log(`Found users row: ${existingUserRow.name} (id=${existingUserRow.id})`)

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let authUser = listed?.users?.find(u => u.email === DEMO_EMAIL)
  const legacyAuthUser = listed?.users?.find(u => u.email === LEGACY_DEMO_EMAIL)

  if (legacyAuthUser && !authUser) {
    console.log(`Migrating auth user ${LEGACY_DEMO_EMAIL} → ${DEMO_EMAIL}`)
    const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(
      legacyAuthUser.id,
      { email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true }
    )
    if (updateErr) {
      console.error('Failed to migrate auth user email:', updateErr.message)
      process.exit(1)
    }
    authUser = updated.user
  } else if (authUser) {
    console.log(`Auth user already exists (id=${authUser.id}). Resetting password.`)
    await admin.auth.admin.updateUserById(authUser.id, { password: DEMO_PASSWORD })
  } else {
    console.log('Creating auth user...')
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: existingUserRow.name },
    })
    if (createErr) {
      console.error('Failed to create auth user:', createErr.message)
      process.exit(1)
    }
    authUser = created.user
    console.log(`Created auth user id=${authUser.id}`)
  }

  if (existingUserRow.auth_user_id !== authUser.id) {
    const { error: linkErr } = await admin
      .from('users')
      .update({ auth_user_id: authUser.id })
      .eq('id', existingUserRow.id)
    if (linkErr) {
      console.error('Failed to link auth_user_id:', linkErr.message)
      process.exit(1)
    }
    console.log('Linked auth_user_id on users row.')
  } else {
    console.log('users.auth_user_id already linked.')
  }

  console.log('\nDemo auth ready.')
  console.log(`Email:    ${DEMO_EMAIL}`)
  console.log(`Password: ${DEMO_PASSWORD}`)
  if (!env.DEMO_USER_PASSWORD) {
    console.log('\nTo make this password stable across runs, add to .env.local:')
    console.log(`DEMO_USER_PASSWORD=${DEMO_PASSWORD}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
