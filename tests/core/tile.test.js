// tests/core/tile.test.js
// Vitest suite for Tile (W2 T2.2, 1st-of-4 deliverable).

import { describe, it, expect } from 'vitest';
import { Tile, TERRAINS } from '../../web/js/core/Tile.js';

describe('Tile', () => {
  describe('construction', () => {
    it('builds a plain tile by default with the requested coordinates', () => {
      const t = new Tile({ x: 3, y: 7 });
      expect(t.x).toBe(3);
      expect(t.y).toBe(7);
      expect(t.terrain).toBe('plain');
      expect(t.occupant).toBeNull();
      expect(t.building).toBeNull();
      expect(t.markers).toBeInstanceOf(Set);
    });

    it('honors explicit terrain from the whitelist', () => {
      for (const k of Object.keys(TERRAINS)) {
        const t = new Tile({ x: 0, y: 0, terrain: TERRAINS[k] });
        expect(t.terrain).toBe(TERRAINS[k]);
      }
    });

    it('rejects negative coordinates', () => {
      expect(() => new Tile({ x: -1, y: 0 })).toThrow(RangeError);
      expect(() => new Tile({ x: 0, y: -1 })).toThrow(RangeError);
    });

    it('rejects non-integer coordinates', () => {
      expect(() => new Tile({ x: 1.5, y: 0 })).toThrow(RangeError);
      expect(() => new Tile({ x: 0, y: NaN })).toThrow(RangeError);
    });

    it('rejects unknown terrain values', () => {
      expect(() => new Tile({ x: 0, y: 0, terrain: 'lava' })).toThrow(RangeError);
    });

    it('is a mutable container (BattleMap reassigns occupant / building)', () => {
      const t = new Tile({ x: 0, y: 0 });
      expect(() => { t.occupant = { id: 'x' }; }).not.toThrow();
      expect(() => { t.building = { id: 'y' }; }).not.toThrow();
    });
  });

  describe('passability and movement cost', () => {
    it('plain, forest, desert are passable', () => {
      expect(new Tile({ x: 0, y: 0, terrain: 'plain' }).isPassable()).toBe(true);
      expect(new Tile({ x: 0, y: 0, terrain: 'forest' }).isPassable()).toBe(true);
      expect(new Tile({ x: 0, y: 0, terrain: 'desert' }).isPassable()).toBe(true);
    });

    it('mountain and water are impassable', () => {
      expect(new Tile({ x: 0, y: 0, terrain: 'mountain' }).isPassable()).toBe(false);
      expect(new Tile({ x: 0, y: 0, terrain: 'water' }).isPassable()).toBe(false);
    });

    it('movementCost returns 1 for plain, 2 for forest/desert, Infinity for impassable', () => {
      expect(new Tile({ x: 0, y: 0, terrain: 'plain' }).movementCost()).toBe(1);
      expect(new Tile({ x: 0, y: 0, terrain: 'forest' }).movementCost()).toBe(2);
      expect(new Tile({ x: 0, y: 0, terrain: 'desert' }).movementCost()).toBe(2);
      expect(new Tile({ x: 0, y: 0, terrain: 'mountain' }).movementCost()).toBe(Infinity);
      expect(new Tile({ x: 0, y: 0, terrain: 'water' }).movementCost()).toBe(Infinity);
    });
  });

  describe('markers', () => {
    it('adds, queries, removes, and clears markers', () => {
      const t = new Tile({ x: 0, y: 0 });
      expect(t.addMarker('reachable')).toBe(1);
      expect(t.hasMarker('reachable')).toBe(true);
      expect(t.removeMarker('reachable')).toBe(true);
      expect(t.hasMarker('reachable')).toBe(false);
      t.addMarker('a');
      t.addMarker('b');
      expect(t.markers.size).toBe(2);
      t.clearMarkers();
      expect(t.markers.size).toBe(0);
    });

    it('rejects empty / non-string marker names', () => {
      const t = new Tile({ x: 0, y: 0 });
      expect(() => t.addMarker('')).toThrow(TypeError);
      expect(() => t.addMarker(null)).toThrow(TypeError);
      expect(() => t.addMarker(7)).toThrow(TypeError);
    });
  });
});
