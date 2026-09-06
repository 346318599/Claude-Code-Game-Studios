// tests/core/selection-manager.test.js
// Vitest suite for SelectionManager (W2 T2.3, 3rd-of-3 deliverable).

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../web/js/core/EventBus.js';
import { BattleMap } from '../../web/js/core/BattleMap.js';
import {
  SelectionManager,
  SelectionEvents,
} from '../../web/js/core/SelectionManager.js';
import { UnitType } from '../../web/js/core/UnitInstance.js';
import { BuildingType } from '../../web/js/core/BuildingInstance.js';

const PLAYER = 'player';
const AI = 'ai';

describe('SelectionManager', () => {
  describe('construction', () => {
    it('rejects missing eventBus / map', () => {
      const map = new BattleMap({ cols: 4, rows: 3 });
      expect(() => new SelectionManager({ map })).toThrow(TypeError);
      const bus = new EventBus();
      expect(() => new SelectionManager({ eventBus: bus })).toThrow(TypeError);
    });

    it('starts with no selection', () => {
      const bus = new EventBus();
      const map = new BattleMap({ cols: 4, rows: 3 });
      const sm = new SelectionManager({ eventBus: bus, map });
      expect(sm.hasSelection()).toBe(false);
      expect(sm.hasTarget()).toBe(false);
      expect(sm.selectedUnitId).toBeNull();
      expect(sm.targetTile).toBeNull();
    });
  });

  describe('click rules', () => {
    function setup(cols = 6, rows = 4) {
      const bus = new EventBus();
      const map = new BattleMap({ cols, rows });
      const events = [];
      for (const evt of Object.values(SelectionEvents)) {
        bus.on(evt, (p) => events.push({ evt, p }));
      }
      const sm = new SelectionManager({ eventBus: bus, map });
      return { bus, map, sm, events };
    }

    it('click friendly unit -> select (UNIT_SELECTED)', () => {
      const { sm, map, events } = setup();
      const u = map.spawnUnit({
        faction: PLAYER, type: UnitType.SOLDIER, position: { x: 2, y: 1 },
      });
      expect(sm.handleTileClick({ x: 2, y: 1 })).toBe(true);
      expect(sm.selectedUnitId).toBe(u.id);
      const kinds = events.map((e) => e.evt);
      expect(kinds).toContain(SelectionEvents.UNIT_SELECTED);
    });

    it('click friendly unit twice -> emits UNIT_SELECTED once', () => {
      const { sm, map, events } = setup();
      const u = map.spawnUnit({
        faction: PLAYER, type: UnitType.SOLDIER, position: { x: 0, y: 0 },
      });
      sm.handleTileClick({ x: 0, y: 0 });
      sm.handleTileClick({ x: 0, y: 0 });
      const selects = events.filter((e) => e.evt === SelectionEvents.UNIT_SELECTED);
      expect(selects).toHaveLength(1);
      expect(sm.selectedUnitId).toBe(u.id);
    });

    it('click enemy with selection -> set TARGET_HOVER', () => {
      const { sm, map, events } = setup();
      map.spawnUnit({ faction: PLAYER, type: UnitType.SOLDIER, position: { x: 1, y: 1 } });
      map.spawnUnit({ faction: AI,     type: UnitType.SOLDIER, position: { x: 3, y: 1 } });
      sm.handleTileClick({ x: 1, y: 1 });   // select friendly
      events.length = 0;                    // reset log so we only see target emit
      sm.handleTileClick({ x: 3, y: 1 });   // pick target enemy
      expect(sm.hasTarget()).toBe(true);
      expect(sm.targetTile).toEqual({ x: 3, y: 1 });
      const kinds = events.map((e) => e.evt);
      expect(kinds).toContain(SelectionEvents.TARGET_HOVER);
    });

    it('click enemy building with selection -> set TARGET_HOVER', () => {
      const { sm, map, events } = setup();
      map.spawnUnit({ faction: PLAYER, type: UnitType.SOLDIER, position: { x: 0, y: 0 } });
      map.spawnBuilding({ faction: AI, type: BuildingType.BASE, position: { x: 4, y: 3 } });
      sm.handleTileClick({ x: 0, y: 0 });
      events.length = 0;
      sm.handleTileClick({ x: 4, y: 3 });
      expect(sm.targetTile).toEqual({ x: 4, y: 3 });
      expect(events.map((e) => e.evt)).toContain(SelectionEvents.TARGET_HOVER);
    });

    it('click enemy unit WITHOUT selection -> no state change, no event', () => {
      // UX: clicking an enemy you don't have a unit selected for is a no-op.
      // SelectionManager leaves target unset and emits nothing. (Avoiding
      // a phantom DESELECTED when nothing was selected.)
      const { sm, map, events } = setup();
      map.spawnUnit({ faction: AI, type: UnitType.SOLDIER, position: { x: 2, y: 0 } });
      expect(sm.handleTileClick({ x: 2, y: 0 })).toBe(false);
      expect(sm.hasSelection()).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('click empty tile clears current selection', () => {
      const { sm, map, events } = setup();
      map.spawnUnit({ faction: PLAYER, type: UnitType.SOLDIER, position: { x: 0, y: 0 } });
      sm.handleTileClick({ x: 0, y: 0 });
      sm.handleTileClick({ x: 0, y: 0 });     // same tile -> nothing
      sm.handleTileClick({ x: 2, y: 2 });     // empty tile -> clear
      expect(sm.hasSelection()).toBe(false);
      expect(events.filter((e) => e.evt === SelectionEvents.DESELECTED).length).toBeGreaterThanOrEqual(1);
    });

    it('right-click (button=2) clears regardless of state', () => {
      const { sm, map, events } = setup();
      map.spawnUnit({ faction: PLAYER, type: UnitType.SOLDIER, position: { x: 0, y: 0 } });
      sm.handleTileClick({ x: 0, y: 0 });
      events.length = 0;
      expect(sm.handleTileClick({ x: 5, y: 5 }, { button: 2 })).toBe(true);
      expect(sm.hasSelection()).toBe(false);
      expect(events.map((e) => e.evt)).toContain(SelectionEvents.DESELECTED);
    });

    it('clear() returns false when nothing to clear', () => {
      const { sm } = setup();
      expect(sm.clear()).toBe(false);
    });

    it('handleTileClick rejects non-integer coords', () => {
      const { sm } = setup();
      // Only non-integer (e.g. 1.5) is treated as bad input. Negative
      // coords are valid integers — they fall through getTile() which
      // returns null and the click is a no-op (no throw, no event).
      expect(() => sm.handleTileClick({ x: 1.5, y: 0 })).toThrow(TypeError);
    });

    it('honors custom playerFaction', () => {
      const { sm, map, events } = setup();
      const bus = new EventBus();
      const map2 = new BattleMap({ cols: 4, rows: 3 });
      map2.spawnUnit({ faction: 'wolves', type: UnitType.SOLDIER, position: { x: 0, y: 0 } });
      const sm2 = new SelectionManager({ eventBus: bus, map: map2, playerFaction: 'wolves' });
      const evts = [];
      for (const evt of Object.values(SelectionEvents)) bus.on(evt, (p) => evts.push(evt));
      expect(sm2.handleTileClick({ x: 0, y: 0 })).toBe(true);
      expect(sm2.selectedUnitId).toBe(map2.getUnitsByFaction('wolves')[0].id);
      expect(events).toHaveLength(0);  // untouched set from outer setup
    });
  });

  describe('hover throttle', () => {
    it('emits TARGET_HOVER only once per ~50ms window', () => {
      const bus = new EventBus();
      const map = new BattleMap({ cols: 8, rows: 6 });
      const sm = new SelectionManager({ eventBus: bus, map });
      const spy = vi.fn();
      bus.on(SelectionEvents.TARGET_HOVER, spy);
      expect(sm.handleTileHover({ x: 1, y: 1 }, 0)).toBe(true);
      expect(sm.handleTileHover({ x: 1, y: 1 }, 10)).toBe(false);   // within gap
      expect(sm.handleTileHover({ x: 1, y: 1 }, 60)).toBe(true);    // past gap
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('rejects non-integer tile coordinates', () => {
      const bus = new EventBus();
      const map = new BattleMap();
      const sm = new SelectionManager({ eventBus: bus, map });
      expect(() => sm.handleTileHover({ x: 1.5, y: 0 })).toThrow(TypeError);
    });
  });
});
