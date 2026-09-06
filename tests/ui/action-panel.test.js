// tests/ui/action-panel.test.js
// Vitest suite for ActionPanel overlay (W2 T2.4).
//
// We stub a minimal #action-panel with the four buttons and verify
// the disabled-state transitions driven by TURN_START/TURN_END +
// UNIT_SELECTED/DESELECTED events.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, BattleEvents } from '../../web/js/core/EventBus.js';
import { TurnContext } from '../../web/js/core/TurnContext.js';
import { SelectionEvents } from '../../web/js/core/SelectionManager.js';
import { ActionPanel } from '../../web/js/ui/ActionPanel.js';

function makePanelRoot() {
  const root = document.createElement('div');
  root.id = 'action-panel';
  for (const action of ['end-turn', 'move', 'attack', 'build']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'action-btn';
    b.dataset.action = action;
    b.textContent = action;
    root.appendChild(b);
  }
  document.body.appendChild(root);
  return root;
}

describe('ActionPanel', () => {
  let bus;
  let root;
  let playerCtx;
  let enemyCtx;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = makePanelRoot();
    bus = new EventBus();
    playerCtx = TurnContext.initial('player').with({ phase: 'player_turn' });
    enemyCtx = playerCtx.with({ phase: 'enemy_turn' });
  });

  describe('construction', () => {
    it('rejects missing eventBus', () => {
      expect(() => new ActionPanel({})).toThrow(TypeError);
    });

    it('rejects missing #action-panel root', () => {
      document.body.innerHTML = '';
      expect(() => new ActionPanel({ eventBus: bus })).toThrow(/missing #action-panel/);
    });

    it('starts with every button disabled (no TURN_START yet)', () => {
      new ActionPanel({ eventBus: bus, playerFaction: 'panda' });
      for (const b of root.querySelectorAll('button')) {
        expect(b.disabled).toBe(true);
      }
    });
  });

  describe('turn phase gates', () => {
    it('enables end-turn during PLAYER phase', () => {
      const ap = new ActionPanel({ eventBus: bus });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      expect(root.querySelector('[data-action="end-turn"]').disabled).toBe(false);
    });

    it('disables end-turn during ENEMY phase', () => {
      const ap = new ActionPanel({ eventBus: bus });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      bus.emit(BattleEvents.TURN_END, { context: enemyCtx });
      bus.emit(BattleEvents.TURN_START, { context: enemyCtx });
      expect(root.querySelector('[data-action="end-turn"]').disabled).toBe(true);
    });
  });

  describe('selection gates', () => {
    it('enables move/attack when a friendly unit is selected during PLAYER phase', () => {
      const ap = new ActionPanel({ eventBus: bus, playerFaction: 'panda' });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      bus.emit(SelectionEvents.UNIT_SELECTED, { unitId: 'u1', faction: 'panda' });
      expect(root.querySelector('[data-action="move"]').disabled).toBe(false);
      expect(root.querySelector('[data-action="attack"]').disabled).toBe(false);
    });

    it('keeps move/attack disabled when an ENEMY unit is somehow reported selected (defensive)', () => {
      // In normal flow SelectionManager only emits UNIT_SELECTED for
      // friendly units, but the panel checks faction defensively in
      // case the upstream contract changes.
      const ap = new ActionPanel({ eventBus: bus, playerFaction: 'panda' });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      bus.emit(SelectionEvents.UNIT_SELECTED, { unitId: 'e1', faction: 'wolf' });
      expect(root.querySelector('[data-action="move"]').disabled).toBe(true);
      expect(root.querySelector('[data-action="attack"]').disabled).toBe(true);
    });

    it('disables move/attack on DESELECTED', () => {
      const ap = new ActionPanel({ eventBus: bus, playerFaction: 'panda' });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      bus.emit(SelectionEvents.UNIT_SELECTED, { unitId: 'u1', faction: 'panda' });
      bus.emit(SelectionEvents.DESELECTED, {});
      expect(root.querySelector('[data-action="move"]').disabled).toBe(true);
      expect(root.querySelector('[data-action="attack"]').disabled).toBe(true);
    });

    it('move/attack require PLAYER phase — disabled even with friendly selection during ENEMY', () => {
      const ap = new ActionPanel({ eventBus: bus, playerFaction: 'panda' });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: enemyCtx });
      bus.emit(SelectionEvents.UNIT_SELECTED, { unitId: 'u1', faction: 'panda' });
      expect(root.querySelector('[data-action="move"]').disabled).toBe(true);
      expect(root.querySelector('[data-action="attack"]').disabled).toBe(true);
    });
  });

  describe('button click wiring', () => {
    it('invokes onAction callback only for enabled buttons', () => {
      const cb = vi.fn();
      const ap = new ActionPanel({ eventBus: bus, onAction: cb });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      root.querySelector('[data-action="end-turn"]').click();
      expect(cb).toHaveBeenCalledWith('end-turn');
      // move is still disabled
      root.querySelector('[data-action="move"]').click();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('trigger(action) fires callback programmatically', () => {
      const cb = vi.fn();
      const ap = new ActionPanel({ eventBus: bus, onAction: cb });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      ap.trigger('end-turn');
      expect(cb).toHaveBeenCalledWith('end-turn');
    });

    it('build button stays disabled in W2 (W3+ feature)', () => {
      const ap = new ActionPanel({ eventBus: bus });
      ap.init();
      bus.emit(BattleEvents.TURN_START, { context: playerCtx });
      bus.emit(SelectionEvents.UNIT_SELECTED, { unitId: 'u1', faction: 'panda' });
      expect(root.querySelector('[data-action="build"]').disabled).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('init() is idempotent', () => {
      const ap = new ActionPanel({ eventBus: bus });
      ap.init();
      ap.init();
      expect(bus.listenerCount(BattleEvents.TURN_START)).toBe(1);
      expect(bus.listenerCount(BattleEvents.TURN_END)).toBe(1);
      expect(bus.listenerCount(SelectionEvents.UNIT_SELECTED)).toBe(1);
      expect(bus.listenerCount(SelectionEvents.DESELECTED)).toBe(1);
    });

    it('destroy() unsubscribes', () => {
      const ap = new ActionPanel({ eventBus: bus });
      ap.init();
      ap.destroy();
      expect(bus.listenerCount(BattleEvents.TURN_START)).toBe(0);
    });
  });
});