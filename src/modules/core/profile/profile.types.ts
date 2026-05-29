export type ConnectionStatus = 'NONE' | 'SENT' | 'RECEIVED' | 'CONNECTED' | 'BLOCKED';

export interface ProfileView {
    id: string;
    userId: string;
    nickname: string;
    bio: string | null;
    city: string | null;
    birthdate: string;
    gender: string | null;
    lookingFor: string | null;
    isPublished: boolean;
    onboardingCompleted: boolean;
    langSimple: boolean;
    fontSize: string;
    highContrast: boolean;
    searchRadiusKm: number;
    profanityFilter: boolean;
    statusVisible: boolean;
    statusMessage: string | null;
    showBio: boolean;
    showCity: boolean;
    showAge: boolean;
    showGender: boolean;
    showInterests: boolean;
    showAudio: boolean;
    lastActiveAt: Date | null;
    updatedAt: Date;
    photoUrl: string | null;
    photoNeedsReview: boolean;
    audioUrl: string | null;
    audioModerationStatus: string | null;
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    subscriptionCurrentPeriodEnd: string | null;
    isBanned: boolean;
    publicId: string | null;
}

export interface PublicProfile {
    id: string;
    userId: string;
    nickname: string;
    bio: string | null;
    city: string | null;
    birthdate: string | null;
    gender: string | null;
    lookingFor: string | null;
    statusVisible: boolean;
    statusMessage: string | null;
    photoUrl: string | null;
    photoNeedsReview: boolean;
    audioUrl: string | null;
    isOnline: boolean;
    connectionStatus: ConnectionStatus;
    requestId: string | null;
    conversationId: string | null;
    publicId: string | null;
}
