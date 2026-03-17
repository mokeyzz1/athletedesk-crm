import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-600 font-bold text-xl">AD</span>
            </div>
            <span className="text-white font-semibold text-xl">AthleteDesk</span>
          </div>
          <Link
            href="/login"
            className="btn-primary bg-white text-brand-600 hover:bg-gray-100"
          >
            Sign In
          </Link>
        </nav>

        <main className="py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              The CRM Built for
              <br />
              <span className="text-brand-300">Sports Agencies</span>
            </h1>
            <p className="text-xl text-brand-200 max-w-2xl mx-auto mb-10">
              Manage your athletes, track brand deals, streamline recruiting pipelines,
              and grow your agency with one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="btn-primary text-lg px-8 py-3">
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Athlete Management</h3>
              <p className="text-brand-200">
                Track every athlete from prospect to signed client with detailed profiles and sport-specific stats.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Deal Tracking</h3>
              <p className="text-brand-200">
                Manage brand partnerships and financial deals with real-time revenue tracking and reporting.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pipeline Analytics</h3>
              <p className="text-brand-200">
                Visualize your recruiting pipeline and track progress from first contact to signed contract.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
