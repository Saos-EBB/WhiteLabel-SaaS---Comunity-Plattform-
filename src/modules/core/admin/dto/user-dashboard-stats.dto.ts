export class UserDashboardStatsDto {
    pendingRequests!: number;
    activeConversations!: number;
    subscription!: { plan: string; status: string; expires_at: string | null } | null;
}
