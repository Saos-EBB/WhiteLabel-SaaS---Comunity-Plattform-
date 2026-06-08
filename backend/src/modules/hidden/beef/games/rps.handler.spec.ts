import { RpsHandler } from './rps.handler';

describe('RpsHandler (RPSLS)', () => {
    const h = new RpsHandler();
    const I = 'initiator-id';
    const T = 'target-id';

    function play(i: string, t: string) {
        let s: any = h.createInitialState(I, T);
        ({ newState: s } = h.applyMove(s, { choice: i }, 'initiator'));
        ({ newState: s } = h.applyMove(s, { choice: t }, 'target'));
        return h.getWinner(s, I, T);
    }

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

    // ── 5 ties ───────────────────────────────────────────────────────────────
    it.each([['rock'], ['paper'], ['scissors'], ['lizard'], ['spock']])(
        '%s vs %s → tie',
        (choice) => expect(play(choice, choice)).toBeNull(),
    );

    // ── Win pairs: initiator wins ─────────────────────────────────────────────
    it.each([
        ['rock',     'lizard'],
        ['rock',     'scissors'],
        ['paper',    'rock'],
        ['paper',    'spock'],
        ['scissors', 'paper'],
        ['scissors', 'lizard'],
        ['lizard',   'spock'],
        ['lizard',   'paper'],
        ['spock',    'scissors'],
        ['spock',    'rock'],
    ])('%s beats %s → initiator wins', (i, t) => expect(play(i, t)).toBe(I));

    // ── Loss pairs: target wins ───────────────────────────────────────────────
    it.each([
        ['lizard',   'rock'],
        ['scissors', 'rock'],
        ['rock',     'paper'],
        ['spock',    'paper'],
        ['paper',    'scissors'],
        ['lizard',   'scissors'],
        ['spock',    'lizard'],
        ['paper',    'lizard'],
        ['scissors', 'spock'],
        ['rock',     'spock'],
    ])('%s loses to %s → target wins', (i, t) => expect(play(i, t)).toBe(T));
});
