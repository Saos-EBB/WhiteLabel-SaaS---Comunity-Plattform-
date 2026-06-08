import { Injectable, BadRequestException } from '@nestjs/common';
import { Beef, BeefStatus } from './entities/beef.entity';

export enum BeefEvent {
    APPROVE      = 'APPROVE',
    ACCEPT       = 'ACCEPT',
    CHICKEN      = 'CHICKEN',
    START_GAME   = 'START_GAME',
    BEGIN_FIGHT  = 'BEGIN_FIGHT',
    CLOSE        = 'CLOSE',
}

export class BadTransitionError extends BadRequestException {
    constructor(currentStatus: string, event: BeefEvent) {
        super(`Ungültige Beef-Transition: ${currentStatus} + ${event}`);
    }
}

const TRANSITIONS: Record<BeefStatus, Partial<Record<BeefEvent, BeefStatus>>> = {
    [BeefStatus.PENDING_APPROVAL]: { [BeefEvent.APPROVE]:     BeefStatus.WAITING },
    [BeefStatus.WAITING]:          { [BeefEvent.ACCEPT]:      BeefStatus.ACTIVE,
                                     [BeefEvent.CHICKEN]:     BeefStatus.CHICKENED },
    [BeefStatus.ACTIVE]:           { [BeefEvent.START_GAME]:  BeefStatus.GAME_PENDING },
    [BeefStatus.GAME_PENDING]:     { [BeefEvent.BEGIN_FIGHT]: BeefStatus.IN_GAME,
                                     [BeefEvent.CLOSE]:       BeefStatus.CLOSED },
    [BeefStatus.IN_GAME]:          { [BeefEvent.CLOSE]:       BeefStatus.CLOSED },
    [BeefStatus.CLOSED]:           {},
    [BeefStatus.CHICKENED]:        {},
};

@Injectable()
export class BeefStateMachineService {
    transition(beef: Beef, event: BeefEvent): Beef {
        const next = TRANSITIONS[beef.status as BeefStatus]?.[event];
        if (!next) throw new BadTransitionError(beef.status, event);
        beef.status = next;
        return beef;
    }
}
