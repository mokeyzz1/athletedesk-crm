'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, TaskComment } from '@/lib/database.types'
import { MentionInput } from './mention-input'

interface TaskCommentWithAuthor extends TaskComment {
  author: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface TaskCommentsProps {
  taskId: string
  currentUser: User
  canComment: boolean
  users: User[]
}

export function TaskComments({ taskId, currentUser, canComment, users }: TaskCommentsProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<TaskCommentWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchComments() {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:author_id(id, name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(data as TaskCommentWithAuthor[])
      }
      setIsLoading(false)
    }

    fetchComments()
  }, [supabase, taskId])

  const handleSubmitComment = async (content: string, mentionedUserIds: string[]) => {
    // Insert the comment
    const { data: newComment, error: commentError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author_id: currentUser.id,
        content: content
      })
      .select(`
        *,
        author:author_id(id, name, avatar_url)
      `)
      .single()

    if (commentError) {
      console.error('Error posting comment:', commentError)
      return
    }

    // Insert mentions (if any)
    if (mentionedUserIds.length > 0) {
      const mentions = mentionedUserIds.map(userId => ({
        comment_id: newComment.id,
        mentioned_user_id: userId
      }))

      await supabase.from('comment_mentions').insert(mentions)
    }

    // Update local state
    setComments(prev => [...prev, newComment as TaskCommentWithAuthor])
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const renderCommentWithMentions = (content: string) => {
    // Split by @mention pattern (@ followed by words)
    const parts = content.split(/(@[A-Za-z]+(?:\s[A-Za-z]+)?)/g)

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-brand-600 font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
      </h2>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="flow-root mb-6">
          <ul className="-mb-8">
            {comments.map((comment, idx) => (
              <li key={comment.id}>
                <div className="relative pb-8">
                  {/* Connector line */}
                  {idx !== comments.length - 1 && (
                    <span className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  <div className="relative flex space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {comment.author.avatar_url ? (
                        <img
                          src={comment.author.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-brand-700">
                            {getInitials(comment.author.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{comment.author.name}</span>
                        <span className="text-gray-500 ml-2">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                        {renderCommentWithMentions(comment.content)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-6 mb-4">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-gray-500 mt-1">No comments yet</p>
        </div>
      )}

      {/* Comment Input */}
      {canComment && (
        <MentionInput
          users={users}
          onSubmit={handleSubmitComment}
          placeholder="Add a comment... Use @ to mention someone"
        />
      )}
    </div>
  )
}
