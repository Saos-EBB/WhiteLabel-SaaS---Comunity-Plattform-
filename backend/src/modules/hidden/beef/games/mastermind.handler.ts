import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

const CODE_LENGTH = 4;
const MAX_GUESSES = 8;
const COLORS = ['R', 'G', 'B', 'Y', 'P', 'O'] as const;
type Color = typeof COLORS[number];

interface Guess {
    code: Color[];
    exact: number;   // right color, right position
    partial: number; // right color, wrong position
}

interface MastermindState {
    // initiator sets code, target guesses (or vice-versa — both set codes, both guess)
    initiator_code: Color[] | null;
    target_code: Color[] | null;
    initiator_guesses: Guess[];
    target_guesses: Guess[];
    turn: 'initiator' | 'target';
    phase: 'set_code' | 'guessing';
    winner_id: string | null;
}

function score(secret: Color[], guess: Color[]): { exact: number; partial: number } {
    let exact = 0;
    const secretLeft: (Color | null)[] = [...secret];
    const guessLeft: (Color | null)[] = [...guess];
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (secret[i] === guess[i]) { exact++; secretLeft[i] = null; guessLeft[i] = null; }
    }
    let partial = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessLeft[i] === null) continue;
        const j = secretLeft.indexOf(guessLeft[i] as Color);
        if (j !== -1) { partial++; secretLeft[j] = null; }
    }
    return { exact, partial };
}

@Injectable()
export class MastermindHandler implements GameHandler {
    readonly gameType = 'mastermind';
    readonly realtime = false;

    createInitialState(_initiatorId: string, _targetId: string): MastermindState {
        return {
            initiator_code: null,
            target_code: null,
            initiator_guesses: [],
            target_guesses: [],
            turn: 'initiator',
            phase: 'set_code',
            winner_id: null,
        };
    }

    applyMove(state: MastermindState, move: { code: Color[] }, playerId: string): MoveResult {
        const role = playerId === 'initiator_placeholder' ? 'initiator' : state.turn;
        const next: MastermindState = { ...state, initiator_guesses: [...state.initiator_guesses], target_guesses: [...state.target_guesses] };

        if (state.phase === 'set_code') {
            if (state.turn === 'initiator') {
                next.initiator_code = move.code;
                next.turn = 'target';
            } else {
                next.target_code = move.code;
                next.phase = 'guessing';
                next.turn = 'initiator';
            }
            return { newState: next, finished: false };
        }

        // guessing phase — current turn player guesses opponent's code
        if (state.turn === 'initiator') {
            const secret = next.target_code!;
            const { exact, partial } = score(secret, move.code);
            next.initiator_guesses.push({ code: move.code, exact, partial });
            next.turn = 'target';
        } else {
            const secret = next.initiator_code!;
            const { exact, partial } = score(secret, move.code);
            next.target_guesses.push({ code: move.code, exact, partial });
            next.turn = 'initiator';
        }

        const iSolved = next.initiator_guesses.some(g => g.exact === CODE_LENGTH);
        const tSolved = next.target_guesses.some(g => g.exact === CODE_LENGTH);
        const iExhausted = next.initiator_guesses.length >= MAX_GUESSES;
        const tExhausted = next.target_guesses.length >= MAX_GUESSES;
        const finished = iSolved || tSolved || (iExhausted && tExhausted);

        return { newState: next, finished };
    }

    getWinner(state: MastermindState, initiatorId: string, targetId: string): string | null {
        const iSolved = state.initiator_guesses.some(g => g.exact === CODE_LENGTH);
        const tSolved = state.target_guesses.some(g => g.exact === CODE_LENGTH);
        if (iSolved && !tSolved) return initiatorId;
        if (tSolved && !iSolved) return targetId;
        if (iSolved && tSolved) {
            // whoever solved in fewer guesses
            const iGuesses = state.initiator_guesses.findIndex(g => g.exact === CODE_LENGTH) + 1;
            const tGuesses = state.target_guesses.findIndex(g => g.exact === CODE_LENGTH) + 1;
            if (iGuesses < tGuesses) return initiatorId;
            if (tGuesses < iGuesses) return targetId;
        }
        return null;
    }

    getPlayerToMove(state: MastermindState, initiatorId: string, targetId: string): string | null {
        return state.turn === 'initiator' ? initiatorId : targetId;
    }
}
