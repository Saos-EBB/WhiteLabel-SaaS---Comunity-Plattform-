import { RpsHandler } from './rps.handler';

describe('RpsHandler', () => {
    const h = new RpsHandler();
    const I = 'initiator-id';
    const T = 'target-id';

    it('creates empty state', () => {
        const s = h.createInitialState(I, T);
        expect(s.initiator_choice).toBeNull();
        expect(s.target_choice).toBeNull();
    });

    it('not finished until both chose', () => {
        const s = h.createInitialState(I, T);
        const { finished } = h.applyMove(s, { choice: 'rock' }, 'initiator');
        expect(finished).toBe(false);
    });

    it('finished when both chose', () => {
        let s: any = h.createInitialState(I, T);
        ({ newState: s } = h.applyMove(s, { choice: 'rock' }, 'initiator'));
        const { finished } = h.applyMove(s, { choice: 'scissors' }, 'target');
        expect(finished).toBe(true);
    });

    it('rock beats scissors → initiator wins', () => {
        let s: any = h.createInitialState(I, T);
        ({ newState: s } = h.applyMove(s, { choice: 'rock' }, 'initiator'));
        ({ newState: s } = h.applyMove(s, { choice: 'scissors' }, 'target'));
        expect(h.getWinner(s, I, T)).toBe(I);
    });

    it('paper beats rock → target wins', () => {
        let s: any = h.createInitialState(I, T);
        ({ newState: s } = h.applyMove(s, { choice: 'rock' }, 'initiator'));
        ({ newState: s } = h.applyMove(s, { choice: 'paper' }, 'target'));
        expect(h.getWinner(s, I, T)).toBe(T);
    });

    it('same choice → null winner (tie round)', () => {
        let s: any = h.createInitialState(I, T);
        ({ newState: s } = h.applyMove(s, { choice: 'rock' }, 'initiator'));
        ({ newState: s } = h.applyMove(s, { choice: 'rock' }, 'target'));
        expect(h.getWinner(s, I, T)).toBeNull();
    });
});
