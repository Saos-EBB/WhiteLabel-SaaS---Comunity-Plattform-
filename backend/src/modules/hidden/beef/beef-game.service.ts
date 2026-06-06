import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRegistry } from './games/game.registry';
import { BeefGame } from './entities/beef-game.entity';
import { Beef, BeefStatus } from './entities/beef.entity';
import { BeefStateMachineService, BeefEvent } from './beef-state-machine.service';
import { SystemSettingsService } from '../../core/system-settings/system-settings.service';
import { TypedEventBus, AppEvents } from '../../shared/events/app-events';

const GAME_DEADLINE_SECONDS = 30 * 60; // 30 minutes

@Injectable()
export class BeefGameService {
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

            if (beef.game_type === 'reaction') {
                // Random delay 200–5000ms before go signal (No-Draw Rule: same signal for both)
                const delayMs = Math.floor(Math.random() * 4800) + 200;
                setTimeout(() => {
                    this.eventBus.emit(AppEvents.beefGameGo, { beefId, sentAt: Date.now() });
                }, delayMs);
            }

            this.eventBus.emit(AppEvents.beefGameStateUpdate, {
                beefId,
                state: game.state,
                gameType: game.game_type,
                initiatorReady: game.initiator_ready,
                targetReady: game.target_ready,
            });
        } else {
            await this.gameRepo.save(game);
            this.eventBus.emit(AppEvents.beefGameStateUpdate, {
                beefId,
                state: game.state,
                gameType: game.game_type,
                initiatorReady: game.initiator_ready,
                targetReady: game.target_ready,
            });
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

        const { newState, finished } = handler.applyMove(game.state, move, role);
        game.state = newState;

        if (finished) {
            const winnerId = handler.getWinner(newState, beef.initiator_id, beef.target_id);
            game.winner_id = winnerId;
            game.move_deadline_at = null;
            await this.gameRepo.save(game);
            this.eventBus.emit(AppEvents.beefGameFinished, { beefId, winnerId });
        } else {
            const timeoutSec = await this.systemSettings.getNumber('game.move_timeout_seconds', 180);
            game.move_deadline_at = new Date(Date.now() + timeoutSec * 1000);
            await this.gameRepo.save(game);

            this.eventBus.emit(AppEvents.beefGameStateUpdate, {
                beefId,
                state: game.state,
                gameType: game.game_type,
                initiatorReady: game.initiator_ready,
                targetReady: game.target_ready,
            });
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

    async getGame(beefId: string): Promise<BeefGame | null> {
        return this.gameRepo.findOne({ where: { beef_id: beefId } });
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
