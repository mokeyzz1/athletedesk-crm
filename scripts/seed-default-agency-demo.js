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
        return [
          line.slice(0, idx),
          line.slice(idx + 1).replace(/^['"]|['"]$/g, ''),
        ]
      })
  )
}

const env = loadEnv()

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const DEMO_ORG_SLUG = 'default-agency'
const DEMO_STAFF = [
  {
    name: 'Ava Brooks',
    email: 'ava@defaultagency.demo',
    legacyRole: 'agent',
    roles: ['agent'],
    primaryRole: 'agent',
    isAdmin: true,
    workRoles: ['agent'],
    primaryWorkRole: 'agent',
    assignedRegions: ['Southeast', 'Midwest'],
  },
  {
    name: 'Marcus Lee',
    email: 'marcus@defaultagency.demo',
    legacyRole: 'scout',
    roles: ['scout'],
    primaryRole: 'scout',
    isAdmin: false,
    workRoles: ['scout'],
    primaryWorkRole: 'scout',
    assignedRegions: ['Southeast', 'Southwest'],
  },
  {
    name: 'Nina Patel',
    email: 'nina@defaultagency.demo',
    legacyRole: 'marketing',
    roles: ['marketing'],
    primaryRole: 'marketing',
    isAdmin: false,
    workRoles: ['marketing'],
    primaryWorkRole: 'marketing',
    assignedRegions: ['West', 'Northeast'],
  },
  {
    name: 'Jordan Cruz',
    email: 'jordan@defaultagency.demo',
    legacyRole: 'agent',
    roles: ['agent', 'marketing'],
    primaryRole: 'agent',
    isAdmin: false,
    workRoles: ['agent', 'marketing'],
    primaryWorkRole: 'agent',
    assignedRegions: ['Midwest', 'Northwest'],
  },
]

const REGIONS = [
  { name: 'Southeast', states: ['GA', 'FL', 'AL', 'SC', 'NC', 'TN'] },
  { name: 'Northeast', states: ['MA', 'CT', 'NY', 'NJ', 'PA'] },
  { name: 'Midwest', states: ['IL', 'OH', 'MI', 'WI', 'IN'] },
  { name: 'Southwest', states: ['TX', 'AZ', 'OK', 'NM'] },
  { name: 'West', states: ['CA', 'NV', 'UT', 'CO'] },
  { name: 'Northwest', states: ['WA', 'OR', 'ID', 'MT'] },
]

const ROSTER_TEAMS = [
  { name: 'Football Recruiting', regions: ['Southeast', 'Southwest', 'Midwest'] },
  { name: 'Basketball Recruiting', regions: ['Northeast', 'West', 'Midwest'] },
  { name: 'Signed Client Growth', regions: ['Southeast', 'West'] },
]

const EMAIL_TEMPLATES = [
  {
    name: 'Intro Outreach',
    subject: 'Quick intro from Default Agency',
    body: 'Hey {{athlete_name}},\n\nWanted to introduce myself and share how we help athletes with recruiting, brand outreach, and long-term NIL strategy.\n\nWould you be open to a short call this week?\n\n- {{staff_name}}',
    is_shared: true,
  },
  {
    name: 'Brand Follow-up',
    subject: 'Following up on the partnership opportunity',
    body: 'Hi {{brand_name}},\n\nFollowing up on our conversation about a potential athlete partnership. We have a few strong fits ready for review and can send concept ideas as soon as you are ready.\n\nBest,\n{{staff_name}}',
    is_shared: true,
  },
]

const ATHLETE_NAMES = [
  'Darius Washington',
  'Terrance Mitchell',
  'DeShawn Williams',
  'Antonio Reyes',
  'Jayden Marcus',
  'Tyler Brooks',
  'Marcus Thompson Jr.',
  'Seth Price',
]

function isoDatePlus(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function isoTimestampMinus(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

async function ensureOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', DEMO_ORG_SLUG)
    .single()

  if (error || !data) throw new Error(`Could not load demo org: ${error?.message || 'missing org'}`)
  return data
}

async function fetchExistingUsers(orgId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, is_admin, work_roles, primary_work_role')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Failed to load users: ${error.message}`)
  return data || []
}

async function ensureDemoStaff(orgId) {
  const existingUsers = await fetchExistingUsers(orgId)
  const byEmail = new Map(existingUsers.map(user => [user.email.toLowerCase(), user]))
  const created = []

  for (const staff of DEMO_STAFF) {
    const existing = byEmail.get(staff.email.toLowerCase())
    if (existing) {
      created.push(existing)
      continue
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        organization_id: orgId,
        name: staff.name,
        email: staff.email,
        role: staff.legacyRole,
        roles: staff.roles,
        primary_role: staff.primaryRole,
        is_admin: staff.isAdmin,
        work_roles: staff.workRoles,
        primary_work_role: staff.primaryWorkRole,
        assigned_regions: staff.assignedRegions,
        notify_follow_ups: true,
        notify_task_reminders: true,
        notify_new_assignments: true,
        notify_weekly_summary: true,
      })
      .select('id, name, email, is_admin, work_roles, primary_work_role')
      .single()

    if (error) throw new Error(`Failed to insert demo staff ${staff.email}: ${error.message}`)
    created.push(data)
  }

  return [...existingUsers, ...created.filter(user => !byEmail.has(user.email.toLowerCase()))]
}

async function ensureRegions(orgId) {
  const { data: existing, error } = await supabase
    .from('recruiting_regions')
    .select('id, name')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Failed to load regions: ${error.message}`)
  const existingNames = new Set((existing || []).map(region => region.name))

  const toInsert = REGIONS
    .filter(region => !existingNames.has(region.name))
    .map(region => ({
      organization_id: orgId,
      name: region.name,
      states: region.states,
    }))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('recruiting_regions')
      .insert(toInsert)

    if (insertError) throw new Error(`Failed to insert regions: ${insertError.message}`)
  }
}

async function ensureRosterTeams(orgId) {
  const { data: existing, error } = await supabase
    .from('roster_teams')
    .select('id, name')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Failed to load roster teams: ${error.message}`)
  const existingNames = new Set((existing || []).map(team => team.name))

  const toInsert = ROSTER_TEAMS
    .filter(team => !existingNames.has(team.name))
    .map(team => ({
      organization_id: orgId,
      name: team.name,
      regions: team.regions,
    }))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('roster_teams')
      .insert(toInsert)

    if (insertError) throw new Error(`Failed to insert roster teams: ${insertError.message}`)
  }
}

async function ensureTemplates(orgId, creatorId) {
  const { data: existing, error } = await supabase
    .from('email_templates')
    .select('id, name')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Failed to load templates: ${error.message}`)
  const existingNames = new Set((existing || []).map(template => template.name))

  const toInsert = EMAIL_TEMPLATES
    .filter(template => !existingNames.has(template.name))
    .map(template => ({
      organization_id: orgId,
      created_by: creatorId,
      ...template,
    }))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('email_templates')
      .insert(toInsert)

    if (insertError) throw new Error(`Failed to insert templates: ${insertError.message}`)
  }
}

async function loadDemoAthletes(orgId) {
  const { data, error } = await supabase
    .from('athletes')
    .select('id, name, school, sport')
    .eq('organization_id', orgId)
    .in('name', ATHLETE_NAMES)

  if (error) throw new Error(`Failed to load athletes: ${error.message}`)
  return new Map((data || []).map(athlete => [athlete.name, athlete]))
}

async function ensureTasks(orgId, users, athletesByName) {
  const owner = users.find(user => user.email === 'ava@defaultagency.demo') || users[0]
  const scout = users.find(user => user.email === 'marcus@defaultagency.demo') || owner
  const marketer = users.find(user => user.email === 'nina@defaultagency.demo') || owner
  const operator = users.find(user => user.email === 'jordan@defaultagency.demo') || owner

  const desiredTasks = [
    {
      organization_id: orgId,
      title: 'Prep Darius Washington revenue-share proposal',
      description: 'Finalize the Clemson pitch deck and confirm the revenue-share comparison sheet before Friday.',
      assigned_to: owner.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('Darius Washington')?.id || null,
      due_date: isoDatePlus(2),
      priority: 'high',
      status: 'in_progress',
    },
    {
      organization_id: orgId,
      title: 'Send DeShawn Williams agency deck',
      description: 'Follow up on Instagram interest with a short intro email and recruiting deck.',
      assigned_to: scout.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('DeShawn Williams')?.id || null,
      due_date: isoDatePlus(1),
      priority: 'medium',
      status: 'todo',
    },
    {
      organization_id: orgId,
      title: 'Book intro call with Antonio Reyes family',
      description: 'Coordinate a 20-minute call and share the calendar link.',
      assigned_to: scout.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('Antonio Reyes')?.id || null,
      due_date: isoDatePlus(4),
      priority: 'medium',
      status: 'todo',
    },
    {
      organization_id: orgId,
      title: 'Draft NIL brand list for Terrance Mitchell',
      description: 'Build a first-pass list of SEC-friendly apparel and beverage brands for outreach.',
      assigned_to: marketer.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('Terrance Mitchell')?.id || null,
      due_date: isoDatePlus(3),
      priority: 'medium',
      status: 'in_progress',
    },
    {
      organization_id: orgId,
      title: 'Review Tyler Brooks scholarship negotiation notes',
      description: 'Summarize call notes and prepare talking points for coach outreach.',
      assigned_to: operator.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('Tyler Brooks')?.id || null,
      due_date: isoDatePlus(-1),
      priority: 'high',
      status: 'todo',
    },
    {
      organization_id: orgId,
      title: 'Update weekly recruiting dashboard',
      description: 'Refresh metrics and flag top prospects for Monday team sync.',
      assigned_to: owner.id,
      created_by: owner.id,
      athlete_id: null,
      due_date: isoDatePlus(5),
      priority: 'low',
      status: 'todo',
    },
    {
      organization_id: orgId,
      title: 'Finalize welcome checklist for signed clients',
      description: 'Clean up onboarding touchpoints and confirm who owns each handoff.',
      assigned_to: operator.id,
      created_by: owner.id,
      athlete_id: null,
      due_date: isoDatePlus(-3),
      priority: 'medium',
      status: 'done',
    },
    {
      organization_id: orgId,
      title: 'Create Marcus Thompson Jr. evaluation brief',
      description: 'Compile recruiting notes, social proof, and parent contact plan.',
      assigned_to: scout.id,
      created_by: owner.id,
      athlete_id: athletesByName.get('Marcus Thompson Jr.')?.id || null,
      due_date: isoDatePlus(6),
      priority: 'medium',
      status: 'todo',
    },
  ]

  for (const task of desiredTasks) {
    const { data: existingTask, error: loadError } = await supabase
      .from('tasks')
      .select('id')
      .eq('organization_id', orgId)
      .eq('title', task.title)
      .maybeSingle()

    if (loadError) throw new Error(`Failed to load task ${task.title}: ${loadError.message}`)
    if (existingTask) continue

    const { error: insertError } = await supabase.from('tasks').insert(task)
    if (insertError) throw new Error(`Failed to insert task ${task.title}: ${insertError.message}`)
  }
}

async function ensureCommunications(orgId, users, athletesByName) {
  const owner = users.find(user => user.email === 'ava@defaultagency.demo') || users[0]
  const scout = users.find(user => user.email === 'marcus@defaultagency.demo') || owner
  const marketer = users.find(user => user.email === 'nina@defaultagency.demo') || owner

  const desiredComms = [
    {
      athleteName: 'Darius Washington',
      staff_member_id: owner.id,
      communication_date: isoTimestampMinus(2),
      type: 'zoom',
      subject: 'Revenue-share strategy call',
      notes: 'Walked through Clemson NIL priorities and next steps for a draft agreement.',
      follow_up_date: isoDatePlus(2),
      follow_up_completed: false,
    },
    {
      athleteName: 'Terrance Mitchell',
      staff_member_id: marketer.id,
      communication_date: isoTimestampMinus(4),
      type: 'email',
      subject: 'Brand shortlist follow-up',
      notes: 'Sent first-pass brand list and asked which verticals he wants to prioritize.',
      follow_up_date: isoDatePlus(3),
      follow_up_completed: false,
    },
    {
      athleteName: 'DeShawn Williams',
      staff_member_id: scout.id,
      communication_date: isoTimestampMinus(1),
      type: 'text',
      subject: 'Intro text after Instagram reply',
      notes: 'Shared agency summary and offered a quick parent-inclusive intro call.',
      follow_up_date: isoDatePlus(1),
      follow_up_completed: false,
    },
    {
      athleteName: 'Tyler Brooks',
      staff_member_id: owner.id,
      communication_date: isoTimestampMinus(6),
      type: 'call',
      subject: 'Scholarship negotiation prep',
      notes: 'Reviewed leverage points ahead of coach outreach and promised a follow-up outline.',
      follow_up_date: null,
      follow_up_completed: true,
    },
  ]

  for (const comm of desiredComms) {
    const { data: existingComm, error: loadError } = await supabase
      .from('communications_log')
      .select('id')
      .eq('organization_id', orgId)
      .eq('subject', comm.subject)
      .maybeSingle()

    if (loadError) throw new Error(`Failed to load communication ${comm.subject}: ${loadError.message}`)
    if (existingComm) continue

    const payload = {
      organization_id: orgId,
      athlete_id: athletesByName.get(comm.athleteName)?.id || null,
      staff_member_id: comm.staff_member_id,
      communication_date: comm.communication_date,
      type: comm.type,
      subject: comm.subject,
      notes: comm.notes,
      follow_up_date: comm.follow_up_date,
      follow_up_completed: comm.follow_up_completed,
    }

    const { error: insertError } = await supabase.from('communications_log').insert(payload)
    if (insertError) throw new Error(`Failed to insert communication ${comm.subject}: ${insertError.message}`)
  }
}

async function ensureBrandOutreach(orgId, users, athletesByName) {
  const owner = users.find(user => user.email === 'ava@defaultagency.demo') || users[0]
  const marketer = users.find(user => user.email === 'nina@defaultagency.demo') || owner

  const desiredOutreach = [
    {
      organization_id: orgId,
      brand_name: 'Nike',
      brand_contact_name: 'Sarah Chen',
      brand_contact_email: 'sarah.chen@nike-demo.com',
      staff_member_id: marketer.id,
      athlete_id: athletesByName.get('Darius Washington')?.id,
      date_contacted: isoDatePlus(-18),
      outreach_method: 'email',
      response_status: 'in_discussion',
      deal_value: 45000,
      product_value: 5000,
      campaign_details: 'Regional football creator campaign',
      notes: 'Good early momentum and strong fit with spring content.',
      deal_stage: 'active',
    },
    {
      organization_id: orgId,
      brand_name: 'Beats by Dre',
      brand_contact_name: 'James Wilson',
      brand_contact_email: 'james.wilson@beats-demo.com',
      staff_member_id: marketer.id,
      athlete_id: athletesByName.get('Terrance Mitchell')?.id,
      date_contacted: isoDatePlus(-9),
      outreach_method: 'linkedin',
      response_status: 'interested',
      deal_value: 22000,
      product_value: 2500,
      campaign_details: 'Locker room storytelling series',
      notes: 'Waiting on revised creative brief from brand team.',
      deal_stage: 'prospective',
    },
    {
      organization_id: orgId,
      brand_name: 'Fanatics',
      brand_contact_name: 'Lisa Park',
      brand_contact_email: 'lisa.park@fanatics-demo.com',
      staff_member_id: owner.id,
      athlete_id: athletesByName.get('DeShawn Williams')?.id,
      date_contacted: isoDatePlus(-6),
      outreach_method: 'email',
      response_status: 'interested',
      deal_value: 15000,
      product_value: 1200,
      campaign_details: 'College athlete affiliate capsule',
      notes: 'Brand wants athlete social metrics before next step.',
      deal_stage: 'prospective',
    },
    {
      organization_id: orgId,
      brand_name: 'Gatorade',
      brand_contact_name: 'Monica Ruiz',
      brand_contact_email: 'monica.ruiz@gatorade-demo.com',
      staff_member_id: marketer.id,
      athlete_id: athletesByName.get('Antonio Reyes')?.id,
      date_contacted: isoDatePlus(-12),
      outreach_method: 'phone',
      response_status: 'no_response',
      deal_value: 18000,
      product_value: 3000,
      campaign_details: 'Summer training content bundle',
      notes: 'Need to package athlete story with Texas market angle.',
      deal_stage: 'prospective',
    },
  ].filter(item => item.athlete_id)

  for (const item of desiredOutreach) {
    const { data: existingItem, error: loadError } = await supabase
      .from('brand_outreach')
      .select('id')
      .eq('organization_id', orgId)
      .eq('brand_name', item.brand_name)
      .eq('athlete_id', item.athlete_id)
      .maybeSingle()

    if (loadError) throw new Error(`Failed to load brand outreach ${item.brand_name}: ${loadError.message}`)
    if (existingItem) continue

    const { error: insertError } = await supabase.from('brand_outreach').insert(item)
    if (insertError) throw new Error(`Failed to insert brand outreach ${item.brand_name}: ${insertError.message}`)
  }
}

async function ensureFinancials(orgId, athletesByName) {
  const desiredDeals = [
    {
      organization_id: orgId,
      athlete_id: athletesByName.get('Darius Washington')?.id,
      deal_name: 'Clemson Regional Ambassador Campaign',
      deal_value: 45000,
      agency_percentage: 12,
      payment_status: 'invoiced',
      deal_date: isoDatePlus(-20),
      invoice_date: isoDatePlus(-18),
      payment_date: null,
      notes: 'Awaiting first payment milestone after creative approval.',
      deal_type: 'marketing_brand',
      deal_stage: 'active',
    },
    {
      organization_id: orgId,
      athlete_id: athletesByName.get('Terrance Mitchell')?.id,
      deal_name: 'SEC Collective Revenue Share Pitch',
      deal_value: 32000,
      agency_percentage: 10,
      payment_status: 'pending',
      deal_date: isoDatePlus(-7),
      invoice_date: null,
      payment_date: null,
      notes: 'Used as a live opportunity during athlete pitch conversations.',
      deal_type: 'revenue_share',
      deal_stage: 'prospective',
    },
    {
      organization_id: orgId,
      athlete_id: athletesByName.get('Tyler Brooks')?.id,
      deal_name: 'Quincy Summer Baseball Camp Series',
      deal_value: 8500,
      agency_percentage: 15,
      payment_status: 'paid',
      deal_date: isoDatePlus(-30),
      invoice_date: isoDatePlus(-28),
      payment_date: isoDatePlus(-14),
      notes: 'Good example of a smaller but successful baseball activation.',
      deal_type: 'marketing_brand',
      deal_stage: 'active',
    },
  ].filter(item => item.athlete_id)

  for (const deal of desiredDeals) {
    const { data: existingDeal, error: loadError } = await supabase
      .from('financial_tracking')
      .select('id')
      .eq('organization_id', orgId)
      .eq('deal_name', deal.deal_name)
      .maybeSingle()

    if (loadError) throw new Error(`Failed to load financial ${deal.deal_name}: ${loadError.message}`)
    if (existingDeal) continue

    const { error: insertError } = await supabase.from('financial_tracking').insert(deal)
    if (insertError) throw new Error(`Failed to insert financial ${deal.deal_name}: ${insertError.message}`)
  }
}

async function summarize(orgId) {
  const [users, tasks, comms, brands, financials, teams, regions, templates] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('communications_log').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('brand_outreach').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('financial_tracking').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('roster_teams').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('recruiting_regions').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('email_templates').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
  ])

  return {
    users: users.count || 0,
    tasks: tasks.count || 0,
    communications: comms.count || 0,
    brandOutreach: brands.count || 0,
    financials: financials.count || 0,
    rosterTeams: teams.count || 0,
    recruitingRegions: regions.count || 0,
    templates: templates.count || 0,
  }
}

async function cleanupOrphanedDemoArtifacts() {
  const taskTitles = [
    'Prep Darius Washington revenue-share proposal',
    'Send DeShawn Williams agency deck',
    'Book intro call with Antonio Reyes family',
    'Draft NIL brand list for Terrance Mitchell',
    'Review Tyler Brooks scholarship negotiation notes',
    'Update weekly recruiting dashboard',
    'Finalize welcome checklist for signed clients',
    'Create Marcus Thompson Jr. evaluation brief',
  ]
  const commSubjects = [
    'Revenue-share strategy call',
    'Brand shortlist follow-up',
    'Intro text after Instagram reply',
    'Scholarship negotiation prep',
  ]
  const brandNames = ['Fanatics', 'Gatorade']
  const dealNames = [
    'Clemson Regional Ambassador Campaign',
    'SEC Collective Revenue Share Pitch',
    'Quincy Summer Baseball Camp Series',
  ]

  await supabase.from('tasks').delete().is('organization_id', null).in('title', taskTitles)
  await supabase.from('communications_log').delete().is('organization_id', null).in('subject', commSubjects)
  await supabase.from('brand_outreach').delete().is('organization_id', null).in('brand_name', brandNames)
  await supabase.from('financial_tracking').delete().is('organization_id', null).in('deal_name', dealNames)
}

async function main() {
  await cleanupOrphanedDemoArtifacts()
  const org = await ensureOrganization()
  const users = await ensureDemoStaff(org.id)
  await ensureRegions(org.id)
  await ensureRosterTeams(org.id)
  await ensureTemplates(org.id, users[0].id)
  const athletesByName = await loadDemoAthletes(org.id)
  await ensureTasks(org.id, users, athletesByName)
  await ensureCommunications(org.id, users, athletesByName)
  await ensureBrandOutreach(org.id, users, athletesByName)
  await ensureFinancials(org.id, athletesByName)

  const counts = await summarize(org.id)

  console.log(
    JSON.stringify(
      {
        organization: org,
        counts,
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
