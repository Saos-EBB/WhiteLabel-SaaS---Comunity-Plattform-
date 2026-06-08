import { MastermindHandler } from './mastermind.handler';

describe('MastermindHandler', () => {
    const h = new MastermindHandler();
    const I = 'initiator-id';
    const T = 'target-id';

    it('creates state with a 4-color secret code', () => {
        const s = h.createInitialState(I, T);
        expect(s.secret_code).toHaveLength(4);
        expect(s.initiator_guesses).toHaveLength(0);
    });

    it('initiator wins when solving faster (lower submitted_at)', () => {
        let s: any = h.createInitialState(I, T);
        const code = s.secret_code;

        ({ newState: s } = h.applyMove(s, { guess: code, submitted_at: 100 }, 'initiator'));
        expect(s.initiator_guesses).toHaveLength(1);

        const { newState: s3, finished: f3 } = h.applyMove(s, { guess: code, submitted_at: 200 }, 'target');
        expect(f3).toBe(true);
        expect(h.getWinner(s3 as any, I, T)).toBe(I);
    });

    it('target wins when solving while initiator exhausted', () => {
        let s: any = h.createInitialState(I, T);
        const code = s.secret_code;
        const wrong: any = ['R', 'R', 'R', 'R'];

        for (let i = 0; i < 8; i++) {
            ({ newState: s } = h.applyMove(s, { guess: wrong, submitted_at: i * 100 }, 'initiator'));
        }
        const { newState: sf, finished } = h.applyMove(s, { guess: code, submitted_at: 100 }, 'target');
        expect(finished).toBe(true);
        expect(h.getWinner(sf as any, I, T)).toBe(T);
    });

    it('neither solves → new round (No-Draw Rule)', () => {
        let s: any = h.createInitialState(I, T);
        const wrong: any = ['R', 'R', 'R', 'R'];

        // Exhaust both players without solving
        for (let i = 0; i < 8; i++) {
            ({ newState: s } = h.applyMove(s, { guess: wrong, submitted_at: i * 10 }, 'initiator'));
        }
        for (let i = 0; i < 7; i++) {
            ({ newState: s } = h.applyMove(s, { guess: wrong, submitted_at: i * 10 }, 'target'));
        }
        const { newState: final, finished } = h.applyMove(s, { guess: wrong, submitted_at: 80 }, 'target');
        expect(finished).toBe(false); // new round started
        expect(final.round).toBe(2);
        expect(final.initiator_guesses).toHaveLength(0);
    });
});
