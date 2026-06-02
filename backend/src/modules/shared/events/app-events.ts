import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface BeefVoteEvent {
    beefId: string;
    initiatorCoins: number;
    targetCoins: number;
    totalVotes: number;
}

export interface BeefCommentEvent {
    beefId: string;
    comment: {
        id: string;
        user_id: string;
        content: string;
        created_at: Date;
        nickname: string | null;
    };
}

export interface BeefClosedEvent {
    beefId: string;
    winnerId: string | null;
}

export interface ContactRequestEvent {
    requestId: string;
    senderId: string;
    receiverId: string;
}

// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------

export const AppEvents = {
    beefVote:       'hidden.beef.vote',
    beefComment:    'hidden.beef.comment',
    beefClosed:     'hidden.beef.closed',
    contactRequest: 'contact_request.created',
} as const;

// ---------------------------------------------------------------------------
// Typed event map (event name → payload)
// ---------------------------------------------------------------------------

type EventPayloadMap = {
    [AppEvents.beefVote]:       BeefVoteEvent;
    [AppEvents.beefComment]:    BeefCommentEvent;
    [AppEvents.beefClosed]:     BeefClosedEvent;
    [AppEvents.contactRequest]: ContactRequestEvent;
};

// ---------------------------------------------------------------------------
// TypedEventBus
// Wraps EventEmitter2 to enforce payload types at emit sites.
// At @OnEvent listen sites use AppEvents.xxx as the decorator argument and
// type the handler parameter with the corresponding payload interface.
// ---------------------------------------------------------------------------

@Injectable()
export class TypedEventBus {
    constructor(private readonly emitter: EventEmitter2) {}

    emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): void {
        this.emitter.emit(event, payload);
    }
}
