// Sport-specific field configurations

export interface SportField {
  key: string
  label: string
  type: 'text' | 'number' | 'url'
  placeholder?: string
  suffix?: string
}

export interface SportFieldConfig {
  sport: string
  fields: SportField[]
}

export const sportFieldConfigs: SportFieldConfig[] = [
  {
    sport: 'Football',
    fields: [
      { key: 'height', label: 'Height', type: 'text', placeholder: "6'2\"" },
      { key: 'weight', label: 'Weight', type: 'number', placeholder: '220', suffix: 'lbs' },
      { key: 'forty_yard_dash', label: '40 Yard Dash', type: 'text', placeholder: '4.45' },
      { key: 'position_group', label: 'Position Group', type: 'text', placeholder: 'e.g., Offensive Line, Secondary' },
      { key: 'school_offers', label: 'School Offers', type: 'text', placeholder: 'e.g., Alabama, Ohio State, Georgia' },
      { key: 'hudl_link', label: 'Hudl Film Link', type: 'url', placeholder: 'https://hudl.com/...' },
    ],
  },
  {
    sport: 'Basketball',
    fields: [
      { key: 'height', label: 'Height', type: 'text', placeholder: "6'5\"" },
      { key: 'weight', label: 'Weight', type: 'number', placeholder: '195', suffix: 'lbs' },
      { key: 'position', label: 'Position', type: 'text', placeholder: 'e.g., Point Guard, Center' },
      { key: 'ppg', label: 'Points Per Game', type: 'number', placeholder: '18.5' },
      { key: 'recruiting_ranking', label: 'Recruiting Ranking', type: 'text', placeholder: 'e.g., 5-star, Top 50' },
      { key: 'offers', label: 'Offers', type: 'text', placeholder: 'e.g., Duke, Kentucky, Kansas' },
    ],
  },
  {
    sport: 'Track & Field',
    fields: [
      { key: 'event', label: 'Primary Event', type: 'text', placeholder: 'e.g., 100m, Long Jump, Shot Put' },
      { key: 'personal_best', label: 'Personal Best', type: 'text', placeholder: 'e.g., 10.45s, 7.85m' },
      { key: 'national_ranking', label: 'National Ranking', type: 'text', placeholder: 'e.g., #15 nationally' },
      { key: 'conference', label: 'Conference', type: 'text', placeholder: 'e.g., SEC, Big Ten' },
    ],
  },
  {
    sport: 'Soccer',
    fields: [
      { key: 'position', label: 'Position', type: 'text', placeholder: 'e.g., Striker, Midfielder, Goalkeeper' },
      { key: 'goals', label: 'Goals', type: 'number', placeholder: '15' },
      { key: 'assists', label: 'Assists', type: 'number', placeholder: '8' },
      { key: 'club_team', label: 'Club Team', type: 'text', placeholder: 'e.g., LA Galaxy Academy' },
      { key: 'international_eligibility', label: 'International Eligibility', type: 'text', placeholder: 'e.g., USA, dual eligible' },
    ],
  },
  {
    sport: 'Tennis',
    fields: [
      { key: 'utr_rating', label: 'UTR Rating', type: 'text', placeholder: 'e.g., 12.5' },
      { key: 'singles_ranking', label: 'Singles Ranking', type: 'text', placeholder: 'e.g., #45 nationally' },
      { key: 'doubles_ranking', label: 'Doubles Ranking', type: 'text', placeholder: 'e.g., #30 nationally' },
    ],
  },
  {
    sport: 'Baseball',
    fields: [
      { key: 'position', label: 'Position', type: 'text', placeholder: 'e.g., Pitcher, Shortstop, Outfield' },
      { key: 'batting_average', label: 'Batting Average', type: 'text', placeholder: '.325' },
      { key: 'era', label: 'ERA (if pitcher)', type: 'text', placeholder: '2.85' },
      { key: 'velocity', label: 'Velocity (if pitcher)', type: 'text', placeholder: '95 mph' },
      { key: 'offers', label: 'Offers', type: 'text', placeholder: 'e.g., Vanderbilt, LSU, Texas' },
    ],
  },
]

export const supportedSports = sportFieldConfigs.map(c => c.sport)

export function getFieldsForSport(sport: string): SportField[] {
  const normalizedSport = sport.toLowerCase().trim()
  const config = sportFieldConfigs.find(
    c => c.sport.toLowerCase() === normalizedSport
  )
  return config?.fields ?? []
}

// Social media field types
export interface SocialMediaData {
  instagram_handle?: string
  instagram_followers?: number
  twitter_handle?: string
  twitter_followers?: number
  tiktok_handle?: string
  tiktok_followers?: number
  youtube_channel?: string
  youtube_subscribers?: number
  nil_valuation?: number
}

export function calculateTotalFollowing(socialMedia: SocialMediaData): number {
  return (
    (socialMedia.instagram_followers || 0) +
    (socialMedia.twitter_followers || 0) +
    (socialMedia.tiktok_followers || 0) +
    (socialMedia.youtube_subscribers || 0)
  )
}

export function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
