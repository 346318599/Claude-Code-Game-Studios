// tests/core/turn-context.test.js
// Vitest suite for TurnContext (W2 T2.1, 2nd-of-3 deliverable).

import { describe, it, expect } from 'vitest';
import { TurnContext, TurnPhase } from '../../web/js/core/TurnContext.js';

describe('TurnContext', () => {
  describe('construction', () => {
    it('initial() builds a PLAYER_TURN snapshot with roundNumber=1', () => {
      const ctx = TurnContext.initial('player-1');
      expect(ctx.phase).toBe(TurnPhase.PLAYER_TURN);
      expect(ctx.currentPlayerId).toBe('player-1');
      expect(ctx.roundNumber).toBe(1);
      expect(ctx.availableActions).toContain('end_turn');
    });

    it('initial() defaults currentPlayerId to "player"', () => {
      const ctx = TurnContext.initial();
      expect(ctx.currentPlayerId).toBe('player');
    });

    it('explicit constructor honors all four fields', () => {
      const ctx = new TurnContext({
        phase: TurnPhase.ENEMY_TURN,
        currentPlayerId: 'ai-1',
        availableActions: ['attack', 'retreat'],
        roundNumber: 7,
      });
      expect(ctx.phase).toBe(TurnPhase.ENEMY_TURN);
      expect(ctx.currentPlayerId).toBe('ai-1');
      expect(ctx.roundNumber).toBe(7);
      expect(ctx.availableActions).toEqual(['attack', 'retreat']);
    });
  });

  describe('immutability', () => {
    it('freezes the instance after construction', () => {
      const ctx = TurnContext.initial();
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('freezes the availableActions array', () => {
      const ctx = TurnContext.initial();
      expect(Object.isFrozen(ctx.availableActions)).toBe(true);
      expect(() => ctx.availableActions.push('cheat')).toThrow();
    });

    it('with() returns a NEW instance — original untouched', () => {
      const a = TurnContext.initial();
      const b = a.with({ phase: TurnPhase.ENEMY_TURN });
      expect(a.phase).toBe(TurnPhase.PLAYER_TURN);
      expect(b.phase).toBe(TurnPhase.ENEMY_TURN);
      expect(b).not.toBe(a);
    });

    it('with() preserves fields that were not overridden', () => {
      const a = TurnContext.initial('hero');
      const b = a.with({ phase: TurnPhase.EVENT_TURN });
      expect(b.currentPlayerId).toBe('hero');     // preserved
      expect(b.roundNumber).toBe(1);                // preserved
    });
  });

  describe('nextPhase()', () => {
    it('traverses PLAYER -> ENEMY -> EVENT -> END_ROUND', () => {
      expect(TurnContext.initial().nextPhase()).toBe(TurnPhase.ENEMY_TURN);
      expect(
        new TurnContext({ phase: TurnPhase.ENEMY_TURN, currentPlayerId: 'ai' })
          .nextPhase()
      ).toBe(TurnPhase.EVENT_TURN);
      expect(
        new TurnContext({ phase: TurnPhase.EVENT_TURN, currentPlayerId: null })
          .nextPhase()
      ).toBe(TurnPhase.END_ROUND);
    });

    it('returns null at END_ROUND', () => {
      const ctx = new TurnContext({
        phase: TurnPhase.END_ROUND,
        currentPlayerId: null,
      });
      expect(ctx.nextPhase()).toBeNull();
    });
  });

  describe('validation', () => {
    it('rejects unknown phase values', () => {
      expect(
        () => new TurnContext({ phase: 'random_phase', currentPlayerId: 'p' })
      ).toThrow(RangeError);
    });

    it('rejects non-positive roundNumber', () => {
      expect(
        () =>
          new TurnContext({
            phase: TurnPhase.PLAYER_TURN,
            currentPlayerId: 'p',
            roundNumber: 0,
          })
      ).toThrow(RangeError);
      expect(
        () =>
          new TurnContext({
            phase: TurnPhase.PLAYER_TURN,
            currentPlayerId: 'p',
            roundNumber: -3,
          })
      ).toThrow(RangeError);
      expect(
        () =>
          new TurnContext({
            phase: TurnPhase.PLAYER_TURN,
            currentPlayerId: 'p',
            roundNumber: 1.5,
          })
      ).toThrow(RangeError);
    });

    it('rejects non-array availableActions', () => {
      expect(
        () =>
          new TurnContext({
            phase: TurnPhase.PLAYER_TURN,
            currentPlayerId: 'p',
            availableActions: 'move',
          })
      ).toThrow(TypeError);
    });

    it('rejects non-string non-null currentPlayerId', () => {
      expect(
        () =>
          new TurnContext({
            phase: TurnPhase.PLAYER_TURN,
            currentPlayerId: 42,
            roundNumber: 1,
          })
      ).toThrow(TypeError);
    });
  });
});
