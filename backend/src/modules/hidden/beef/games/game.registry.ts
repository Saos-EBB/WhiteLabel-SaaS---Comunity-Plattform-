import { Injectable } from '@nestjs/common';
import { GameHandler } from './game-handler.interface';

@Injectable()
export class GameRegistry {
    private readonly handlers = new Map<string, GameHandler>();

    register(handler: GameHandler): void {
        this.handlers.set(handler.gameType, handler);
    }

    get(gameType: string): GameHandler {
        const handler = this.handlers.get(gameType);
        if (!handler) throw new Error(`Unknown game type: ${gameType}`);
        return handler;
    }

    has(gameType: string): boolean {
        return this.handlers.has(gameType);
    }

    allTypes(): string[] {
        return Array.from(this.handlers.keys());
    }
}
