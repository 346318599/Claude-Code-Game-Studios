// tests/core/unit-instance.test.js
// Vitest suite for UnitInstance (W2 T2.2, 3rd-of-4 deliverable).

import { describe, it, expect } from 'vitest';
import {
  UnitInstance,
  UnitType,
} from '../../web/js/core/UnitInstance.js';

describe('UnitInstance', () => {
  describe('construction', () => {
    it('honors explicit stats and defaults the rest', () => {
      const u = new UnitInstance({
        id: 'u-1',
        faction: 'player',
        type: UnitType.SOLDIER,
        position: { x: 4, y: 7 },
      });
      expect(u.id).toBe('u-1');
      expect(u.faction).toBe('player');
      expect(u.type).toBe('soldier');
      expect(u.position).toEqual({ x: 4, y: 7 });
      expect(u.maxHp).toBe(40);   // default for SOLDIER
      expect(u.hp).toBe(40);
      expect(u.attack).toBe(8);
      expect(u.defense).toBe(4);
      expect(u.canMove).toBe(true);
      expect(u.buffs).toEqual([]);
    });

    it('overrides defaults per-instance', () => {
      const u = new UnitInstance({
        id: 'hero-1',
        faction: 'player',
        type: UnitType.HERO,
        position: { x: 0, y: 0 },
        hp: 75,
        attack: 25,
      });
      expect(u.maxHp).toBe(100);
      expect(u.hp).toBe(75);
      expect(u.attack).toBe(25);
    });

    it('rejects bad input', () => {
      const base = { id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 } };
      expect(() => new UnitInstance({ ...base, id: '' })).toThrow(TypeError);
      expect(() => new UnitInstance({ ...base, faction: '' })).toThrow(TypeError);
      expect(() => new UnitInstance({ ...base, type: 'dragon' })).toThrow(RangeError);
      expect(() => new UnitInstance({ ...base, position: { x: -1, y: 0 } })).toThrow(RangeError);
      expect(() => new UnitInstance({ ...base, hp: -1 })).toThrow(RangeError);
      expect(() => new UnitInstance({ ...base, hp: 1000 })).toThrow(RangeError);
      expect(() => new UnitInstance({ ...base, hp: 1.5 })).toThrow(RangeError);
    });
  });

  describe('combat', () => {
    it('takeDamage reduces hp and caps at 0', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      expect(u.takeDamage(10)).toBe(10);
      expect(u.hp).toBe(30);
      expect(u.takeDamage(999)).toBe(30);
      expect(u.hp).toBe(0);
      expect(u.isDead()).toBe(true);
    });

    it('heal restores hp and caps at maxHp', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      u.takeDamage(20);
      expect(u.hp).toBe(20);
      expect(u.heal(5)).toBe(5);
      expect(u.hp).toBe(25);
      expect(u.heal(999)).toBe(15);
      expect(u.hp).toBe(40);
    });

    it('rejects negative or non-finite amounts', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      expect(() => u.takeDamage(-1)).toThrow(RangeError);
      expect(() => u.takeDamage(NaN)).toThrow(RangeError);
      expect(() => u.heal(Infinity)).toThrow(RangeError);
    });
  });

  describe('movement', () => {
    it('moveTo updates position', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      u.moveTo({ x: 5, y: 2 });
      expect(u.position).toEqual({ x: 5, y: 2 });
    });

    it('moveTo rejects out-of-bounds and non-integers', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      expect(() => u.moveTo({ x: -1, y: 0 })).toThrow(RangeError);
      expect(() => u.moveTo({ x: 1.5, y: 0 })).toThrow(TypeError);
    });
  });

  describe('buffs', () => {
    it('adds, queries, and removes buffs', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      expect(u.addBuff({ name: 'shield', value: 5 })).toBe(true);
      expect(u.hasBuff('shield')).toBe(true);
      expect(u.getBuff('shield').value).toBe(5);
      expect(u.addBuff({ name: 'shield', value: 9 })).toBe(false);   // duplicate
      expect(u.removeBuff('shield')).toBe(true);
      expect(u.hasBuff('shield')).toBe(false);
      expect(u.getBuff('shield')).toBeNull();
    });

    it('rejects buff without a non-empty name', () => {
      const u = new UnitInstance({
        id: 'u', faction: 'p', type: 'soldier', position: { x: 0, y: 0 },
      });
      expect(() => u.addBuff({ value: 1 })).toThrow(TypeError);
      expect(() => u.addBuff({ name: '' })).toThrow(TypeError);
    });
  });

  describe('serialization', () => {
    it('serialize() returns a JSON-safe snapshot', () => {
      const u = new UnitInstance({
        id: 'u',
        faction: 'p',
        type: UnitType.KNIGHT,
        position: { x: 2, y: 3 },
        hp: 30,
      });
      u.addBuff({ name: 'protect', value: 2 });
      const s = u.serialize();
      expect(s.id).toBe('u');
      expect(s.position).toEqual({ x: 2, y: 3 });
      expect(s.buffs).toEqual([{ name: 'protect', value: 2 }]);
      // Roundtrip
      const json = JSON.parse(JSON.stringify(s));
      expect(json.id).toBe('u');
    });
  });
});
