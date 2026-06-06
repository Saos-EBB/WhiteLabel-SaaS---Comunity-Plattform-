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

    it('initiator wins when solving first and faster', () => {
        const s = h.createInitialState(I, T);
        const code = s.secret_code;

        // Initiator solves at t=100
        const { newState: s2, finished: f2 } = h.applyMove(s, { code, submitted_at: 100 }, 'initiator');
        expect(f2).toBe(false); // target hasn't guessed yet

        // Target solves at t=200 (slower)
        const { newState: s3, finished: f3 } = h.applyMove(s2, { code, submitted_at: 200 }, 'target');
        expect(f3).toBe(true);
        expect(h.getWinner(s3, I, T)).toBe(I);
    });

    it('target wins when solving faster', () => {
        const s = h.createInitialState(I, T);
        const code = s.secret_code;
        const { newState: s2 } = h.applyMove(s, { code, submitted_at: 500 }, 'initiator');
        const { newState: s3, finished } = h.applyMove(s2, { code, submitted_at: 100 }, 'target');
        expect(finished).toBe(true);
        expect(h.getWinner(s3, I, T)).toBe(T);
    });

    it('neither solves → new round (No-Draw Rule)', () => {
        const s = h.createInitialState(I, T);
        const wrong: any = ['R', 'R', 'R', 'R'];

        let state = s;
        // Exhaust both players without solving
        for (let i = 0; i < 8; i++) {
            const { newState } = h.applyMove(state, { code: wrong, submitted_at: i * 100 }, 'initiator');
            state = newState;
        }
        for (let i = 0; i < 7; i++) {
            const { newState } = h.applyMove(state, { code: wrong, submitted_at: i * 100 }, 'target');
            state = newState;
        }
        const { newState: final, finished } = h.applyMove(state, { code: wrong, submitted_at: 800 }, 'target');
        expect(finished).toBe(false); // new round started
        expect(final.round).toBe(2);
        expect(final.initiator_guesses).toHaveLength(0);
    });
});
