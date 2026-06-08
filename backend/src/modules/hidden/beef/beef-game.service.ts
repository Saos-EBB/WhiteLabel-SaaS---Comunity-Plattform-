import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRegistry } from './games/game.registry';
import { TicTacToeHandler } from './games/tictactoe.handler';
import { BeefGame } from './entities/beef-game.entity';
import { Beef, BeefStatus } from './entities/beef.entity';
import { BeefStateMachineService, BeefEvent } from './beef-state-machine.service';
import { SystemSettingsService } from '../../core/system-settings/system-settings.service';
import { TypedEventBus, AppEvents } from '../../shared/events/app-events';

const GAME_DEADLINE_SECONDS = 30 * 60; // 30 minutes

@Injectable()
export class BeefGameService {
    // Tracks which players have signalled game:reaction_ready for a given beef.
    // Both must be present before the GO signal is scheduled.
    private readonly reactionReadyPlayers = new Map<string, Set<string>>();
    constructor(
        @InjectRepository(BeefGame)
        private readonly gameRepo: Repository<BeefGame>,
        @InjectRepository(Beef)
        private readonly beefRepo: Repository<Beef>,
        private readonly registry: GameRegistry,
        private readonly stateMachine: BeefStateMachineService,
        private readonly systemSettings: SystemSettingsService,
        private readonly eventBus: TypedEventBus,
    ) {}

    async pressReady(beefId: string, userId: string): Promise<void> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef) throw new NotFoundException('Beef nicht gefunden');
        if (beef.status !== BeefStatus.GAME_PENDING)
            throw new BadRequestException('Beef nicht im game_pending Status');

        const isInitiator = beef.initiator_id === userId;
        const isTarget = beef.target_id === userId;
        if (!isInitiator && !isTarget) throw new ForbiddenException();

        let game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game) throw new NotFoundException('Beef-Game nicht gefunden');

        if (isInitiator) game.initiator_ready = true;
        if (isTarget) game.target_ready = true;

        if (game.initiator_ready && game.target_ready) {
            const timeoutSec = await this.systemSettings.getNumber('game.move_timeout_seconds', 180);
            game.move_deadline_at = new Date(Date.now() + timeoutSec * 1000);
            game = await this.gameRepo.save(game);

            this.stateMachine.transition(beef, BeefEvent.BEGIN_FIGHT);
            await this.beefRepo.save(beef);

            // For reaction: GO is NOT scheduled here. It fires via markReactionReady()
            // once both ReactionGame components have mounted and registered their listeners.

            this.eventBus.emit(AppEvents.beefGameStateUpdate, {
                beefId,
                state: 'in_game',
                gameType: game.game_type,
                initiatorReady: game.initiator_ready,
                targetReady: game.target_ready,
            });
        } else {
            await this.gameRepo.save(game);
            this.eventBus.emit(AppEvents.beefGameStateUpdate, {
                beefId,
                state: 'waiting',
                gameType: game.game_type,
                initiatorReady: game.initiator_ready,
                targetReady: game.target_ready,
            });
        }
    }

    async markReactionReady(beefId: string, userId: string): Promise<void> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.IN_GAME || beef.game_type !== 'reaction') return;
        const isInitiator = beef.initiator_id === userId;
        const isTarget = beef.target_id === userId;
        if (!isInitiator && !isTarget) return;

        if (!this.reactionReadyPlayers.has(beefId)) {
            this.reactionReadyPlayers.set(beefId, new Set());
        }
        this.reactionReadyPlayers.get(beefId)!.add(userId);

        const ready = this.reactionReadyPlayers.get(beefId)!;
        if (ready.has(beef.initiator_id) && ready.has(beef.target_id)) {
            this.reactionReadyPlayers.delete(beefId);
            const delayMs = Math.floor(Math.random() * 4800) + 200;
            setTimeout(() => {
                this.eventBus.emit(AppEvents.beefGameGo, { beefId, sentAt: Date.now() });
            }, delayMs);
        }
    }

    async applyMove(beefId: string, userId: string, move: Record<string, any>): Promise<BeefGame> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef) throw new NotFoundException('Beef nicht gefunden');
        if (beef.status !== BeefStatus.IN_GAME)
            throw new BadRequestException('Beef nicht in_game');

        const isInitiator = beef.initiator_id === userId;
        const isTarget = beef.target_id === userId;
        if (!isInitiator && !isTarget) throw new ForbiddenException();

        const game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game) throw new NotFoundException('Game nicht gefunden');

        if (game.move_deadline_at && game.move_deadline_at < new Date())
            throw new BadRequestException('Move-Deadline abgelaufen');

        const handler = this.registry.get(beef.game_type);
        const role = isInitiator ? 'initiator' : 'target';
        const playerToMove = handler.getPlayerToMove(game.state, beef.initiator_id, beef.target_id);

        if (handler.realtime === false && playerToMove !== userId)
            throw new BadRequestException('Nicht dein Zug');

        // Inject server-side timestamp for mastermind (prevents client time manipulation)
        const sanitizedMove = beef.game_type === 'mastermind'
            ? { ...move, submitted_at: Date.now() }
            : move;

        const { newState, finished } = handler.applyMove(game.state, sanitizedMove, role);
        game.state = newState;

        // Always broadcast the new board state to all room members
        const board = handler.shapeBoardUpdate(newState, beef.initiator_id, beef.target_id, finished);
        this.eventBus.emit(AppEvents.beefGameBoardUpdate, {
            beefId,
            gameType: beef.game_type,
            board,
            finished,
        });

        if (finished) {
            const winnerId = handler.getWinner(newState, beef.initiator_id, beef.target_id);
            game.winner_id = winnerId;
            game.move_deadline_at = null;
            await this.gameRepo.save(game);
            this.eventBus.emit(AppEvents.beefGameFinished, { beefId, winnerId });
        } else if (board.round_over) {
            // Round ended, series continues — hold the winning board for 2.5 s then reset
            game.move_deadline_at = null;
            await this.gameRepo.save(game);
            setTimeout(() => void this.advanceToNextRound(beefId, beef.initiator_id, beef.target_id), 2500);
        } else {
            const timeoutSec = await this.systemSettings.getNumber('game.move_timeout_seconds', 180);
            game.move_deadline_at = new Date(Date.now() + timeoutSec * 1000);
            await this.gameRepo.save(game);
        }

        return game;
    }

    // Called by gateway for reaction test clicks — move.received_at_ms set by server
    async applyReactionClick(beefId: string, userId: string, receivedAtMs: number): Promise<void> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.IN_GAME || beef.game_type !== 'reaction') return;

        const isInitiator = beef.initiator_id === userId;
        const isTarget = beef.target_id === userId;
        if (!isInitiator && !isTarget) return;

        const role = isInitiator ? 'initiator' : 'target';
        await this.applyMove(beefId, userId, { received_at_ms: receivedAtMs });
    }

    async getGame(beefId: string): Promise<Record<string, any> | null> {
        const game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game) return null;
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef) return null;

        const state: 'waiting' | 'in_game' | 'finished' =
            game.winner_id !== null ? 'finished' :
            (game.initiator_ready && game.target_ready) ? 'in_game' :
            'waiting';

        const handler = this.registry.get(game.game_type);
        const board = game.state
            ? handler.shapeBoardUpdate(game.state, beef.initiator_id, beef.target_id, state === 'finished')
            : {};

        return {
            state,
            game_type: game.game_type,
            initiator_ready: game.initiator_ready,
            target_ready: game.target_ready,
            move_deadline_at: game.move_deadline_at,
            winner_id: game.winner_id,
            ...board,
        };
    }

    async handleMoveTimeout(beefId: string): Promise<void> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.IN_GAME) return;

        const game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game || !game.move_deadline_at || game.move_deadline_at > new Date()) return;

        const handler = this.registry.get(beef.game_type);
        const playerToMove = handler.getPlayerToMove(game.state, beef.initiator_id, beef.target_id);
        // player who was supposed to move loses → other player wins
        const winnerId = playerToMove === beef.initiator_id ? beef.target_id : beef.initiator_id;

        game.winner_id = winnerId;
        game.move_deadline_at = null;
        await this.gameRepo.save(game);
        this.eventBus.emit(AppEvents.beefGameFinished, { beefId, winnerId });
    }

    private async advanceToNextRound(beefId: string, initiatorId: string, targetId: string): Promise<void> {
        const game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game || !game.state?.round_over) return;

        const handler = this.registry.get('tictactoe') as TicTacToeHandler;
        const nextState = handler.startNextRound(game.state as any);
        game.state = nextState;
        const timeoutSec = await this.systemSettings.getNumber('game.move_timeout_seconds', 180);
        game.move_deadline_at = new Date(Date.now() + timeoutSec * 1000);
        await this.gameRepo.save(game);

        const resetBoard = handler.shapeBoardUpdate(nextState, initiatorId, targetId, false);
        this.eventBus.emit(AppEvents.beefGameBoardUpdate, {
            beefId,
            gameType: 'tictactoe',
            board: resetBoard,
            finished: false,
        });
    }

    async handleReadyTimeout(beefId: string): Promise<void> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.GAME_PENDING) return;
        if (!beef.game_deadline_at || beef.game_deadline_at > new Date()) return;

        const game = await this.gameRepo.findOne({ where: { beef_id: beefId } });
        if (!game) return;

        let winnerId: string | null = null;
        if (game.initiator_ready && !game.target_ready) winnerId = beef.initiator_id;
        else if (game.target_ready && !game.initiator_ready) winnerId = beef.target_id;
        // neither ready → null = tie

        game.winner_id = winnerId;
        await this.gameRepo.save(game);
        this.eventBus.emit(AppEvents.beefGameFinished, { beefId, winnerId });
    }
}
