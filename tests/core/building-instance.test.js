// tests/core/building-instance.test.js
// Vitest suite for BuildingInstance (W2 T2.2, 4th-of-4 deliverable).

import { describe, it, expect } from 'vitest';
import {
  BuildingInstance,
  BuildingType,
} from '../../web/js/core/BuildingInstance.js';

describe('BuildingInstance', () => {
  describe('construction and types', () => {
    it('builds a headquarters ("base") by default', () => {
      const b = new BuildingInstance({
        id: 'b-1',
        faction: 'player',
        type: BuildingType.BASE,
        position: { x: 4, y: 4 },
      });
      expect(b.id).toBe('b-1');
      expect(b.type).toBe('base');
      expect(b.isHeadquarters()).toBe(true);
      expect(b.maxHp).toBe(200);
    });

    it('recognizes only "base" as headquarters', () => {
      for (const k of Object.keys(BuildingType)) {
        const b = new BuildingInstance({
          id: 'b',
          faction: 'p',
          type: BuildingType[k],
          position: { x: 0, y: 0 },
        });
        expect(b.isHeadquarters()).toBe(BuildingType[k] === BuildingType.BASE);
      }
    });

    it('honors explicit override of hp/maxHp', () => {
      const b = new BuildingInstance({
        id: 'b-1',
        faction: 'p',
        type: BuildingType.MINE,
        position: { x: 0, y: 0 },
        hp: 30,
        maxHp: 60,
      });
      expect(b.maxHp).toBe(60);
      expect(b.hp).toBe(30);
    });

    it('rejects bad input', () => {
      const base = { id: 'b', faction: 'p', type: 'base', position: { x: 0, y: 0 } };
      expect(() => new BuildingInstance({ ...base, id: '' })).toThrow(TypeError);
      expect(() => new BuildingInstance({ ...base, faction: '' })).toThrow(TypeError);
      expect(() => new BuildingInstance({ ...base, type: 'tent' })).toThrow(RangeError);
      expect(() => new BuildingInstance({ ...base, position: { x: -1, y: 0 } })).toThrow(RangeError);
      expect(() => new BuildingInstance({ ...base, hp: -1 })).toThrow(RangeError);
      expect(() => new BuildingInstance({ ...base, hp: 1000 })).toThrow(RangeError);
    });
  });

  describe('combat', () => {
    it('takeDamage caps at 0 and isDestroyed flips', () => {
      const b = new BuildingInstance({
        id: 'b', faction: 'p', type: 'barracks', position: { x: 0, y: 0 },
      });
      expect(b.takeDamage(40)).toBe(40);
      expect(b.hp).toBe(60);
      expect(b.isDestroyed()).toBe(false);
      expect(b.takeDamage(999)).toBe(60);
      expect(b.hp).toBe(0);
      expect(b.isDestroyed()).toBe(true);
    });

    it('heal caps at maxHp', () => {
      const b = new BuildingInstance({
        id: 'b', faction: 'p', type: 'tower', position: { x: 0, y: 0 },
      });
      b.takeDamage(30);
      expect(b.hp).toBe(50);
      expect(b.heal(999)).toBe(30);
      expect(b.hp).toBe(80);
    });

    it('rejects bad amounts', () => {
      const b = new BuildingInstance({
        id: 'b', faction: 'p', type: 'tower', position: { x: 0, y: 0 },
      });
      expect(() => b.takeDamage(-1)).toThrow(RangeError);
      expect(() => b.heal(NaN)).toThrow(RangeError);
    });
  });

  describe('production', () => {
    it('copy of default per turn', () => {
      const b = new BuildingInstance({
        id: 'b', faction: 'p', type: 'mine', position: { x: 0, y: 0 },
      });
      const t1 = b.productionTick();
      const t2 = b.productionTick();
      expect(t1).toEqual({ gold: 5 });
      expect(t2).toEqual({ gold: 5 });   // immutable per-call copy
      t1.gold = 999;
      expect(b.productionTick().gold).toBe(5);   // not mutated
    });

    it('non-producers return empty copy', () => {
      const b = new BuildingInstance({
        id: 'b', faction: 'p', type: 'barracks', position: { x: 0, y: 0 },
      });
      expect(b.productionTick()).toEqual({});
    });
  });

  describe('serialization', () => {
    it('serialize() returns a JSON-safe snapshot', () => {
      const b = new BuildingInstance({
        id: 'b',
        faction: 'p',
        type: 'base',
        position: { x: 7, y: 4 },
      });
      const s = b.serialize();
      expect(s.id).toBe('b');
      expect(s.position).toEqual({ x: 7, y: 4 });
      const json = JSON.parse(JSON.stringify(s));
      expect(json.id).toBe('b');
    });
  });
});
