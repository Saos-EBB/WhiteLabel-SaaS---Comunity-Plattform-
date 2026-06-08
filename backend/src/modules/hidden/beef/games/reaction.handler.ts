import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

interface ReactionState {
    go_sent_at: number | null;        // server timestamp ms when game:go was emitted
    initiator_reaction_ms: number | null;
    target_reaction_ms: number | null;
    winner_id: string | null;
}

@Injectable()
export class ReactionHandler implements GameHandler {
    readonly gameType = 'reaction';
    readonly realtime = true;

    createInitialState(_initiatorId: string, _targetId: string): ReactionState {
        return {
            go_sent_at: null,
            initiator_reaction_ms: null,
            target_reaction_ms: null,
            winner_id: null,
        };
    }

    // move = { received_at_ms: number } — set by server, not client
    applyMove(state: ReactionState, move: { received_at_ms: number }, playerId: string): MoveResult {
        const next: ReactionState = { ...state };
        if (!next.go_sent_at) return { newState: next, finished: false };

        const reactionMs = move.received_at_ms - next.go_sent_at;
        if (playerId === 'initiator') {
            next.initiator_reaction_ms = reactionMs;
        } else {
            next.target_reaction_ms = reactionMs;
        }

        const finished = next.initiator_reaction_ms !== null && next.target_reaction_ms !== null;
        return { newState: next, finished };
    }

    getWinner(state: ReactionState, initiatorId: string, targetId: string): string | null {
        const { initiator_reaction_ms: i, target_reaction_ms: t } = state;
        if (i === null || t === null) return null;
        if (i === t) return null;
        return i < t ? initiatorId : targetId;
    }

    // reaction test has no turn — both respond to the same signal
    getPlayerToMove(_state: ReactionState, _initiatorId: string, _targetId: string): string | null {
        return null;
    }

    shapeBoardUpdate(state: ReactionState, _initiatorId: string, _targetId: string, _finished: boolean): Record<string, any> {
        return {
            initiator_reacted: state.initiator_reaction_ms !== null,
            target_reacted: state.target_reaction_ms !== null,
        };
    }
}
