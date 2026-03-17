'use client'

import { type SocialMediaData, calculateTotalFollowing, formatFollowerCount } from '@/lib/sport-fields'

interface SocialMediaFieldsProps {
  values: SocialMediaData
  onChange: (values: SocialMediaData) => void
}

export function SocialMediaFields({ values, onChange }: SocialMediaFieldsProps) {
  const handleChange = (key: keyof SocialMediaData, value: string | number) => {
    onChange({ ...values, [key]: value })
  }

  const totalFollowing = calculateTotalFollowing(values)

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Social Media</h2>
        {totalFollowing > 0 && (
          <div className="text-sm">
            <span className="text-gray-500">Total Reach: </span>
            <span className="font-semibold text-brand-600">{formatFollowerCount(totalFollowing)}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Instagram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="instagram_handle" className="label flex items-center gap-2">
              <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram Handle
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
              <input
                type="text"
                id="instagram_handle"
                value={values.instagram_handle || ''}
                onChange={(e) => handleChange('instagram_handle', e.target.value)}
                placeholder="username"
                className="input pl-8"
              />
            </div>
          </div>
          <div>
            <label htmlFor="instagram_followers" className="label">Followers</label>
            <input
              type="number"
              id="instagram_followers"
              value={values.instagram_followers || ''}
              onChange={(e) => handleChange('instagram_followers', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1 input"
            />
          </div>
        </div>

        {/* Twitter/X */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="twitter_handle" className="label flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter) Handle
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
              <input
                type="text"
                id="twitter_handle"
                value={values.twitter_handle || ''}
                onChange={(e) => handleChange('twitter_handle', e.target.value)}
                placeholder="username"
                className="input pl-8"
              />
            </div>
          </div>
          <div>
            <label htmlFor="twitter_followers" className="label">Followers</label>
            <input
              type="number"
              id="twitter_followers"
              value={values.twitter_followers || ''}
              onChange={(e) => handleChange('twitter_followers', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1 input"
            />
          </div>
        </div>

        {/* TikTok */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tiktok_handle" className="label flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
              TikTok Handle
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
              <input
                type="text"
                id="tiktok_handle"
                value={values.tiktok_handle || ''}
                onChange={(e) => handleChange('tiktok_handle', e.target.value)}
                placeholder="username"
                className="input pl-8"
              />
            </div>
          </div>
          <div>
            <label htmlFor="tiktok_followers" className="label">Followers</label>
            <input
              type="number"
              id="tiktok_followers"
              value={values.tiktok_followers || ''}
              onChange={(e) => handleChange('tiktok_followers', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1 input"
            />
          </div>
        </div>

        {/* YouTube */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="youtube_channel" className="label flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube Channel
            </label>
            <input
              type="text"
              id="youtube_channel"
              value={values.youtube_channel || ''}
              onChange={(e) => handleChange('youtube_channel', e.target.value)}
              placeholder="Channel name or URL"
              className="mt-1 input"
            />
          </div>
          <div>
            <label htmlFor="youtube_subscribers" className="label">Subscribers</label>
            <input
              type="number"
              id="youtube_subscribers"
              value={values.youtube_subscribers || ''}
              onChange={(e) => handleChange('youtube_subscribers', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1 input"
            />
          </div>
        </div>

        {/* NIL Valuation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nil_valuation" className="label">NIL Valuation (Estimated)</label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <input
                type="number"
                id="nil_valuation"
                value={values.nil_valuation || ''}
                onChange={(e) => handleChange('nil_valuation', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="input pl-8"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
