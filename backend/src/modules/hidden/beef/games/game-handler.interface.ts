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
}
