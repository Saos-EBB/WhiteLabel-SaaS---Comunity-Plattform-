import { Injectable } from '@nestjs/common';
import { GameHandler, MoveResult } from './game-handler.interface';

type Cell = 'X' | 'O' | null;

interface TicTacToeState {
    board: Cell[];        // 9 cells, index 0-8
    turn: 'initiator' | 'target';
    winner_id: string | null;
}

const WINNING_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
];

@Injectable()
export class TicTacToeHandler implements GameHandler {
    readonly gameType = 'tictactoe';
    readonly realtime = false;

    createInitialState(_initiatorId: string, _targetId: string): TicTacToeState {
        return { board: Array(9).fill(null), turn: 'initiator', winner_id: null };
    }

    applyMove(state: TicTacToeState, move: { index: number }, playerId: string): MoveResult {
        const next: TicTacToeState = {
            board: [...state.board],
            turn: state.turn,
            winner_id: null,
        };

        const symbol: Cell = state.turn === 'initiator' ? 'X' : 'O';
        next.board[move.index] = symbol;
        next.turn = state.turn === 'initiator' ? 'target' : 'initiator';

        const finished = this.checkFinished(next.board);
        return { newState: next, finished };
    }

    getWinner(state: TicTacToeState, initiatorId: string, targetId: string): string | null {
        for (const [a, b, c] of WINNING_LINES) {
            if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
                return state.board[a] === 'X' ? initiatorId : targetId;
            }
        }
        return null;
    }

    getPlayerToMove(state: TicTacToeState, initiatorId: string, targetId: string): string | null {
        if (this.checkFinished(state.board)) return null;
        return state.turn === 'initiator' ? initiatorId : targetId;
    }

    private checkFinished(board: Cell[]): boolean {
        const hasWinner = WINNING_LINES.some(([a, b, c]) =>
            board[a] && board[a] === board[b] && board[a] === board[c]
        );
        return hasWinner || board.every(c => c !== null);
    }
}
