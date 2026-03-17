'use client'

import { getFieldsForSport, supportedSports, type SportField } from '@/lib/sport-fields'

interface SportSpecificFieldsProps {
  sport: string
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

export function SportSpecificFields({ sport, values, onChange }: SportSpecificFieldsProps) {
  const fields = getFieldsForSport(sport)

  if (fields.length === 0) {
    return null
  }

  const handleFieldChange = (key: string, value: string | number) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {sport} Stats
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field: SportField) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="label">
              {field.label}
            </label>
            <div className="mt-1 relative">
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                name={field.key}
                id={field.key}
                value={String(values[field.key] ?? '')}
                onChange={(e) => handleFieldChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={field.placeholder}
                className={`input ${field.suffix ? 'pr-12' : ''}`}
              />
              {field.suffix && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                  {field.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SportSelectProps {
  value: string
  onChange: (sport: string) => void
  required?: boolean
}

export function SportSelect({ value, onChange, required }: SportSelectProps) {
  return (
    <div>
      <label htmlFor="sport" className="label">Sport {required && '*'}</label>
      <select
        name="sport"
        id="sport"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 input"
      >
        <option value="">Select a sport</option>
        {supportedSports.map((sport) => (
          <option key={sport} value={sport}>{sport}</option>
        ))}
        <option value="Other">Other</option>
      </select>
      {value === 'Other' && (
        <input
          type="text"
          name="sport_other"
          placeholder="Enter sport name"
          className="mt-2 input"
          required={required}
        />
      )}
    </div>
  )
}
