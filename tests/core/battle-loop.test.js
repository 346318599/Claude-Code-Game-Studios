// tests/core/battle-loop.test.js
// Vitest suite for BattleLoop (W2 T2.1, 1st-of-3 deliverable).

import { describe, it, expect, vi } from 'vitest';
import { EventBus, BattleEvents } from '../../web/js/core/EventBus.js';
import { BattleLoop } from '../../web/js/core/BattleLoop.js';

// Helper: collect every (event, payload) pair emitted during a block.
function recordBus() {
  const bus = new EventBus();
  const events = [];
  for (const evt of Object.values(BattleEvents)) {
    bus.on(evt, (payload) => events.push({ evt, payload }));
  }
  return { bus, events };
}

describe('BattleLoop', () => {
  describe('construction', () => {
    it('builds a fresh loop in PLAYER_TURN of round 1', () => {
      const { bus } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      expect(loop.round).toBe(1);
      expect(loop.isRunning).toBe(false);
      expect(loop.isOver).toBe(false);
      expect(loop.context.phase).toBe('player_turn');
      expect(loop.context.currentPlayerId).toBe('player');
    });

    it('honors custom player ids', () => {
      const { bus } = recordBus();
      const loop = new BattleLoop({
        eventBus: bus,
        players: ['hero', 'beast'],
      });
      expect(loop.players).toEqual(['hero', 'beast']);
      expect(loop.context.currentPlayerId).toBe('hero');
    });

    it('rejects missing eventBus', () => {
      expect(() => new BattleLoop({})).toThrow(TypeError);
      expect(() => new BattleLoop({ eventBus: {} })).toThrow(TypeError);
    });

    it('rejects fewer than 2 players', () => {
      const { bus } = recordBus();
      expect(() => new BattleLoop({ eventBus: bus, players: ['only'] })).toThrow(RangeError);
      expect(() => new BattleLoop({ eventBus: bus, players: [] })).toThrow(RangeError);
    });

    it('rejects non-string empty player ids', () => {
      const { bus } = recordBus();
      expect(() => new BattleLoop({ eventBus: bus, players: ['p1', ''] })).toThrow(TypeError);
    });
  });

  describe('start()', () => {
    it('emits ROUND_START then TURN_START and flips isRunning', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      expect(loop.isRunning).toBe(true);
      const names = events.map((e) => e.evt);
      expect(names).toContain(BattleEvents.ROUND_START);
      expect(names).toContain(BattleEvents.TURN_START);
      // First two events must be ROUND_START then TURN_START.
      expect(names[0]).toBe(BattleEvents.ROUND_START);
      expect(names[1]).toBe(BattleEvents.TURN_START);
    });

    it('is idempotent — second start() does not re-emit', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      const before = events.length;
      loop.start();
      expect(events.length).toBe(before);
    });

    it('refuses to start after the battle is over', () => {
      const { bus } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      loop.advance({ winner: 'player' }); // ends the battle
      expect(loop.isOver).toBe(true);
      expect(() => loop.start()).toThrow(Error);
    });
  });

  describe('advance() — phase progression', () => {
    it('PLAYER -> ENEMY -> EVENT -> END_ROUND advances correctly', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus, players: ['p', 'a'] });
      loop.start();
      const ctx0 = loop.context;
      // PlayerTurn -> EnemyTurn
      loop.advance();
      expect(loop.context.phase).toBe('enemy_turn');
      expect(loop.context.currentPlayerId).toBe('a');
      // EnemyTurn -> EventTurn
      loop.advance();
      expect(loop.context.phase).toBe('event_turn');
      expect(loop.context.currentPlayerId).toBeNull();
      // EventTurn -> EndRound
      loop.advance();
      expect(loop.context.phase).toBe('end_round');
      // Each advance emits TURN_END + TURN_START (except wraps emit ROUND_END/ROUND_START too).
      expect(ctx0.roundNumber).toBe(1);

      // Verify event sequence: TURN_END always precedes the next TURN_START.
      const idxs = (name) =>
        events.filter((e) => e.evt === name).map((e) => events.indexOf(e));
      const turnEndIdx = events.findIndex((e) => e.evt === BattleEvents.TURN_END);
      const turnStartIdx = events.findIndex((e) => e.evt === BattleEvents.TURN_START);
      expect(turnEndIdx).toBeGreaterThanOrEqual(0);
      expect(turnStartIdx).toBeGreaterThan(0);
    });

    it('END_ROUND wraps to PLAYER_TURN of round N+1', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      for (let i = 0; i < 3; i++) loop.advance();      // -> END_ROUND
      expect(loop.context.phase).toBe('end_round');
      loop.advance();                                   // wraps
      expect(loop.round).toBe(2);
      expect(loop.context.phase).toBe('player_turn');
      expect(loop.context.currentPlayerId).toBe('player');
      // Should now have emitted ROUND_END (round 1) + ROUND_START (round 2)
      const roundEvents = events
        .filter((e) =>
          e.evt === BattleEvents.ROUND_END || e.evt === BattleEvents.ROUND_START
        )
        .map((e) => e.evt);
      expect(roundEvents).toContain(BattleEvents.ROUND_END);
      expect(roundEvents.filter((n) => n === BattleEvents.ROUND_END).length).toBe(1);
      expect(roundEvents.filter((n) => n === BattleEvents.ROUND_START).length).toBe(2);
    });

    it('counts round increments correctly over multiple rounds', () => {
      const { bus } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      // 4 advances = end of round 1; each extra 4 advances wrap another round.
      // 9 advances = end of round 2 + 1 step into round 3 = ENEMY_TURN.
      for (let i = 0; i < 9; i++) loop.advance();
      expect(loop.round).toBe(3);
      expect(loop.context.phase).toBe('enemy_turn');
      expect(loop.context.currentPlayerId).toBe('ai');
    });
  });

  describe('advance({winner}) — game-over hook', () => {
    it('winner="player" emits BATTLE_WIN and locks the loop', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      loop.advance({ winner: 'player' });
      expect(loop.isOver).toBe(true);
      expect(loop.isRunning).toBe(false);
      const kinds = events.map((e) => e.evt);
      expect(kinds).toContain(BattleEvents.BATTLE_WIN);
      expect(kinds).not.toContain(BattleEvents.BATTLE_LOSE);
    });

    it('winner matching players[0] triggers BATTLE_WIN (id === first)', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({
        eventBus: bus,
        players: ['hero', 'beast'],
      });
      loop.start();
      loop.advance({ winner: 'hero' });
      expect(events.map((e) => e.evt)).toContain(BattleEvents.BATTLE_WIN);
    });

    it('winner === any other player id emits BATTLE_LOSE', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      loop.advance({ winner: 'ai' });
      expect(events.map((e) => e.evt)).toContain(BattleEvents.BATTLE_LOSE);
    });

    it('subsequent advance() after game over is a silent no-op', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      loop.advance({ winner: 'player' });
      const before = events.length;
      loop.advance();
      loop.advance({ winner: 'ai' });
      expect(events.length).toBe(before);
    });
  });

  describe('forceEnd()', () => {
    it('flips isOver without emitting BATTLE_WIN or BATTLE_LOSE', () => {
      const { bus, events } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      loop.start();
      loop.forceEnd();
      const kinds = events.map((e) => e.evt);
      expect(kinds).toContain(BattleEvents.TURN_END);
      expect(kinds).not.toContain(BattleEvents.BATTLE_WIN);
      expect(kinds).not.toContain(BattleEvents.BATTLE_LOSE);
      expect(loop.isOver).toBe(true);
      expect(loop.isRunning).toBe(false);
    });
  });

  describe('error handling', () => {
    it('advance() before start() throws', () => {
      const { bus } = recordBus();
      const loop = new BattleLoop({ eventBus: bus });
      expect(() => loop.advance()).toThrow(Error);
    });

    it('listener exceptions during emit() do not break the loop', () => {
      const bus = new EventBus({ onError: () => {} });   // swallow
      const loop = new BattleLoop({ eventBus: bus });
      const bad = () => { throw new Error('subscriber-broken'); };
      bus.on(BattleEvents.TURN_START, bad);
      expect(() => loop.start()).not.toThrow();
      expect(() => loop.advance()).not.toThrow();
      expect(loop.round).toBe(1);
    });
  });
});
