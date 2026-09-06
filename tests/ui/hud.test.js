// tests/ui/hud.test.js
// Vitest suite for HUD overlay (W2 T2.4).
//
// DOM layer is exercised under happy-dom; we stub the HUD root + its
// three <span> children and assert that subscribed BattleEvents
// mutate the right <span>.

import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, BattleEvents } from '../../web/js/core/EventBus.js';
import { TurnContext } from '../../web/js/core/TurnContext.js';
import { HUD } from '../../web/js/ui/HUD.js';

function makeHudRoot() {
  const root = document.createElement('div');
  root.id = 'hud';
  for (const id of ['hud-round', 'hud-player', 'hud-phase']) {
    const span = document.createElement('span');
    span.id = id;
    root.appendChild(span);
  }
  document.body.appendChild(root);
  return root;
}

describe('HUD', () => {
  let bus;
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = makeHudRoot();
    bus = new EventBus();
  });

  describe('construction', () => {
    it('rejects missing eventBus', () => {
      expect(() => new HUD({})).toThrow(TypeError);
    });

    it('rejects missing #hud root', () => {
      document.body.innerHTML = '';
      expect(() => new HUD({ eventBus: bus })).toThrow(/missing #hud root/);
    });

    it('shows placeholder text before any event fires', () => {
      new HUD({ eventBus: bus });
      expect(root.querySelector('#hud-round').textContent).toBe('—');
      expect(root.querySelector('#hud-player').textContent).toBe('—');
      expect(root.querySelector('#hud-phase').textContent).toBe('—');
    });
  });

  describe('event subscription', () => {
    it('updates round on ROUND_START', () => {
      const hud = new HUD({ eventBus: bus });
      hud.init();
      bus.emit(BattleEvents.ROUND_START, { roundNumber: 3 });
      expect(root.querySelector('#hud-round').textContent).toBe('3');
    });

    it('updates player + phase on TURN_START (payload wraps context)', () => {
      const hud = new HUD({ eventBus: bus });
      hud.init();
      const ctx = TurnContext.initial('player').with({ phase: 'player_turn' });
      bus.emit(BattleEvents.TURN_START, { context: ctx });
      expect(root.querySelector('#hud-player').textContent).toBe('player');
      expect(root.querySelector('#hud-phase').textContent).toBe('player_turn');
    });

    it('updates phase on TURN_END but keeps playerId', () => {
      const hud = new HUD({ eventBus: bus });
      hud.init();
      const startCtx = TurnContext.initial('player').with({ phase: 'player_turn' });
      bus.emit(BattleEvents.TURN_START, { context: startCtx });
      const endCtx = startCtx.with({ phase: 'enemy_turn' });
      bus.emit(BattleEvents.TURN_END, { context: endCtx });
      expect(root.querySelector('#hud-player').textContent).toBe('player');
      expect(root.querySelector('#hud-phase').textContent).toBe('enemy_turn');
    });
  });

  describe('lifecycle', () => {
    it('init() is idempotent — only one subscription per event', () => {
      const hud = new HUD({ eventBus: bus });
      hud.init();
      hud.init();
      expect(bus.listenerCount(BattleEvents.ROUND_START)).toBe(1);
      expect(bus.listenerCount(BattleEvents.TURN_START)).toBe(1);
      expect(bus.listenerCount(BattleEvents.TURN_END)).toBe(1);
    });

    it('destroy() unsubscribes and ignores further events', () => {
      const hud = new HUD({ eventBus: bus });
      hud.init();
      hud.destroy();
      bus.emit(BattleEvents.ROUND_START, { roundNumber: 9 });
      expect(root.querySelector('#hud-round').textContent).toBe('—');
      expect(bus.listenerCount(BattleEvents.ROUND_START)).toBe(0);
    });
  });
});