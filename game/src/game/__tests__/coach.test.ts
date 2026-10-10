import { describe, expect, it } from 'vitest';
import { TacticalCoach } from '../coach';
import { createGame } from '../rules';

const SEATS_2 = [{ animal: 'fox' as const }, { animal: 'wolf_grey' as const }];
const SEATS_4 = [
  { animal: 'fox' as const },
  { animal: 'wolf_grey' as const },
  { animal: 'bear' as const },
  { animal: 'owl' as const },
];

describe('TacticalCoach', () => {
  describe('recommend', () => {
    it('produces a legal recommendation with summary and detail', () => {
      const state = createGame(2);
      const rec = TacticalCoach.recommend(state, SEATS_2);
      expect(rec.action).toBeDefined();
      expect(rec.summary.length).toBeGreaterThan(0);
      expect(rec.detail.length).toBeGreaterThan(0);
    });
  });

  describe('explain', () => {
    it('explains a standard advance move', () => {
      const state = createGame(2);
      const exp = TacticalCoach.explain(state, { type: 'move', r: 7, c: 4 }, SEATS_2);
      expect(exp.summary).toContain('Advance to row 8, col 5');
      expect(exp.detail).toContain('Best path forward');
    });

    it('explains a winning move to the goal line', () => {
      const state = createGame(2);
      // Place player 0 at row 1, goal is row 0
      state.players[0].r = 1;
      state.players[0].c = 4;
      const exp = TacticalCoach.explain(state, { type: 'move', r: 0, c: 4 }, SEATS_2);
      expect(exp.summary).toContain('Winning move to row 1, col 5');
      expect(exp.detail).toContain('Reaches goal line for victory');
    });

    it('explains a jump move over an opponent', () => {
      const state = createGame(2);
      // Put player 0 at (5, 4) and player 1 at (4, 4)
      state.players[0].r = 5;
      state.players[0].c = 4;
      state.players[1].r = 4;
      state.players[1].c = 4;
      // Jump over player 1 to (3, 4)
      const exp = TacticalCoach.explain(state, { type: 'move', r: 3, c: 4 }, SEATS_2);
      expect(exp.summary).toContain('Jump over opponent');
      expect(exp.detail).toContain('tempo');
    });

    it('explains a wall placement that delays an opponent', () => {
      const state = createGame(2);
      // Put opponent at (4, 4) and place a wall right ahead at (3, 3) horizontal
      state.players[1].r = 4;
      state.players[1].c = 4;
      const exp = TacticalCoach.explain(state, { type: 'wall', wall: { r: 4, c: 3, o: 'h' } }, SEATS_2);
      expect(exp.summary).toContain('Place horizontal hedge');
      expect(exp.detail).toMatch(/Adds \+\d+ steps to Grey Wolf's path!|Channels opponent into a longer route/);
    });

    it('handles wall placement with fallback naming when seats not provided', () => {
      const state = createGame(2);
      state.players[1].r = 4;
      state.players[1].c = 4;
      const exp = TacticalCoach.explain(state, { type: 'wall', wall: { r: 4, c: 3, o: 'h' } });
      expect(exp.summary).toContain('hedge');
    });
  });

  describe('getStatusAdvice', () => {
    it('warns when an opponent is within 2 steps and player has hedges', () => {
      const state = createGame(2);
      state.players[1].r = 7; // Goal for player 1 is 8 (1 step away!)
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_2);
      expect(advice).toContain('⚠️ Urgent');
      expect(advice).toContain('Grey Wolf is only 1 step away');
    });

    it('encourages advancing when leading by 2 or more steps', () => {
      const state = createGame(2);
      // Player 0 at (4, 4), distance is 4. Player 1 at (0, 4), distance is 8.
      state.players[0].r = 4;
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_2);
      expect(advice).toContain('Ahead by 4 steps');
      expect(advice).toContain('Keep advancing');
    });

    it('suggests blocking when trailing by 2 or more steps with walls', () => {
      const state = createGame(2);
      // Player 0 at (8, 4), dist 8. Player 1 at (5, 4), dist 3.
      state.players[1].r = 5;
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_2);
      expect(advice).toContain('Trailing by 5 steps');
      expect(advice).toContain('Block Grey Wolf');
    });

    it('identifies a tied race with walls', () => {
      const state = createGame(2);
      // Both at initial positions (distance 8 each)
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_2);
      expect(advice).toContain('Tied race (8 steps each)');
    });

    it('handles 4-player game status correctly', () => {
      const state = createGame(4);
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_4);
      expect(advice.length).toBeGreaterThan(0);
    });

    it('reports no hedges left when player wall count is 0', () => {
      const state = createGame(2);
      state.players[0].walls = 0;
      state.players[0].r = 4;
      state.players[1].r = 4;
      const advice = TacticalCoach.getStatusAdvice(state, 0, SEATS_2);
      expect(advice).toContain('No hedges left');
    });
  });
});
