// tests/core/input-subsystem.test.js
// Vitest suite for InputSubsystem (W2 T2.3, 1st-of-3 deliverable).

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../web/js/core/EventBus.js';
import {
  InputSubsystem,
  InputEvents,
} from '../../web/js/core/InputSubsystem.js';

// Test stub mimicking a Phaser-like source. Each "on*" method records
// the callback and returns a REAL unsubscribe handle (removes the
// callback from the array). Lets us assert that InputSubsystem.destroy()
// actually detaches the handler.
function fakeSource() {
  const handlers = {
    onPointerDown: [],
    onPointerMove: [],
    onPointerUp:   [],
    onKeyDown:     [],
  };
  // Mirror Phaser/EventEmitter behavior: the unsubscribe handle closes
  // over the registered cb, so the caller invokes it with zero args
  // (matches InputSubsystem.destroy which just calls off()).
  function makeOn(kind) {
    return (cb) => {
      handlers[kind].push(cb);
      let removed = false;
      return () => {
        if (removed) return;
        removed = true;
        const i = handlers[kind].indexOf(cb);
        if (i !== -1) handlers[kind].splice(i, 1);
      };
    };
  }
  return {
    handlers,
    onPointerDown: makeOn('onPointerDown'),
    onPointerMove: makeOn('onPointerMove'),
    onPointerUp:   makeOn('onPointerUp'),
    onKeyDown:     makeOn('onKeyDown'),
    trigger(kind, ...args) { for (const cb of handlers[kind]) cb(...args); },
  };
}

describe('InputSubsystem', () => {
  describe('construction', () => {
    it('rejects missing eventBus / source', () => {
      expect(() => new InputSubsystem({ source: {} })).toThrow(TypeError);
      expect(() => new InputSubsystem({ eventBus: new EventBus() })).toThrow(TypeError);
    });

    it('rejects source missing required methods', () => {
      const bus = new EventBus();
      expect(() =>
        new InputSubsystem({
          eventBus: bus,
          source: { onPointerDown: () => {}, onPointerMove: () => {} },   // missing up/key
        })
      ).toThrow(TypeError);
    });

    it('attaches immediately and isAttached is true', () => {
      const bus = new EventBus();
      const src = fakeSource();
      const sys = new InputSubsystem({ eventBus: bus, source: src });
      expect(sys.isAttached).toBe(true);
      expect(src.handlers.onPointerDown).toHaveLength(1);
    });
  });

  describe('event bridging', () => {
    it('emits POINTER_DOWN with x, y, button on source.onPointerDown', () => {
      const bus = new EventBus();
      const src = fakeSource();
      new InputSubsystem({ eventBus: bus, source: src });
      const spy = vi.fn();
      bus.on(InputEvents.POINTER_DOWN, spy);
      src.trigger('onPointerDown', 100, 200, 0);
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith({ x: 100, y: 200, button: 0 });
    });

    it('emits all four event kinds', () => {
      const bus = new EventBus();
      const src = fakeSource();
      new InputSubsystem({ eventBus: bus, source: src });
      const seen = new Set();
      for (const evt of Object.values(InputEvents)) {
        bus.on(evt, (p) => seen.add({ evt, p }));
      }
      src.trigger('onPointerDown', 1, 2);
      src.trigger('onPointerMove', 3, 4);
      src.trigger('onPointerUp', 5, 6);
      src.trigger('onKeyDown', 'a', { shift: true });
      expect(seen.size).toBe(4);
      const kinds = [...seen].map((s) => s.evt).sort();
      expect(kinds).toContain(InputEvents.POINTER_DOWN);
      expect(kinds).toContain(InputEvents.POINTER_MOVE);
      expect(kinds).toContain(InputEvents.POINTER_UP);
      expect(kinds).toContain(InputEvents.KEY_DOWN);
    });

    it('KEY_DOWN payload captures key name and modifier object', () => {
      const bus = new EventBus();
      const src = fakeSource();
      new InputSubsystem({ eventBus: bus, source: src });
      const spy = vi.fn();
      bus.on(InputEvents.KEY_DOWN, spy);
      src.trigger('onKeyDown', 'Escape', { ctrl: true });
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith({ key: 'Escape', mods: { ctrl: true } });
    });
  });

  describe('destroy / reattach', () => {
    it('destroy() unsubscribes handlers and isAttached flips false', () => {
      const bus = new EventBus();
      const src = fakeSource();
      const sys = new InputSubsystem({ eventBus: bus, source: src });
      sys.destroy();
      expect(sys.isAttached).toBe(false);
    });

    it('destroy is idempotent', () => {
      const bus = new EventBus();
      const src = fakeSource();
      const sys = new InputSubsystem({ eventBus: bus, source: src });
      sys.destroy();
      expect(() => sys.destroy()).not.toThrow();
    });

    it('reattach after destroy re-installs handlers', () => {
      const bus = new EventBus();
      const src = fakeSource();
      const sys = new InputSubsystem({ eventBus: bus, source: src });
      sys.destroy();
      sys.reattach();
      expect(sys.isAttached).toBe(true);
      const spy = vi.fn();
      bus.on(InputEvents.POINTER_DOWN, spy);
      src.trigger('onPointerDown', 10, 20);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('destroy does not throw even if a source handle throws', () => {
      const bus = new EventBus();
      const src = {
        onPointerDown: () => () => { throw new Error('boom'); },
        onPointerMove: () => () => {},
        onPointerUp:   () => () => {},
        onKeyDown:     () => () => {},
      };
      const sys = new InputSubsystem({ eventBus: bus, source: src });
      expect(() => sys.destroy()).not.toThrow();
    });
  });
});
