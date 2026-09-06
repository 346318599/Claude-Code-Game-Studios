// tests/core/input-handler.test.js
// Vitest suite for InputHandler (W2 T2.3, 2nd-of-3 deliverable).

import { describe, it, expect } from 'vitest';
import { InputHandler } from '../../web/js/core/InputHandler.js';

describe('InputHandler', () => {
  describe('construction', () => {
    it('uses 64 px tileSize + identity camera by default', () => {
      const h = new InputHandler();
      expect(h.tileSize).toBe(64);
      expect(h.zoom).toBe(1);
      expect(h.offsetX).toBe(0);
      expect(h.offsetY).toBe(0);
    });

    it('honors custom tileSize / camera', () => {
      const h = new InputHandler({ tileSize: 48, offsetX: 100, offsetY: 50, zoom: 2 });
      expect(h.tileSize).toBe(48);
      expect(h.offsetX).toBe(100);
      expect(h.offsetY).toBe(50);
      expect(h.zoom).toBe(2);
    });

    it('rejects bad tileSize or zoom', () => {
      expect(() => new InputHandler({ tileSize: 0 })).toThrow(RangeError);
      expect(() => new InputHandler({ tileSize: -10 })).toThrow(RangeError);
      expect(() => new InputHandler({ zoom: 0 })).toThrow(RangeError);
      expect(() => new InputHandler({ zoom: -1 })).toThrow(RangeError);
    });
  });

  describe('screenToTile', () => {
    it('maps pixel center to a tile coordinate (1:1, no camera)', () => {
      const h = new InputHandler({ tileSize: 64 });
      expect(h.screenToTile({ x: 32, y: 32 })).toEqual({ x: 0, y: 0 });
      expect(h.screenToTile({ x: 96, y: 32 })).toEqual({ x: 1, y: 0 });
      expect(h.screenToTile({ x: 0, y: 64 })).toEqual({ x: 0, y: 1 });
    });

    it('handles negative bounds (above-left of grid)', () => {
      const h = new InputHandler({ tileSize: 64 });
      expect(h.screenToTile({ x: -10, y: -10 })).toEqual({ x: -1, y: -1 });
    });

    it('applies camera offset before scaling', () => {
      const h = new InputHandler({ tileSize: 64, offsetX: 100, offsetY: 50 });
      // screen 100 → world 0 → tile 0
      expect(h.screenToTile({ x: 100, y: 50 })).toEqual({ x: 0, y: 0 });
      // screen 164 → world 64 → tile 1
      expect(h.screenToTile({ x: 164, y: 114 })).toEqual({ x: 1, y: 1 });
    });

    it('applies zoom before flooring (zoom 2 makes tiles half-size on screen)', () => {
      const h = new InputHandler({ tileSize: 64, zoom: 2 });
      // worldX = screenX / zoom ; tileX = floor(worldX / tileSize)
      // screen 0   -> world 0   -> tile 0
      expect(h.screenToTile({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
      // screen 32  -> world 16  -> tile 0   (whole tile is from 0..64 world)
      expect(h.screenToTile({ x: 32, y: 0 })).toEqual({ x: 0, y: 0 });
      // screen 64  -> world 32  -> tile 0   (still inside tile 0's world span 0..64)
      expect(h.screenToTile({ x: 64, y: 0 })).toEqual({ x: 0, y: 0 });
      // screen 128 -> world 64  -> tile 1
      expect(h.screenToTile({ x: 128, y: 0 })).toEqual({ x: 1, y: 0 });
      // screen 192 -> world 96  -> tile 1
      expect(h.screenToTile({ x: 192, y: 0 })).toEqual({ x: 1, y: 0 });
      // screen 256 -> world 128 -> tile 2 ; screen 128 -> world 64 -> tile 1 (y)
      expect(h.screenToTile({ x: 256, y: 128 })).toEqual({ x: 2, y: 1 });
    });

    it('returns null on out-of-bounds when bounds supplied', () => {
      const h = new InputHandler({ tileSize: 64 });
      expect(h.screenToTile({ x: 0, y: 0 }, { cols: 8, rows: 6 })).toEqual({ x: 0, y: 0 });
      expect(h.screenToTile({ x: 8 * 64, y: 0 }, { cols: 8, rows: 6 })).toBeNull();
      expect(h.screenToTile({ x: 0, y: 6 * 64 }, { cols: 8, rows: 6 })).toBeNull();
      expect(h.screenToTile({ x: -10, y: 0 }, { cols: 8, rows: 6 })).toBeNull();
    });

    it('rejects non-finite coordinates', () => {
      const h = new InputHandler();
      expect(() => h.screenToTile({ x: NaN, y: 0 })).toThrow(TypeError);
      expect(() => h.screenToTile({ x: 10, y: '20' })).toThrow(TypeError);
    });

    it('rejects bad bounds', () => {
      const h = new InputHandler();
      expect(() => h.screenToTile({ x: 0, y: 0 }, { cols: 0, rows: 5 })).toThrow(RangeError);
      expect(() => h.screenToTile({ x: 0, y: 0 }, { cols: 5.5, rows: 5 })).toThrow(RangeError);
    });
  });

  describe('tileToScreen', () => {
    it('snaps to the center of the tile and respects camera', () => {
      const h = new InputHandler({ tileSize: 64, offsetX: 100, offsetY: 50 });
      expect(h.tileToScreen({ x: 0, y: 0 })).toEqual({ x: 132, y: 82 });
      expect(h.tileToScreen({ x: 1, y: 2 })).toEqual({ x: 196, y: 210 });
    });

    it('applies zoom on the inverse as well', () => {
      const h = new InputHandler({ tileSize: 64, zoom: 0.5 });
      expect(h.tileToScreen({ x: 1, y: 0 })).toEqual({ x: 48, y: 16 });
    });

    it('rejects negative / non-integer coordinates', () => {
      const h = new InputHandler();
      expect(() => h.tileToScreen({ x: -1, y: 0 })).toThrow(RangeError);
      expect(() => h.tileToScreen({ x: 1.5, y: 0 })).toThrow(TypeError);
    });
  });

  describe('setCamera', () => {
    it('updates only the supplied fields', () => {
      const h = new InputHandler({ offsetX: 10, offsetY: 20, zoom: 1 });
      h.setCamera({ offsetX: 30 });
      expect(h.offsetX).toBe(30);
      expect(h.offsetY).toBe(20);
      expect(h.zoom).toBe(1);
      h.setCamera({ zoom: 2 });
      expect(h.zoom).toBe(2);
      h.setCamera({ offsetY: -5 });
      expect(h.offsetY).toBe(-5);
    });

    it('rejects bad values', () => {
      const h = new InputHandler();
      expect(() => h.setCamera({ offsetX: NaN })).toThrow(RangeError);
      expect(() => h.setCamera({ zoom: -1 })).toThrow(RangeError);
    });
  });

  describe('roundTrip', () => {
    it('is exact at the center of every tile (zoom=1)', () => {
      const h = new InputHandler({ tileSize: 64 });
      const bounds = { cols: 16, rows: 9 };
      for (let y = 0; y < bounds.rows; y++) {
        for (let x = 0; x < bounds.cols; x++) {
          const round = h.roundTrip({ x, y }, bounds);
          expect(round).toEqual({ x, y });
        }
      }
    });
  });
});
