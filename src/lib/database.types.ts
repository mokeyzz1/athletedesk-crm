export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'agent' | 'scout' | 'marketing' | 'intern'
export type LeagueLevel = 'high_school' | 'college' | 'professional' | 'international'
export type RecruitingStatus = 'not_recruiting' | 'open_to_contact' | 'actively_recruiting' | 'committed' | 'signed'
export type TransferPortalStatus = 'not_in_portal' | 'entered_portal' | 'committed' | 'transferred'
export type CommunicationType = 'email' | 'call' | 'text' | 'zoom'
export type PipelineStage =
  | 'prospect_identified'
  | 'scout_evaluation'
  | 'initial_contact'
  | 'recruiting_conversation'
  | 'interested'
  | 'signing_in_progress'
  | 'signed_client'
export type PriorityLevel = 'high' | 'medium' | 'low'
export type OutreachMethod = 'email' | 'phone' | 'linkedin' | 'event'
export type ResponseStatus = 'no_response' | 'interested' | 'not_interested' | 'in_discussion' | 'deal_closed'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: UserRole
          google_sso_id: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: UserRole
          google_sso_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: UserRole
          google_sso_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      athletes: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          school: string | null
          sport: string
          position: string | null
          league_level: LeagueLevel
          eligibility_year: number | null
          recruiting_status: RecruitingStatus
          transfer_portal_status: TransferPortalStatus
          marketability_score: number | null
          sport_specific_stats: Json
          assigned_scout_id: string | null
          assigned_agent_id: string | null
          assigned_marketing_lead_id: string | null
          profile_image_url: string | null
          social_media: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          school?: string | null
          sport: string
          position?: string | null
          league_level?: LeagueLevel
          eligibility_year?: number | null
          recruiting_status?: RecruitingStatus
          transfer_portal_status?: TransferPortalStatus
          marketability_score?: number | null
          sport_specific_stats?: Json
          assigned_scout_id?: string | null
          assigned_agent_id?: string | null
          assigned_marketing_lead_id?: string | null
          profile_image_url?: string | null
          social_media?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          school?: string | null
          sport?: string
          position?: string | null
          league_level?: LeagueLevel
          eligibility_year?: number | null
          recruiting_status?: RecruitingStatus
          transfer_portal_status?: TransferPortalStatus
          marketability_score?: number | null
          sport_specific_stats?: Json
          assigned_scout_id?: string | null
          assigned_agent_id?: string | null
          assigned_marketing_lead_id?: string | null
          profile_image_url?: string | null
          social_media?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      communications_log: {
        Row: {
          id: string
          athlete_id: string
          staff_member_id: string
          communication_date: string
          type: CommunicationType
          subject: string | null
          notes: string | null
          follow_up_date: string | null
          follow_up_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          staff_member_id: string
          communication_date?: string
          type: CommunicationType
          subject?: string | null
          notes?: string | null
          follow_up_date?: string | null
          follow_up_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          staff_member_id?: string
          communication_date?: string
          type?: CommunicationType
          subject?: string | null
          notes?: string | null
          follow_up_date?: string | null
          follow_up_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recruiting_pipeline: {
        Row: {
          id: string
          athlete_id: string
          pipeline_stage: PipelineStage
          priority: PriorityLevel
          last_contact_date: string | null
          next_action: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          pipeline_stage?: PipelineStage
          priority?: PriorityLevel
          last_contact_date?: string | null
          next_action?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          pipeline_stage?: PipelineStage
          priority?: PriorityLevel
          last_contact_date?: string | null
          next_action?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brand_outreach: {
        Row: {
          id: string
          brand_name: string
          brand_contact_name: string | null
          brand_contact_email: string | null
          staff_member_id: string
          athlete_id: string
          date_contacted: string
          outreach_method: OutreachMethod
          response_status: ResponseStatus
          follow_up_date: string | null
          deal_value: number | null
          product_value: number | null
          campaign_details: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_name: string
          brand_contact_name?: string | null
          brand_contact_email?: string | null
          staff_member_id: string
          athlete_id: string
          date_contacted?: string
          outreach_method: OutreachMethod
          response_status?: ResponseStatus
          follow_up_date?: string | null
          deal_value?: number | null
          product_value?: number | null
          campaign_details?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_name?: string
          brand_contact_name?: string | null
          brand_contact_email?: string | null
          staff_member_id?: string
          athlete_id?: string
          date_contacted?: string
          outreach_method?: OutreachMethod
          response_status?: ResponseStatus
          follow_up_date?: string | null
          deal_value?: number | null
          product_value?: number | null
          campaign_details?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_tracking: {
        Row: {
          id: string
          athlete_id: string
          brand_outreach_id: string | null
          deal_name: string
          deal_value: number
          agency_percentage: number
          agency_fee: number
          athlete_payout: number
          payment_status: PaymentStatus
          deal_date: string
          invoice_date: string | null
          payment_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          brand_outreach_id?: string | null
          deal_name: string
          deal_value: number
          agency_percentage: number
          payment_status?: PaymentStatus
          deal_date?: string
          invoice_date?: string | null
          payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          brand_outreach_id?: string | null
          deal_name?: string
          deal_value?: number
          agency_percentage?: number
          payment_status?: PaymentStatus
          deal_date?: string
          invoice_date?: string | null
          payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          athlete_id: string
          uploaded_by: string
          name: string
          file_type: string
          file_size: number
          storage_path: string
          document_type: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          uploaded_by: string
          name: string
          file_type: string
          file_size: number
          storage_path: string
          document_type?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          uploaded_by?: string
          name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          document_type?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assigned_to: string
          created_by: string
          athlete_id: string | null
          due_date: string | null
          priority: PriorityLevel
          status: TaskStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assigned_to: string
          created_by: string
          athlete_id?: string | null
          due_date?: string | null
          priority?: PriorityLevel
          status?: TaskStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assigned_to?: string
          created_by?: string
          athlete_id?: string | null
          due_date?: string | null
          priority?: PriorityLevel
          status?: TaskStatus
          created_at?: string
          updated_at?: string
        }
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          updated_at?: string
        }
      }
      comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: {
      dashboard_summary: {
        Row: {
          total_athletes: number
          actively_recruiting: number
          in_portal: number
          signed_clients: number
          active_brand_discussions: number
          total_revenue: number
          pending_revenue: number
        }
      }
      athletes_with_pipeline: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          school: string | null
          sport: string
          position: string | null
          league_level: LeagueLevel
          eligibility_year: number | null
          recruiting_status: RecruitingStatus
          transfer_portal_status: TransferPortalStatus
          marketability_score: number | null
          sport_specific_stats: Json
          assigned_scout_id: string | null
          assigned_agent_id: string | null
          assigned_marketing_lead_id: string | null
          profile_image_url: string | null
          social_media: Json
          notes: string | null
          created_at: string
          updated_at: string
          pipeline_stage: PipelineStage | null
          priority: PriorityLevel | null
          last_contact_date: string | null
          scout_name: string | null
          agent_name: string | null
          marketing_lead_name: string | null
        }
      }
      pending_follow_ups: {
        Row: {
          id: string
          follow_up_date: string
          subject: string | null
          notes: string | null
          athlete_name: string
          athlete_id: string
          staff_name: string
          staff_id: string
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      get_current_user_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      league_level: LeagueLevel
      recruiting_status: RecruitingStatus
      transfer_portal_status: TransferPortalStatus
      communication_type: CommunicationType
      pipeline_stage: PipelineStage
      priority_level: PriorityLevel
      outreach_method: OutreachMethod
      response_status: ResponseStatus
      payment_status: PaymentStatus
      task_status: TaskStatus
    }
  }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Athlete = Database['public']['Tables']['athletes']['Row']
export type CommunicationLog = Database['public']['Tables']['communications_log']['Row']
export type RecruitingPipeline = Database['public']['Tables']['recruiting_pipeline']['Row']
export type BrandOutreach = Database['public']['Tables']['brand_outreach']['Row']
export type FinancialTracking = Database['public']['Tables']['financial_tracking']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type AthleteInsert = Database['public']['Tables']['athletes']['Insert']
export type CommunicationLogInsert = Database['public']['Tables']['communications_log']['Insert']
export type RecruitingPipelineInsert = Database['public']['Tables']['recruiting_pipeline']['Insert']
export type BrandOutreachInsert = Database['public']['Tables']['brand_outreach']['Insert']
export type FinancialTrackingInsert = Database['public']['Tables']['financial_tracking']['Insert']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type TaskComment = Database['public']['Tables']['task_comments']['Row']
export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert']
export type CommentMention = Database['public']['Tables']['comment_mentions']['Row']
export type CommentMentionInsert = Database['public']['Tables']['comment_mentions']['Insert']

export type AthleteWithPipeline = Database['public']['Views']['athletes_with_pipeline']['Row']
export type DashboardSummary = Database['public']['Views']['dashboard_summary']['Row']
export type PendingFollowUp = Database['public']['Views']['pending_follow_ups']['Row']
