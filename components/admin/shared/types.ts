export interface PendingMedia {
  id: string
  file_url: string
  file_type: string
  uploaded_at: string
  uploaded_by: string
  nickname: string | null
}

export type MediaFilter = 'all' | 'image' | 'audio'

export interface AdminUser {
  id: string
  role: string
  is_banned: boolean
  ban_reason: string | null
  ban_expires_at: string | null
  is_verified: boolean
  vulnerable_flag: boolean
  created_at: string
  last_login: string | null
  nickname: string | null
  photo_id: string | null
}

export interface AdminReport {
  id: string
  status: string
  reason: string
  reporter_id: string
  reported_user_id: string
  reporter_nickname: string | null
  reported_nickname: string | null
  created_at: string
  note: string | null
}

export interface AdminStrike {
  id: string
  user_id: string
  type: string
  reason: string
  expires_at: string | null
  ban_lifted_at: string | null
  created_at: string
  user_nickname: string | null
}

export interface ProfanityWord {
  word: string
  added_by: string | null
  added_at: string
}

export interface SystemSetting {
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}

export interface AdminEntry {
  id: string
  role: string
  is_banned: boolean
  is_verified: boolean
  created_at: string
  last_login: string | null
  nickname: string | null
  photo_id: string | null
}

export interface AdminTicket {
  id: string
  type: string
  status: string
  source: string | null
  context: {
    email: string
    nickname: string | null
    public_id: string | null
    message: string
  }
  created_at: string
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  bannedUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  activeSubscriptions: number
  totalRevenue: number
  onlineUsers: number
  messagesToday: number
  messagesThisWeek: number
  contactRequestsToday: number
  contactRequestsThisWeek: number
  openReports: number
  strikesThisWeek: number
  openTickets: number
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export type BanInfo = { userId: string; nickname: string; reportId?: string }
