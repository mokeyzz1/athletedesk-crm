'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsClientProps {
  recruitingData: {
    totalProspects: number
    outreachFunnel: Record<string, number>
    classYearCounts: Record<string, number>
    regionStats: Record<string, { total: number; contacted: number }>
    contactedThisWeek: number
    contactedLastWeek: number
  }
  teamData: {
    users: { id: string; name: string; role: string }[]
    commsPerStaff: Record<string, number>
    assignmentsPerUser: Record<string, number>
    lastActivityPerUser: Record<string, string>
    goals: { id: string; staff_id: string | null; target_count: number; period: string }[]
  }
  revenueData: {
    byMonth: Record<string, number>
    byType: Record<string, number>
    paymentStatus: Record<string, number>
  }
  pipelineData: {
    stageCounts: Record<string, number>
    staleAthletes: { id: string; name: string; outreach_status: string; updated_at: string; region: string | null }[]
  }
}

type TimeRange = 'week' | 'month' | '3months' | 'all'

const STATUS_LABELS: Record<string, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  in_conversation: 'In Conversation',
  interested: 'Interested',
  signed: 'Signed',
  dead_lead: 'Dead Lead',
  circling_back: 'Circling Back',
}

const PIPELINE_LABELS: Record<string, string> = {
  prospect_identified: 'Prospect Identified',
  scout_evaluation: 'Scout Evaluation',
  initial_contact: 'Initial Contact',
  recruiting_conversation: 'Recruiting Conversation',
  interested: 'Interested',
  signing_in_progress: 'Signing in Progress',
  signed_client: 'Signed Client',
}

const CLASS_YEAR_LABELS: Record<string, string> = {
  '2025': '2025',
  '2026': '2026',
  '2027': '2027',
  '2028': '2028',
  '2029': '2029',
  '2030': '2030',
  'pro': 'Pro',
  'n_a': 'N/A',
}

export function AnalyticsClient({
  recruitingData,
  teamData,
  revenueData,
  pipelineData,
}: AnalyticsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timeRange = (searchParams.get('range') as TimeRange) || 'month'

  const setTimeRange = (range: TimeRange) => {
    router.push(`/analytics?range=${range}`)
  }

  // Calculate contact rate change
  const contactRateChange = recruitingData.contactedLastWeek > 0
    ? Math.round(((recruitingData.contactedThisWeek - recruitingData.contactedLastWeek) / recruitingData.contactedLastWeek) * 100)
    : recruitingData.contactedThisWeek > 0 ? 100 : 0

  // Prepare funnel data (only main progression)
  const funnelStatuses = ['not_contacted', 'contacted', 'in_conversation', 'interested', 'signed']
  const funnelData = {
    labels: funnelStatuses.map(s => STATUS_LABELS[s]),
    datasets: [{
      label: 'Athletes',
      data: funnelStatuses.map(s => recruitingData.outreachFunnel[s] || 0),
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)', // gray
        'rgba(59, 130, 246, 0.8)',  // blue
        'rgba(168, 85, 247, 0.8)',  // purple
        'rgba(34, 197, 94, 0.8)',   // green
        'rgba(16, 185, 129, 0.8)',  // emerald
      ],
      borderRadius: 4,
    }],
  }

  // Prepare class year data
  const classYears = ['2025', '2026', '2027', '2028', '2029', '2030', 'pro']
  const classYearData = {
    labels: classYears.map(y => CLASS_YEAR_LABELS[y] || y),
    datasets: [{
      label: 'Prospects',
      data: classYears.map(y => recruitingData.classYearCounts[y] || 0),
      backgroundColor: 'rgba(79, 70, 229, 0.8)',
      borderRadius: 4,
    }],
  }

  // Prepare revenue by month data
  const sortedMonths = Object.keys(revenueData.byMonth).sort()
  const revenueLineData = {
    labels: sortedMonths.map(m => {
      const [year, month] = m.split('-')
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }),
    datasets: [{
      label: 'Revenue',
      data: sortedMonths.map(m => revenueData.byMonth[m]),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.3,
    }],
  }

  // Prepare revenue by type donut
  const revenueDonutData = {
    labels: ['Revenue Share', 'Marketing/Brand'],
    datasets: [{
      data: [revenueData.byType.revenue_share || 0, revenueData.byType.marketing_brand || 0],
      backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(168, 85, 247, 0.8)'],
      borderWidth: 0,
    }],
  }

  // Prepare pipeline funnel
  const pipelineStages = ['prospect_identified', 'scout_evaluation', 'initial_contact', 'recruiting_conversation', 'interested', 'signing_in_progress', 'signed_client']
  const pipelineFunnelData = {
    labels: pipelineStages.map(s => PIPELINE_LABELS[s]),
    datasets: [{
      label: 'Athletes',
      data: pipelineStages.map(s => pipelineData.stageCounts[s] || 0),
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)',
        'rgba(96, 165, 250, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(250, 204, 21, 0.8)',
        'rgba(16, 185, 129, 0.8)',
      ],
      borderRadius: 4,
    }],
  }

  // Calculate inactive staff (3+ days no activity)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const inactiveStaff = teamData.users.filter(user => {
    const lastActivity = teamData.lastActivityPerUser[user.id]
    if (!lastActivity) return true
    return new Date(lastActivity) < threeDaysAgo
  })

  // Sort regions by total
  const sortedRegions = Object.entries(recruitingData.regionStats)
    .sort((a, b) => b[1].total - a[1].total)

  // Total revenue
  const totalRevenue = Object.values(revenueData.byMonth).reduce((a, b) => a + b, 0)

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-16 md:h-[92px] flex items-center justify-between px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Performance insights and trends</p>
        </div>
        <div className="flex items-center gap-2">
          {(['week', 'month', '3months', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range === 'week' && 'This Week'}
              {range === 'month' && 'This Month'}
              {range === '3months' && 'Last 3 Months'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Section 1: Recruiting Overview */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Recruiting Overview</h2>

          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Prospects</p>
              <p className="text-2xl font-bold text-gray-900">{recruitingData.totalProspects.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Contacted This Week</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{recruitingData.contactedThisWeek}</p>
                <span className={`text-sm font-medium ${contactRateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {contactRateChange >= 0 ? '+' : ''}{contactRateChange}%
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Interested</p>
              <p className="text-2xl font-bold text-green-600">{recruitingData.outreachFunnel.interested || 0}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Signed (All Time)</p>
              <p className="text-2xl font-bold text-emerald-600">{recruitingData.outreachFunnel.signed || 0}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Conversion Funnel</h3>
              <div className="h-64">
                <Bar data={funnelData} options={chartOptions} />
              </div>
            </div>

            {/* Class Year Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Class Year Breakdown</h3>
              <div className="h-64">
                <Bar data={classYearData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Region Performance Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Region Performance</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Region</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Total</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Contacted</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedRegions.map(([region, stats]) => (
                  <tr key={region}>
                    <td className="px-4 py-2 text-sm text-gray-900">{region}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">{stats.total}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">{stats.contacted}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      <span className={`font-medium ${stats.total > 0 && (stats.contacted / stats.total) >= 0.5 ? 'text-green-600' : 'text-gray-600'}`}>
                        {stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Team Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Team Performance</h2>
            <Link href="/team/productivity" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View Full Report →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Staff Leaderboard */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Staff Activity This Week</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Name</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Comms</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamData.users
                    .sort((a, b) => (teamData.commsPerStaff[b.id] || 0) - (teamData.commsPerStaff[a.id] || 0))
                    .slice(0, 5)
                    .map(user => (
                      <tr key={user.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">{teamData.commsPerStaff[user.id] || 0}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">{teamData.assignmentsPerUser[user.id] || 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Inactive Staff Alert */}
            {inactiveStaff.length === 0 ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">All Clear</p>
                    <p className="text-sm text-green-600">Everyone has been active in the last 3 days</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Needs Follow-up</p>
                    <p className="text-sm text-amber-600">{inactiveStaff.length} team member{inactiveStaff.length > 1 ? 's' : ''} haven&apos;t logged activity in 3+ days</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {inactiveStaff.slice(0, 6).map(user => {
                    const lastActivity = teamData.lastActivityPerUser[user.id]
                    const daysAgo = lastActivity
                      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
                      : null
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2.5 bg-white/80 backdrop-blur rounded-lg border border-amber-100"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500">
                            {daysAgo !== null ? `${daysAgo} days ago` : 'No activity'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {inactiveStaff.length > 6 && (
                  <p className="text-xs text-amber-600 mt-3 text-center">
                    +{inactiveStaff.length - 6} more team members
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Revenue */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Revenue</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Revenue Over Time */}
            <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Revenue by Month</h3>
                <p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-64">
                <Line data={revenueLineData} options={chartOptions} />
              </div>
            </div>

            {/* Revenue by Type */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Revenue by Type</h3>
              <div className="h-48">
                <Doughnut data={revenueDonutData} options={donutOptions} />
              </div>
            </div>
          </div>

          {/* Payment Status Table */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Status</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 uppercase font-medium">Pending</p>
                <p className="text-xl font-bold text-amber-700">${(revenueData.paymentStatus.pending || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 uppercase font-medium">Invoiced</p>
                <p className="text-xl font-bold text-blue-700">${(revenueData.paymentStatus.invoiced || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 uppercase font-medium">Paid</p>
                <p className="text-xl font-bold text-green-700">${(revenueData.paymentStatus.paid || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Pipeline Health */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Pipeline Health</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Pipeline Stages</h3>
              <div className="h-64">
                <Bar data={pipelineFunnelData} options={{
                  ...chartOptions,
                  indexAxis: 'y' as const,
                }} />
              </div>
            </div>

            {/* Stale Athletes */}
            {pipelineData.staleAthletes.length === 0 ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Pipeline Moving</p>
                    <p className="text-sm text-green-600">No prospects stuck for 2+ weeks</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border border-rose-200 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-800">Stale Prospects</p>
                    <p className="text-sm text-rose-600">{pipelineData.staleAthletes.length} prospect{pipelineData.staleAthletes.length > 1 ? 's' : ''} stuck for 2+ weeks</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pipelineData.staleAthletes.map(athlete => {
                    const daysSince = Math.floor((Date.now() - new Date(athlete.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <Link
                        key={athlete.id}
                        href={`/athletes/${athlete.id}`}
                        className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-lg border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                          {athlete.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{athlete.name}</p>
                          <p className="text-xs text-gray-500">{athlete.region || 'No region'} • {STATUS_LABELS[athlete.outreach_status]}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-rose-600">{daysSince}d</p>
                          <p className="text-xs text-gray-400">stuck</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
