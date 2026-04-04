import * as XLSX from 'xlsx'

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
) {
  if (data.length === 0) return

  // If columns specified, use them; otherwise use all keys from first row
  const headers = columns
    ? columns.map(c => c.header)
    : Object.keys(data[0])

  const keys = columns
    ? columns.map(c => c.key)
    : Object.keys(data[0]) as (keyof T)[]

  // Create CSV content
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key]
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ]

  const csvContent = csvRows.join('\n')
  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1',
  columns?: { key: keyof T; header: string }[]
) {
  if (data.length === 0) return

  // Transform data to use custom headers if provided
  const exportData = columns
    ? data.map(row => {
        const newRow: Record<string, unknown> = {}
        columns.forEach(col => {
          newRow[col.header] = row[col.key]
        })
        return newRow
      })
    : data

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Column name variations for import mapping
// Keys are lowercase and trimmed for matching
export const athleteColumnMappings: Record<string, string> = {
  // name - common variations
  'name': 'name',
  'athlete name': 'name',
  'athletename': 'name',
  'athlete_name': 'name',
  'full name': 'name',
  'fullname': 'name',
  'full_name': 'name',
  'athlete': 'name',
  'player': 'name',
  'player name': 'name',
  'playername': 'name',
  'player_name': 'name',
  'first name': 'first_name',
  'firstname': 'first_name',
  'first_name': 'first_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'last_name': 'last_name',

  // email
  'email': 'email',
  'email address': 'email',
  'emailaddress': 'email',
  'email_address': 'email',
  'e-mail': 'email',
  'e mail': 'email',
  'athlete email': 'email',
  'player email': 'email',

  // phone
  'phone': 'phone',
  'phone number': 'phone',
  'phonenumber': 'phone',
  'phone_number': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'cell': 'phone',
  'cell phone': 'phone',
  'cellphone': 'phone',
  'cell_phone': 'phone',
  'contact number': 'phone',
  'contact phone': 'phone',

  // school - common variations
  'school': 'school',
  'school name': 'school',
  'schoolname': 'school',
  'school_name': 'school',
  'university': 'school',
  'university name': 'school',
  'college': 'school',
  'college name': 'school',
  'institution': 'school',
  'team': 'school',
  'team name': 'school',
  'program': 'school',

  // sport
  'sport': 'sport',
  'sports': 'sport',
  'sport name': 'sport',
  'primary sport': 'sport',

  // position
  'position': 'position',
  'pos': 'position',
  'pos.': 'position',
  'role': 'position',
  'playing position': 'position',

  // league_level
  'league_level': 'league_level',
  'league level': 'league_level',
  'leaguelevel': 'league_level',
  'level': 'league_level',
  'league': 'league_level',
  'division': 'league_level',
  'div': 'league_level',
  'classification': 'league_level',

  // eligibility_year
  'eligibility_year': 'eligibility_year',
  'eligibility year': 'eligibility_year',
  'eligibility': 'eligibility_year',
  'class year': 'eligibility_year',
  'graduation year': 'eligibility_year',
  'grad year': 'eligibility_year',
  'year': 'eligibility_year',

  // recruiting_status - now maps to status_text for intelligent parsing
  'recruiting_status': 'status_text',
  'recruiting status': 'status_text',
  'status': 'status_text',
  'recruit status': 'status_text',
  'availability': 'status_text',
  'availability status': 'status_text',

  // New recruiting fields - class_year (Freshman/Sophomore/Junior/Senior)
  'class_year': 'class_year',
  'classyear': 'class_year',
  'class': 'class_year',
  'classification year': 'class_year',
  'grad class': 'class_year',
  'recruiting class': 'class_year',

  // New recruiting fields - region
  'region': 'region',
  'geographic region': 'region',
  'geo region': 'region',
  'area': 'region',
  'territory': 'region',
  'state region': 'region',

  // New recruiting fields - outreach_status
  'outreach_status': 'outreach_status',
  'outreach status': 'outreach_status',
  'outreach': 'outreach_status',
  'contact status': 'outreach_status',
  'contact_status': 'outreach_status',
  'contacted': 'outreach_status',

  // transfer_portal_status
  'transfer_portal_status': 'transfer_portal_status',
  'transfer portal status': 'transfer_portal_status',
  'portal status': 'transfer_portal_status',
  'transfer status': 'transfer_portal_status',
  'portal': 'transfer_portal_status',

  // marketability_score
  'marketability_score': 'marketability_score',
  'marketability score': 'marketability_score',
  'marketability': 'marketability_score',
  'market score': 'marketability_score',
  'score': 'marketability_score',
  'rating': 'marketability_score',

  // notes
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
  'description': 'notes',

  // Social Media - Instagram
  'instagram': 'instagram_handle',
  'instagram handle': 'instagram_handle',
  'instagram_handle': 'instagram_handle',
  'ig': 'instagram_handle',
  'ig handle': 'instagram_handle',
  'instagram followers': 'instagram_followers',
  'instagram_followers': 'instagram_followers',
  'ig followers': 'instagram_followers',

  // Social Media - Twitter/X
  'twitter': 'twitter_handle',
  'twitter handle': 'twitter_handle',
  'twitter_handle': 'twitter_handle',
  'x': 'twitter_handle',
  'x handle': 'twitter_handle',
  'twitter followers': 'twitter_followers',
  'twitter_followers': 'twitter_followers',
  'x followers': 'twitter_followers',

  // Social Media - TikTok
  'tiktok': 'tiktok_handle',
  'tiktok handle': 'tiktok_handle',
  'tiktok_handle': 'tiktok_handle',
  'tik tok': 'tiktok_handle',
  'tiktok followers': 'tiktok_followers',
  'tiktok_followers': 'tiktok_followers',

  // Social Media - YouTube
  'youtube': 'youtube_channel',
  'youtube channel': 'youtube_channel',
  'youtube_channel': 'youtube_channel',
  'yt': 'youtube_channel',
  'yt channel': 'youtube_channel',
  'youtube subscribers': 'youtube_subscribers',
  'youtube_subscribers': 'youtube_subscribers',
  'yt subscribers': 'youtube_subscribers',
  'subscribers': 'youtube_subscribers',

  // Social Media - Other
  'nil valuation': 'nil_valuation',
  'nil_valuation': 'nil_valuation',
  'nil value': 'nil_valuation',
  'nil': 'nil_valuation',
  'total following': 'total_following',
  'total followers': 'total_following',
  'social reach': 'total_following',
  'followers': 'total_following',

  // Location - keep as location, not region
  'location': 'location',
  'loc': 'location',
  'city': 'location',
  'city, state': 'location',

  // Description/Notes (description already mapped above)
  'bio': 'notes',
  'scouting report': 'notes',

  // Assignment/Groupchat - extract staff name
  'groupchat': 'assignment_text',
  'assignment': 'assignment_text',
  'assigned to': 'assignment_text',
  'assigned': 'assignment_text',

  // Internal field - preserve sheet name for region
  '_sourcesheet': '_sourceSheet',

  // Height and Weight - many common variations
  'height': 'height',
  'ht': 'height',
  'ht.': 'height',
  'height (ft)': 'height',
  'height (in)': 'height',
  'height/weight': 'height_weight',
  'ht/wt': 'height_weight',
  'ht / wt': 'height_weight',
  'ht./wt.': 'height_weight',
  'height / weight': 'height_weight',
  'height-weight': 'height_weight',
  'weight': 'weight',
  'wt': 'weight',
  'wt.': 'weight',
  'weight (lbs)': 'weight',
  'weight (kg)': 'weight',

  // Football-specific
  '40 yard dash': 'forty_yard_dash',
  '40yard dash': 'forty_yard_dash',
  '40-yard dash': 'forty_yard_dash',
  '40 yard': 'forty_yard_dash',
  '40 time': 'forty_yard_dash',
  '40time': 'forty_yard_dash',
  'forty yard dash': 'forty_yard_dash',
  'forty_yard_dash': 'forty_yard_dash',
  '40': 'forty_yard_dash',
  'position group': 'position_group',
  'positiongroup': 'position_group',
  'position_group': 'position_group',
  'pos group': 'position_group',
  'school offers': 'school_offers',
  'schooloffers': 'school_offers',
  'school_offers': 'school_offers',
  'offers': 'offers',
  'offer count': 'offers',
  'offer list': 'offers',
  '# offers': 'offers',
  '#offers': 'offers',
  'number of offers': 'offers',
  'hudl': 'hudl_link',
  'hudl link': 'hudl_link',
  'hudl_link': 'hudl_link',
  'hudllink': 'hudl_link',
  'film': 'hudl_link',
  'film link': 'hudl_link',
  'filmlink': 'hudl_link',
  'film_link': 'hudl_link',
  'game film': 'hudl_link',
  'highlight film': 'hudl_link',
  'highlights': 'hudl_link',

  // Basketball-specific
  'ppg': 'ppg',
  'points per game': 'ppg',
  'recruiting ranking': 'recruiting_ranking',
  'ranking': 'recruiting_ranking',

  // Track & Field-specific
  'event': 'event',
  'primary event': 'event',
  'personal best': 'personal_best',
  'pb': 'personal_best',
  'pr': 'personal_best',
  'national ranking': 'national_ranking',
  'conference': 'conference',

  // Soccer-specific
  'goals': 'goals',
  'assists': 'assists',
  'club team': 'club_team',
  'club': 'club_team',
  'international eligibility': 'international_eligibility',

  // Tennis-specific
  'utr': 'utr_rating',
  'utr rating': 'utr_rating',
  'singles ranking': 'singles_ranking',
  'doubles ranking': 'doubles_ranking',

  // Baseball-specific
  'batting average': 'batting_average',
  'avg': 'batting_average',
  'ba': 'batting_average',
  'era': 'era',
  'velocity': 'velocity',
  'velo': 'velocity',
}

// Fields that go into social_media JSON
export const socialMediaFields = [
  'instagram_handle',
  'instagram_followers',
  'twitter_handle',
  'twitter_followers',
  'tiktok_handle',
  'tiktok_followers',
  'youtube_channel',
  'youtube_subscribers',
  'nil_valuation',
]

// Fields that go into sport_specific_stats JSON
export const sportSpecificFields = [
  'location',
  'height',
  'weight',
  'height_weight',
  'forty_yard_dash',
  'position_group',
  'school_offers',
  'offers',
  'hudl_link',
  'ppg',
  'recruiting_ranking',
  'event',
  'personal_best',
  'national_ranking',
  'conference',
  'goals',
  'assists',
  'club_team',
  'international_eligibility',
  'utr_rating',
  'singles_ranking',
  'doubles_ranking',
  'batting_average',
  'era',
  'velocity',
]

export interface ParsedWorkbook {
  sheetNames: string[]
  sheets: Record<string, Record<string, unknown>[]>
}

export function parseImportFile(file: File): Promise<ParsedWorkbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        // Parse all sheets
        const sheets: Record<string, Record<string, unknown>[]> = {}
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]
        })

        resolve({
          sheetNames: workbook.SheetNames,
          sheets
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function mapColumns(
  data: Record<string, unknown>[],
  mappings: Record<string, string>
): Record<string, unknown>[] {
  return data.map(row => {
    const mappedRow: Record<string, unknown> = {}

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase().trim()
      const mappedKey = mappings[normalizedKey]

      if (mappedKey) {
        mappedRow[mappedKey] = value
      } else {
        // Keep unmapped columns with original key
        mappedRow[key] = value
      }
    })

    return mappedRow
  })
}

export interface NormalizeResult {
  data: Record<string, unknown>[]
  skippedRows: { row: number; reason: string; value: string }[]
}

// US States for header detection
const US_STATE_NAMES = [
  'ALABAMA', 'ALASKA', 'ARIZONA', 'ARKANSAS', 'CALIFORNIA', 'COLORADO', 'CONNECTICUT',
  'DELAWARE', 'FLORIDA', 'GEORGIA', 'HAWAII', 'IDAHO', 'ILLINOIS', 'INDIANA', 'IOWA',
  'KANSAS', 'KENTUCKY', 'LOUISIANA', 'MAINE', 'MARYLAND', 'MASSACHUSETTS', 'MICHIGAN',
  'MINNESOTA', 'MISSISSIPPI', 'MISSOURI', 'MONTANA', 'NEBRASKA', 'NEVADA', 'NEW HAMPSHIRE',
  'NEW JERSEY', 'NEW MEXICO', 'NEW YORK', 'NORTH CAROLINA', 'NORTH DAKOTA', 'OHIO',
  'OKLAHOMA', 'OREGON', 'PENNSYLVANIA', 'RHODE ISLAND', 'SOUTH CAROLINA', 'SOUTH DAKOTA',
  'TENNESSEE', 'TEXAS', 'UTAH', 'VERMONT', 'VIRGINIA', 'WASHINGTON', 'WEST VIRGINIA',
  'WISCONSIN', 'WYOMING'
]

export function normalizeAthleteData(data: Record<string, unknown>[]): NormalizeResult {
  const skippedRows: { row: number; reason: string; value: string }[] = []

  // Filter out state/section header rows
  const filteredData = data.filter((row, index) => {
    // Check if "name" field is a US state (these are section headers)
    const name = row.name || row.Name || row.NAME
    if (name) {
      const nameStr = String(name).trim().toUpperCase()
      if (US_STATE_NAMES.includes(nameStr)) {
        skippedRows.push({ row: index + 1, reason: 'State header', value: nameStr })
        return false
      }
    }

    // Also check first field for ALL CAPS state-like values
    const entries = Object.entries(row).filter(([key]) =>
      !key.startsWith('_') // Ignore internal fields like _sourceSheet
    )
    const filledFields = entries.filter(([, value]) =>
      value !== null && value !== undefined && String(value).trim() !== ''
    )

    // Skip if only first cell has value (state header like "ARIZONA")
    if (filledFields.length === 1) {
      const value = String(filledFields[0][1]).trim()
      // Check if it's all caps or looks like a state/region header
      if (value === value.toUpperCase() && value.length < 30 && !/\d/.test(value)) {
        skippedRows.push({ row: index + 1, reason: 'Section header', value })
        return false
      }
    }

    return true
  })

  const normalizedData = filteredData.map(row => {
    const normalized: Record<string, unknown> = { ...row }

    // Combine first_name and last_name into name if name is missing
    if (!normalized.name && (normalized.first_name || normalized.last_name)) {
      const firstName = String(normalized.first_name || '').trim()
      const lastName = String(normalized.last_name || '').trim()
      normalized.name = `${firstName} ${lastName}`.trim()
      delete normalized.first_name
      delete normalized.last_name
    }

    // Split combined height/weight field (e.g., "6'2\" / 195 lbs" or "6-2/195")
    if (normalized.height_weight && !normalized.height && !normalized.weight) {
      const hw = String(normalized.height_weight)
      // Try to parse common formats
      const match = hw.match(/(\d+['\-]?\d*"?)\s*[\/,\s]+\s*(\d+)/)
      if (match) {
        normalized.height = match[1]
        normalized.weight = match[2]
      }
      delete normalized.height_weight
    }

    // Normalize league_level
    if (normalized.league_level) {
      const level = String(normalized.league_level).toLowerCase().trim()
      if (level.includes('high') || level === 'hs') {
        normalized.league_level = 'high_school'
      } else if (level.includes('college') || level === 'ncaa' || level.includes('university')) {
        normalized.league_level = 'college'
      } else if (level.includes('pro') || level === 'nba' || level === 'nfl' || level === 'mlb' || level === 'nhl' || level === 'mls') {
        normalized.league_level = 'professional'
      } else if (level.includes('international') || level.includes('intl')) {
        normalized.league_level = 'international'
      } else {
        normalized.league_level = 'college' // default
      }
    }

    // Parse status_text intelligently into outreach_status
    // 'followed' → Contacted, 'phone number/call/expecting' → In Conversation,
    // 'rejected/representation' → Dead Lead, empty → Not Contacted
    if (normalized.status_text) {
      const statusText = String(normalized.status_text).toLowerCase().trim()
      const originalStatus = String(normalized.status_text).trim()

      // Store original text in notes
      const existingNotes = normalized.notes ? String(normalized.notes) : ''
      if (originalStatus) {
        normalized.notes = existingNotes
          ? `${existingNotes}\n\nStatus: ${originalStatus}`
          : `Status: ${originalStatus}`
      }

      // Map to outreach_status
      if (statusText.includes('rejected') || statusText.includes('representation') || statusText.includes('not interested')) {
        normalized.outreach_status = 'dead_lead'
      } else if (statusText.includes('phone') || statusText.includes('call') || statusText.includes('expecting') || statusText.includes('talking')) {
        normalized.outreach_status = 'in_conversation'
      } else if (statusText.includes('followed') || statusText.includes('contacted') || statusText.includes('reached')) {
        normalized.outreach_status = 'contacted'
      } else if (statusText === '' || !statusText) {
        normalized.outreach_status = 'not_contacted'
      } else {
        // Has some text but doesn't match patterns - mark as contacted
        normalized.outreach_status = 'contacted'
      }

      delete normalized.status_text
    }

    // Parse assignment_text - extract staff name from "Followed by Kaleb" or "followed by BC"
    if (normalized.assignment_text) {
      const assignmentText = String(normalized.assignment_text).trim()
      const match = assignmentText.match(/(?:followed|assigned|by)\s+(?:by\s+)?(\w+)/i)

      if (match) {
        normalized.assigned_staff_note = match[1]
      }

      // Also store full text in notes
      const existingNotes = normalized.notes ? String(normalized.notes) : ''
      if (assignmentText) {
        normalized.notes = existingNotes
          ? `${existingNotes}\n\nAssignment: ${assignmentText}`
          : `Assignment: ${assignmentText}`
      }

      delete normalized.assignment_text
    }

    // Normalize recruiting_status (if explicitly set)
    if (normalized.recruiting_status) {
      const status = String(normalized.recruiting_status).toLowerCase().trim()
      if (status.includes('not') || status === 'inactive') {
        normalized.recruiting_status = 'not_recruiting'
      } else if (status.includes('open') || status.includes('contact')) {
        normalized.recruiting_status = 'open_to_contact'
      } else if (status.includes('active') || status.includes('recruiting')) {
        normalized.recruiting_status = 'actively_recruiting'
      } else if (status.includes('commit')) {
        normalized.recruiting_status = 'committed'
      } else if (status.includes('sign')) {
        normalized.recruiting_status = 'signed'
      } else {
        normalized.recruiting_status = 'not_recruiting' // default
      }
    }

    // Normalize transfer_portal_status
    if (normalized.transfer_portal_status) {
      const status = String(normalized.transfer_portal_status).toLowerCase().trim()
      if (status.includes('not') || status === 'no' || status === 'n/a' || status === '') {
        normalized.transfer_portal_status = 'not_in_portal'
      } else if (status.includes('enter') || status.includes('in portal') || status === 'yes') {
        normalized.transfer_portal_status = 'entered_portal'
      } else if (status.includes('commit')) {
        normalized.transfer_portal_status = 'committed'
      } else if (status.includes('transfer')) {
        normalized.transfer_portal_status = 'transferred'
      } else {
        normalized.transfer_portal_status = 'not_in_portal' // default
      }
    }

    // Normalize class_year - handle both number (27, 28) and text (2027, '27, Class of 2027)
    if (normalized.class_year !== undefined && normalized.class_year !== null && normalized.class_year !== '') {
      const yearRaw = String(normalized.class_year).trim()
      const yearLower = yearRaw.toLowerCase()

      // Extract year number
      let yearNum: number | null = null

      // Check for 4-digit year
      const fourDigitMatch = yearRaw.match(/20(\d{2})/)
      if (fourDigitMatch) {
        yearNum = parseInt(fourDigitMatch[0])
      } else {
        // Check for 2-digit year (27, 28, '27, '28)
        const twoDigitMatch = yearRaw.match(/'?(\d{2})/)
        if (twoDigitMatch) {
          const twoDigit = parseInt(twoDigitMatch[1])
          if (twoDigit >= 24 && twoDigit <= 35) {
            yearNum = 2000 + twoDigit
          }
        }
      }

      if (yearNum && yearNum >= 2024 && yearNum <= 2035) {
        normalized.class_year = String(yearNum)
      } else if (yearLower.includes('pro') || yearLower.includes('professional')) {
        normalized.class_year = 'pro'
      } else if (yearLower.includes('fresh')) {
        normalized.class_year = '2028' // Approximate
      } else if (yearLower.includes('soph')) {
        normalized.class_year = '2027'
      } else if (yearLower.includes('junior') || yearLower.includes('jr')) {
        normalized.class_year = '2026'
      } else if (yearLower.includes('senior') || yearLower.includes('sr')) {
        normalized.class_year = '2025'
      } else {
        normalized.class_year = 'n_a'
      }
    }

    // Region - use sheet name directly, no mapping
    // Sheet names ARE the regions (Northwest, Southwest, South, Great Lakes, etc.)
    if (!normalized.region && normalized._sourceSheet) {
      normalized.region = String(normalized._sourceSheet)
    } else if (normalized.region) {
      // Keep as-is, just trim
      normalized.region = String(normalized.region).trim()
    }
    delete normalized._sourceSheet

    // Normalize outreach_status
    if (normalized.outreach_status) {
      const status = String(normalized.outreach_status).toLowerCase().trim()
      if (status.includes('not contacted') || status === 'no' || status === 'new' || status === '') {
        normalized.outreach_status = 'not_contacted'
      } else if (status.includes('contacted') || status === 'yes' || status === 'reached') {
        normalized.outreach_status = 'contacted'
      } else if (status.includes('conversation') || status.includes('talking') || status.includes('in touch')) {
        normalized.outreach_status = 'in_conversation'
      } else if (status.includes('interested') || status.includes('warm')) {
        normalized.outreach_status = 'interested'
      } else if (status.includes('committed') || status.includes('verbal')) {
        normalized.outreach_status = 'committed'
      } else if (status.includes('dead') || status.includes('cold') || status.includes('lost') || status.includes('declined')) {
        normalized.outreach_status = 'dead_lead'
      } else if (status.includes('circling') || status.includes('revisit') || status.includes('follow up')) {
        normalized.outreach_status = 'circling_back'
      } else if (status.includes('signed') || status.includes('closed')) {
        normalized.outreach_status = 'signed'
      } else {
        normalized.outreach_status = 'not_contacted' // default
      }
    }

    // Normalize marketability_score to number
    if (normalized.marketability_score !== undefined && normalized.marketability_score !== null && normalized.marketability_score !== '') {
      const score = Number(normalized.marketability_score)
      normalized.marketability_score = isNaN(score) ? null : Math.min(100, Math.max(0, score))
    } else {
      normalized.marketability_score = null
    }

    // Normalize eligibility_year to number
    if (normalized.eligibility_year !== undefined && normalized.eligibility_year !== null && normalized.eligibility_year !== '') {
      const year = Number(normalized.eligibility_year)
      normalized.eligibility_year = isNaN(year) ? null : year
    } else {
      normalized.eligibility_year = null
    }

    // Merge notes_extra into notes
    if (normalized.notes_extra) {
      const existingNotes = normalized.notes ? String(normalized.notes) : ''
      const extraNotes = String(normalized.notes_extra)
      normalized.notes = existingNotes ? `${existingNotes}\n\n${extraNotes}` : extraNotes
      delete normalized.notes_extra
    }

    // Sport is NOT auto-inferred - user will set manually after import

    // Ensure required fields have defaults
    if (!normalized.league_level) normalized.league_level = 'high_school'
    if (!normalized.recruiting_status) normalized.recruiting_status = 'not_recruiting'
    if (!normalized.transfer_portal_status) normalized.transfer_portal_status = 'not_in_portal'
    if (!normalized.class_year) normalized.class_year = 'n_a'
    if (!normalized.outreach_status) normalized.outreach_status = 'not_contacted'

    // Extract social media fields into social_media JSON
    const socialMedia: Record<string, unknown> = {}
    socialMediaFields.forEach(field => {
      if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== '') {
        // Convert follower counts to numbers
        if (field.includes('followers') || field.includes('subscribers') || field === 'nil_valuation') {
          const num = Number(normalized[field])
          if (!isNaN(num)) {
            socialMedia[field] = num
          }
        } else if (field === 'instagram_handle') {
          // Instagram - extract URL or handle
          let value = String(normalized[field]).trim()

          // Check if it's a hyperlink object (from Excel)
          if (typeof normalized[field] === 'object' && normalized[field] !== null) {
            const obj = normalized[field] as Record<string, unknown>
            if (obj.hyperlink) {
              value = String(obj.hyperlink)
            } else if (obj.text) {
              value = String(obj.text)
            }
          }

          // Extract handle from URL if it's a full URL
          if (value.includes('instagram.com/')) {
            const match = value.match(/instagram\.com\/([^/?]+)/)
            if (match) {
              socialMedia[field] = match[1]
            } else {
              socialMedia[field] = value
            }
          } else {
            // Clean up handle (remove @ if present)
            socialMedia[field] = value.startsWith('@') ? value.substring(1) : value
          }
        } else {
          // Clean up handles (remove @ if present)
          const value = String(normalized[field]).trim()
          socialMedia[field] = value.startsWith('@') ? value.substring(1) : value
        }
        delete normalized[field]
      }
    })
    if (Object.keys(socialMedia).length > 0) {
      normalized.social_media = socialMedia
    }

    // Extract sport-specific fields into sport_specific_stats JSON
    const sportStats: Record<string, unknown> = {}
    sportSpecificFields.forEach(field => {
      if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== '') {
        sportStats[field] = normalized[field]
        delete normalized[field]
      }
    })
    if (Object.keys(sportStats).length > 0) {
      normalized.sport_specific_stats = sportStats
    }

    return normalized
  })

  return { data: normalizedData, skippedRows }
}
