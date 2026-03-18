'use client'

import { useState, useRef, useCallback } from 'react'
import type { User } from '@/lib/database.types'

interface MentionInputProps {
  users: User[]
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>
  placeholder?: string
  disabled?: boolean
}

export function MentionInput({ users, onSubmit, placeholder, disabled }: MentionInputProps) {
  const [content, setContent] = useState('')
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, User>>(new Map())
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setContent(value)

    // Find @ symbol before cursor
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      const filtered = users.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      )
      setSuggestions(filtered.slice(0, 5))
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [users])

  const insertMention = useCallback((user: User) => {
    if (!textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart || 0
    const textBeforeCursor = content.slice(0, cursorPos)
    const textAfterCursor = content.slice(cursorPos)

    // Find and replace @query with @username
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const newText =
      textBeforeCursor.slice(0, atIndex) +
      `@${user.name} ` +
      textAfterCursor

    setContent(newText)
    setMentionedUsers(prev => new Map(prev).set(user.id, user))
    setShowSuggestions(false)

    // Focus textarea and set cursor after inserted mention
    setTimeout(() => {
      textareaRef.current?.focus()
      const newCursorPos = atIndex + user.name.length + 2 // @ + name + space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [content])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          insertMention(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
      case 'Tab':
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          insertMention(suggestions[selectedIndex])
        }
        break
    }
  }, [showSuggestions, suggestions, selectedIndex, insertMention])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Extract all mentioned user IDs from the content
      const mentionedIds = Array.from(mentionedUsers.values())
        .filter(user => content.includes(`@${user.name}`))
        .map(user => user.id)

      await onSubmit(content, mentionedIds)
      setContent('')
      setMentionedUsers(new Map())
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Add a comment...'}
        disabled={disabled || isSubmitting}
        className="input w-full resize-none disabled:bg-gray-100"
        rows={3}
      />

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded border border-gray-200 z-50 max-h-48 overflow-y-auto">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left ${
                index === selectedIndex ? 'bg-brand-50' : ''
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-brand-700">
                    {getInitials(user.name)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || !content.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Posting...
            </>
          ) : (
            'Post Comment'
          )}
        </button>
      </div>
    </div>
  )
}
