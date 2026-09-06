// tests/core/battle-map.test.js
// Vitest suite for BattleMap (W2 T2.2, 2nd-of-4 deliverable).

import { describe, it, expect } from 'vitest';
import { BattleMap } from '../../web/js/core/BattleMap.js';
import { UnitType } from '../../web/js/core/UnitInstance.js';
import { BuildingType } from '../../web/js/core/BuildingInstance.js';

describe('BattleMap', () => {
  describe('construction', () => {
    it('builds a 16x9 plain grid by default', () => {
      const m = new BattleMap();
      expect(m.cols).toBe(16);
      expect(m.rows).toBe(9);
      expect(m.getTile(0, 0).terrain).toBe('plain');
      expect(m.getTile(15, 8).terrain).toBe('plain');
    });

    it('rejects invalid dimensions', () => {
      expect(() => new BattleMap({ cols: 0 })).toThrow(RangeError);
      expect(() => new BattleMap({ rows: -1 })).toThrow(RangeError);
      expect(() => new BattleMap({ cols: 4.5 })).toThrow(RangeError);
    });

    it('exposes the underlying 2D tile array as m.grid (read by renderers)', () => {
      const m = new BattleMap({ cols: 4, rows: 3 });
      expect(m.grid).toBeDefined();
      expect(m.grid.length).toBe(3);
      expect(m.grid[0].length).toBe(4);
      // Same identity as the underlying storage (live ref).
      const t = m.grid[1][2];
      expect(t).toBe(m.getTile(2, 1));
      expect(t.x).toBe(2);
      expect(t.y).toBe(1);
    });

    it('exposes m.units / m.buildings live arrays for renderer consumers', () => {
      const m = new BattleMap({ cols: 4, rows: 3 });
      expect(m.units).toEqual([]);
      expect(m.buildings).toEqual([]);
      const u = m.spawnUnit({ faction: 'panda', type: 'worker', position: { x: 1, y: 1 } });
      expect(m.units).toContain(u);
      const b = m.spawnBuilding({ faction: 'panda', type: 'base', position: { x: 0, y: 0 } });
      expect(m.buildings).toContain(b);
    });

    it('isInBounds covers the inclusive [0, cols) x [0, rows) range', () => {
      const m = new BattleMap({ cols: 4, rows: 3 });
      expect(m.isInBounds(0, 0)).toBe(true);
      expect(m.isInBounds(3, 2)).toBe(true);
      expect(m.isInBounds(4, 2)).toBe(false);
      expect(m.isInBounds(0, 3)).toBe(false);
      expect(m.isInBounds(-1, 0)).toBe(false);
      expect(m.isInBounds('a', 0)).toBe(false);
    });

    it('getTile returns null out of bounds', () => {
      const m = new BattleMap();
      expect(m.getTile(-1, 0)).toBeNull();
      expect(m.getTile(100, 100)).toBeNull();
    });

    it('allTiles yields the full grid', () => {
      const m = new BattleMap({ cols: 4, rows: 3 });
      const tiles = [...m.allTiles()];
      expect(tiles.length).toBe(12);
    });
  });

  describe('unit spawn / remove', () => {
    it('spawns a unit at the requested tile and reflects on Tile.occupant', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const u = m.spawnUnit({
        id: 'soldier-1',
        faction: 'player',
        type: UnitType.SOLDIER,
        position: { x: 3, y: 2 },
      });
      expect(u.id).toBe('soldier-1');
      expect(m.getUnit('soldier-1')).toBe(u);
      expect(m.getUnitAt(3, 2)).toBe(u);
      expect(m.getTile(3, 2).occupant).toBe(u);
    });

    it('mints sequential ids when none provided', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const a = m.spawnUnit({ faction: 'p', type: 'worker',  position: { x: 0, y: 0 } });
      const b = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 1, y: 0 } });
      expect(a.id).toBe('unit-1');
      expect(b.id).toBe('unit-2');
    });

    it('rejects spawning on an occupied tile or onto an out-of-bounds position', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      m.spawnUnit({ faction: 'p', type: 'worker', position: { x: 0, y: 0 } });
      expect(() =>
        m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } })
      ).toThrow();
      expect(() =>
        m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 99, y: 0 } })
      ).toThrow(RangeError);
    });

    it('rejects duplicate ids', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      m.spawnUnit({ id: 'x', faction: 'p', type: 'soldier', position: { x: 0, y: 0 } });
      expect(() =>
        m.spawnUnit({ id: 'x', faction: 'p', type: 'soldier', position: { x: 1, y: 0 } })
      ).toThrow();
    });

    it('removeUnit clears the occupant ref and the registry', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const u = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 2, y: 3 } });
      expect(m.removeUnit(u.id)).toBe(u);
      expect(m.getUnit(u.id)).toBeNull();
      expect(m.getUnitAt(2, 3)).toBeNull();
      expect(m.getTile(2, 3).occupant).toBeNull();
      expect(m.removeUnit(u.id)).toBeNull();   // idempotent
    });
  });

  describe('moveUnit', () => {
    it('rewires Tile.occupant across two tiles', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const u = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } });
      m.moveUnit(u.id, { x: 3, y: 4 });
      expect(m.getTile(0, 0).occupant).toBeNull();
      expect(m.getTile(3, 4).occupant).toBe(u);
      expect(u.position).toEqual({ x: 3, y: 4 });
    });

    it('rejects moving onto occupied or out-of-bounds destinations', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const a = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } });
      const b = m.spawnUnit({ faction: 'p', type: 'worker',  position: { x: 1, y: 0 } });
      expect(() => m.moveUnit(a.id, { x: 1, y: 0 })).toThrow();
      expect(() => m.moveUnit(a.id, { x: -1, y: 0 })).toThrow(RangeError);
      expect(() => m.moveUnit(a.id, { x: 100, y: 100 })).toThrow(RangeError);
      // b is still alive and at its old position
      expect(m.getTile(1, 0).occupant).toBe(b);
    });

    it('rejects moving onto a tile that holds a building', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const u = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } });
      const b = m.spawnBuilding({ faction: 'p', type: BuildingType.BARRACKS, position: { x: 1, y: 0 } });
      expect(() => m.moveUnit(u.id, { x: 1, y: 0 })).toThrow();
      expect(m.getTile(1, 0).building).toBe(b);
    });

    it('moveUnit noop when destination is current tile', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const u = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 2, y: 2 } });
      m.moveUnit(u.id, { x: 2, y: 2 });
      expect(m.getTile(2, 2).occupant).toBe(u);
      expect(u.position).toEqual({ x: 2, y: 2 });
    });
  });

  describe('unit queries', () => {
    it('getUnitsByFaction returns only that faction\'s units', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      m.spawnUnit({ faction: 'player', type: 'worker',  position: { x: 0, y: 0 } });
      m.spawnUnit({ faction: 'player', type: 'soldier', position: { x: 1, y: 0 } });
      m.spawnUnit({ faction: 'ai',     type: 'soldier', position: { x: 2, y: 0 } });
      expect(m.getUnitsByFaction('player')).toHaveLength(2);
      expect(m.getUnitsByFaction('ai')).toHaveLength(1);
      expect(m.getUnitsByFaction('ghost')).toEqual([]);
    });
  });

  describe('building lifecycle', () => {
    it('spawns, removes, and exposes at/by-id queries', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      const b = m.spawnBuilding({
        faction: 'player', type: BuildingType.MINE, position: { x: 2, y: 2 },
      });
      expect(m.getBuilding(b.id)).toBe(b);
      expect(m.getBuildingAt(2, 2)).toBe(b);
      expect(m.removeBuilding(b.id)).toBe(b);
      expect(m.getBuildingAt(2, 2)).toBeNull();
      expect(m.getTile(2, 2).building).toBeNull();
    });

    it('rejects spawning on a tile already holding unit or building', () => {
      const m = new BattleMap({ cols: 8, rows: 6 });
      m.spawnBuilding({ faction: 'p', type: 'base', position: { x: 0, y: 0 } });
      expect(() =>
        m.spawnBuilding({ faction: 'p', type: 'barracks', position: { x: 0, y: 0 } })
      ).toThrow();
      expect(() =>
        m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } })
      ).toThrow();
    });
  });

  describe('serialize()', () => {
    it('roundtrips grid + units + buildings to a JSON-safe object', () => {
      const m = new BattleMap({ cols: 4, rows: 3 });
      m.spawnBuilding({ faction: 'p', type: 'base',     position: { x: 1, y: 1 } });
      const u = m.spawnUnit({ faction: 'p', type: 'soldier', position: { x: 0, y: 0 } });
      u.takeDamage(5);
      const snap = m.serialize();
      expect(snap.cols).toBe(4);
      expect(snap.rows).toBe(3);
      expect(snap.tiles).toHaveLength(3);
      expect(snap.tiles[0]).toHaveLength(4);
      expect(snap.units).toHaveLength(1);
      expect(snap.buildings).toHaveLength(1);
      expect(snap.units[0].hp).toBe(35);   // 40 - 5
      const json = JSON.parse(JSON.stringify(snap));
      expect(json.units[0].id).toBeDefined();
    });
  });
});
