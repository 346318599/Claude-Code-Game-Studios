// tests/core/event-bus.test.js
// Vitest suite for EventBus (W2 T2.1, 2nd-of-3 deliverable).

import { describe, it, expect, vi } from 'vitest';
import { EventBus, BattleEvents } from '../../web/js/core/EventBus.js';

describe('EventBus', () => {
  describe('subscription', () => {
    it('invokes listener with payload on emit', () => {
      const bus = new EventBus();
      const listener = vi.fn();
      bus.on('x', listener);
      bus.emit('x', { hello: 'world' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ hello: 'world' });
    });

    it('returns an unsubscribe handle that detaches the listener', () => {
      const bus = new EventBus();
      const listener = vi.fn();
      const off = bus.on('x', listener);
      bus.emit('x', 1);
      off();
      bus.emit('x', 2);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1);
    });

    it('off() returns true only when listener was attached', () => {
      const bus = new EventBus();
      const listener = vi.fn();
      bus.on('x', listener);
      expect(bus.off('x', listener)).toBe(true);
      expect(bus.off('x', listener)).toBe(false);
    });

    it('once() fires exactly once even if emit is called twice', () => {
      const bus = new EventBus();
      const listener = vi.fn();
      bus.once('x', listener);
      bus.emit('x', 1);
      bus.emit('x', 2);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1);
    });

    it('listenerCount reflects attached handlers and clear() empties them', () => {
      const bus = new EventBus();
      expect(bus.listenerCount('x')).toBe(0);
      const a = () => {};
      const b = () => {};
      bus.on('x', a);
      bus.on('x', b);
      expect(bus.listenerCount('x')).toBe(2);
      bus.off('x', a);
      expect(bus.listenerCount('x')).toBe(1);
      bus.clear();
      expect(bus.listenerCount('x')).toBe(0);
    });

    it('multiple listeners on the same event all fire, in attach order', () => {
      const bus = new EventBus();
      const order = [];
      bus.on('x', () => order.push(1));
      bus.on('x', () => order.push(2));
      bus.on('x', () => order.push(3));
      bus.emit('x');
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('emit() with no listeners', () => {
    it('returns 0 and does not throw', () => {
      const bus = new EventBus();
      expect(bus.emit('nobody', 42)).toBe(0);
    });

    it('returns the count of listeners actually invoked', () => {
      const bus = new EventBus();
      bus.on('x', () => {});
      bus.on('x', () => {});
      bus.on('y', () => {});
      expect(bus.emit('x', null)).toBe(2);
      expect(bus.emit('y', null)).toBe(1);
    });
  });

  describe('exception isolation', () => {
    it('a listener that throws does not block subsequent listeners', () => {
      const onError = vi.fn();
      const bus = new EventBus({ onError });
      const bad = vi.fn(() => { throw new Error('boom'); });
      const good = vi.fn();
      bus.on('x', bad);
      bus.on('x', good);
      bus.emit('x', null);
      expect(bad).toHaveBeenCalledOnce();
      expect(good).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledOnce();
      const [eventName, err] = onError.mock.calls[0];
      expect(eventName).toBe('x');
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('boom');
    });

    it('default onError logs to console (smoke test)', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const bus = new EventBus();
      bus.on('x', () => { throw new Error('default-branch'); });
      bus.emit('x');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('input validation', () => {
    it('on() rejects non-string event names', () => {
      const bus = new EventBus();
      expect(() => bus.on('', () => {})).toThrow(TypeError);
      expect(() => bus.on(null, () => {})).toThrow(TypeError);
      expect(() => bus.on(42, () => {})).toThrow(TypeError);
    });

    it('on() rejects non-function listeners', () => {
      const bus = new EventBus();
      expect(() => bus.on('x', null)).toThrow(TypeError);
      expect(() => bus.on('x', 'not-a-fn')).toThrow(TypeError);
      expect(() => bus.on('x', {})).toThrow(TypeError);
    });
  });

  describe('BattleEvents catalog', () => {
    it('freezes the catalog at all required keys', () => {
      expect(Object.isFrozen(BattleEvents)).toBe(true);
      expect(BattleEvents.ROUND_START).toBe('round:start');
      expect(BattleEvents.TURN_START).toBe('turn:start');
      expect(BattleEvents.TURN_END).toBe('turn:end');
      expect(BattleEvents.ROUND_END).toBe('round:end');
      expect(BattleEvents.BATTLE_WIN).toBe('battle:win');
      expect(BattleEvents.BATTLE_LOSE).toBe('battle:lose');
    });
  });
});
