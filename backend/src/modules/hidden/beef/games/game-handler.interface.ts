export interface MoveResult {
    newState: Record<string, any>;
    finished: boolean;
}

export interface GameHandler {
    readonly gameType: string;
    readonly realtime: boolean;

    createInitialState(initiatorId: string, targetId: string): Record<string, any>;
    applyMove(state: Record<string, any>, move: Record<string, any>, playerId: string): MoveResult;
    getWinner(state: Record<string, any>, initiatorId: string, targetId: string): string | null;
    getPlayerToMove(state: Record<string, any>, initiatorId: string, targetId: string): string | null;
    /** Returns a frontend-ready board snapshot safe to broadcast to all clients in the room. */
    shapeBoardUpdate(state: Record<string, any>, initiatorId: string, targetId: string, finished: boolean): Record<string, any>;
}
