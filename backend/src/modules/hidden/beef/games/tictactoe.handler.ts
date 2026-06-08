import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

type Cell = 'X' | 'O' | null;

interface TicTacToeState {
    board: Cell[];
    turn: 'initiator' | 'target';
    scores: { initiator: number; target: number };
    game_number: number;   // 1-based, max 3 (+ extras for draws)
    winner_id: string | null;
    round_over: boolean;                                // true while showing round result
    round_winner: 'initiator' | 'target' | 'draw' | null; // who won the just-finished round
}

const WINNING_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
];

function checkBoardWinner(board: Cell[]): 'X' | 'O' | 'draw' | null {
    for (const [a,b,c] of WINNING_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c])
            return board[a] as 'X' | 'O';
    }
    if (board.every(c => c !== null)) return 'draw';
    return null;
}

@Injectable()
export class TicTacToeHandler implements GameHandler {
    readonly gameType = 'tictactoe';
    readonly realtime = false;

    createInitialState(_i: string, _t: string): TicTacToeState {
        return {
            board: Array(9).fill(null),
            turn: 'initiator',
            scores: { initiator: 0, target: 0 },
            game_number: 1,
            winner_id: null,
            round_over: false,
            round_winner: null,
        };
    }

    applyMove(state: TicTacToeState, move: { position: number }, _playerId: string): MoveResult {
        const next: TicTacToeState = {
            board: [...state.board],
            turn: state.turn === 'initiator' ? 'target' : 'initiator',
            scores: { ...state.scores },
            game_number: state.game_number,
            winner_id: null,
            round_over: false,
            round_winner: null,
        };
        next.board[move.position] = state.turn === 'initiator' ? 'X' : 'O';

        const boardResult = checkBoardWinner(next.board);

        if (boardResult === null) return { newState: next, finished: false };

        if (boardResult !== 'draw') {
            const roundWinner = boardResult === 'X' ? 'initiator' : 'target';
            next.scores[roundWinner]++;
            next.round_winner = roundWinner;
        } else {
            next.round_winner = 'draw';
        }

        const seriesWinner = next.scores.initiator >= 2 ? 'initiator'
            : next.scores.target >= 2 ? 'target' : null;

        if (seriesWinner) {
            next.winner_id = seriesWinner; // placeholder resolved to userId in getWinner
            return { newState: next, finished: true };
        }

        // Round ended, series continues — keep winning board visible, schedule reset externally
        next.round_over = true;
        return { newState: next, finished: false };
    }

    // Called by beef-game.service after showing round result (2.5 s delay)
    startNextRound(state: TicTacToeState): TicTacToeState {
        return {
            ...state,
            board: Array(9).fill(null),
            turn: 'initiator',
            game_number: state.game_number + 1,
            round_over: false,
            round_winner: null,
        };
    }

    getWinner(state: TicTacToeState, initiatorId: string, targetId: string): string | null {
        if (state.scores.initiator >= 2) return initiatorId;
        if (state.scores.target >= 2) return targetId;
        return null;
    }

    getPlayerToMove(state: TicTacToeState, initiatorId: string, targetId: string): string | null {
        if (state.winner_id) return null;
        return state.turn === 'initiator' ? initiatorId : targetId;
    }

    shapeBoardUpdate(state: TicTacToeState, initiatorId: string, targetId: string, finished: boolean): Record<string, any> {
        const currentTurn = state.turn === 'initiator' ? initiatorId : targetId;
        const gameWinner = finished ? this.getWinner(state, initiatorId, targetId) : null;
        const roundWinnerId =
            state.round_winner === 'initiator' ? initiatorId :
            state.round_winner === 'target'    ? targetId :
            state.round_winner === 'draw'      ? 'draw' : null;
        return {
            board: state.board,
            current_turn: currentTurn,
            initiator_wins: state.scores.initiator,
            target_wins: state.scores.target,
            game_number: state.game_number,
            game_winner: gameWinner,
            is_draw: state.round_winner === 'draw' && state.round_over,
            round_over: state.round_over,
            round_winner: state.round_over ? roundWinnerId : null,
        };
    }
}
