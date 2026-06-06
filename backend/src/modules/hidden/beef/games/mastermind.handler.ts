import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

const CODE_LENGTH = 4;
const MAX_GUESSES = 8;
const COLORS = ['R', 'G', 'B', 'Y', 'P', 'O'] as const;
type Color = typeof COLORS[number];

interface Guess {
    code: Color[];
    exact: number;
    partial: number;
    submitted_at: number; // server timestamp ms
}

interface MastermindState {
    secret_code: Color[];              // same code for both players
    initiator_guesses: Guess[];
    target_guesses: Guess[];
    winner_id: string | null;
    round: number;                     // increments on tie, new code each round
}

function generateCode(): Color[] {
    return Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
}

function score(secret: Color[], guess: Color[]): { exact: number; partial: number } {
    let exact = 0;
    const sl: (Color | null)[] = [...secret];
    const gl: (Color | null)[] = [...guess];
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (secret[i] === guess[i]) { exact++; sl[i] = null; gl[i] = null; }
    }
    let partial = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (gl[i] === null) continue;
        const j = sl.indexOf(gl[i] as Color);
        if (j !== -1) { partial++; sl[j] = null; }
    }
    return { exact, partial };
}

@Injectable()
export class MastermindHandler implements GameHandler {
    readonly gameType = 'mastermind';
    readonly realtime = false;

    createInitialState(_i: string, _t: string): MastermindState {
        return {
            secret_code: generateCode(),
            initiator_guesses: [],
            target_guesses: [],
            winner_id: null,
            round: 1,
        };
    }

    // move = { code: Color[], role: 'initiator' | 'target', submitted_at: number }
    applyMove(state: MastermindState, move: { code: Color[]; submitted_at: number }, playerId: string): MoveResult {
        const role = playerId === 'initiator' ? 'initiator' : 'target';
        const next: MastermindState = {
            ...state,
            initiator_guesses: [...state.initiator_guesses],
            target_guesses: [...state.target_guesses],
        };

        const { exact, partial } = score(state.secret_code, move.code);
        const guess: Guess = { code: move.code, exact, partial, submitted_at: move.submitted_at };

        if (role === 'initiator') next.initiator_guesses.push(guess);
        else next.target_guesses.push(guess);

        const iSolved = next.initiator_guesses.some(g => g.exact === CODE_LENGTH);
        const tSolved = next.target_guesses.some(g => g.exact === CODE_LENGTH);
        const iExhausted = next.initiator_guesses.length >= MAX_GUESSES;
        const tExhausted = next.target_guesses.length >= MAX_GUESSES;

        const bothDone = (iSolved || iExhausted) && (tSolved || tExhausted);
        if (!bothDone) return { newState: next, finished: false };

        // Both done — determine winner
        if (iSolved && !tSolved) { next.winner_id = 'initiator'; return { newState: next, finished: true }; }
        if (tSolved && !iSolved) { next.winner_id = 'target'; return { newState: next, finished: true }; }
        if (!iSolved && !tSolved) {
            // Neither solved — new round (No-Draw Rule)
            return { newState: this.newRound(next), finished: false };
        }

        // Both solved — compare by submitted_at of correct guess
        const iTime = next.initiator_guesses.find(g => g.exact === CODE_LENGTH)!.submitted_at;
        const tTime = next.target_guesses.find(g => g.exact === CODE_LENGTH)!.submitted_at;
        if (iTime < tTime) { next.winner_id = 'initiator'; return { newState: next, finished: true }; }
        if (tTime < iTime) { next.winner_id = 'target'; return { newState: next, finished: true }; }

        // Exact same ms — new round (No-Draw Rule, extremely rare)
        return { newState: this.newRound(next), finished: false };
    }

    getWinner(state: MastermindState, initiatorId: string, targetId: string): string | null {
        if (state.winner_id === 'initiator') return initiatorId;
        if (state.winner_id === 'target') return targetId;
        return null;
    }

    getPlayerToMove(state: MastermindState, initiatorId: string, targetId: string): string | null {
        if (state.winner_id) return null;
        // Both can move simultaneously — return null to indicate no single player
        return null;
    }

    private newRound(state: MastermindState): MastermindState {
        return {
            secret_code: generateCode(),
            initiator_guesses: [],
            target_guesses: [],
            winner_id: null,
            round: state.round + 1,
        };
    }
}
