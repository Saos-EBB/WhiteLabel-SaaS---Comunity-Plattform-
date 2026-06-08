import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

type RpsChoice = 'rock' | 'paper' | 'scissors' | 'lizard' | 'spock';

interface RpsState {
    initiator_choice: RpsChoice | null;
    target_choice: RpsChoice | null;
    winner_id: string | null;
}

// Each choice beats exactly 2 others (RPSLS rules).
const BEATS: Record<RpsChoice, [RpsChoice, RpsChoice]> = {
    rock:     ['lizard',  'scissors'],
    paper:    ['rock',    'spock'],
    scissors: ['paper',   'lizard'],
    lizard:   ['spock',   'paper'],
    spock:    ['scissors','rock'],
};

@Injectable()
export class RpsHandler implements GameHandler {
    readonly gameType = 'rps';
    readonly realtime = true; // simultaneous — both players submit independently

    createInitialState(_initiatorId: string, _targetId: string): RpsState {
        return { initiator_choice: null, target_choice: null, winner_id: null };
    }

    applyMove(state: RpsState, move: { choice: RpsChoice }, playerId: string): MoveResult {
        const next = { ...state };
        if (playerId === 'initiator') next.initiator_choice = move.choice;
        else next.target_choice = move.choice;

        const finished = next.initiator_choice !== null && next.target_choice !== null;
        return { newState: next, finished };
    }

    getWinner(state: RpsState, initiatorId: string, targetId: string): string | null {
        const { initiator_choice: i, target_choice: t } = state;
        if (!i || !t) return null;
        if (i === t) return null;
        return BEATS[i].includes(t) ? initiatorId : targetId;
    }

    getPlayerToMove(state: RpsState, initiatorId: string, targetId: string): string | null {
        if (!state.initiator_choice) return initiatorId;
        if (!state.target_choice) return targetId;
        return null;
    }

    shapeBoardUpdate(state: RpsState, initiatorId: string, targetId: string, _finished: boolean): Record<string, any> {
        const both = state.initiator_choice !== null && state.target_choice !== null;
        return {
            both_submitted: both,
            initiator_choice: both ? state.initiator_choice : null,
            target_choice: both ? state.target_choice : null,
            round_winner: both ? this.getWinner(state, initiatorId, targetId) : null,
            round: 1,
        };
    }
}
