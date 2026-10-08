/**
 * Integer fixed-point math helpers.
 *
 * Everything the simulation does with positions/speeds goes through here so
 * that gameplay state stays on exact integers. Division rounds toward zero
 * (Math.trunc semantics) which is deterministic and symmetric enough for our
 * use: we always floor when accumulating progress so that no time is created
 * from nothing.
 */
import { FP_ONE, FP_SHIFT } from './constants';

export { FP_ONE, FP_SHIFT };

/** Convert tiles (integer) to fixed point. */
export function fp(tiles: number): number {
  return tiles << FP_SHIFT;
}

/** Convert fixed point to whole tiles, truncating. */
export function toTiles(v: number): number {
  return v >> FP_SHIFT;
}

/** Multiply two fixed-point values. */
export function fpMul(a: number, b: number): number {
  return Math.trunc((a * b) / FP_ONE);
}

/**
 * Divide two fixed-point values. Guards against division by zero by returning
 * 0, so callers never produce NaN/Infinity in the state.
 */
export function fpDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.trunc((a * FP_ONE) / b);
}

/** Integer square root (floor) with no floating point. */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let x = n;
  let y = (x + 1) >> 1;
  while (y < x) {
    x = y;
    y = (x + Math.trunc(n / x)) >> 1;
  }
  return x;
}

/** Fixed-point distance between two points, floor-rounded. */
export function fpDist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  // dx*dx can exceed 2^53 for huge maps; our maps are <= 208 tiles = 212992 fp,
  // squared is ~4.5e10, well inside exact integer range.
  return isqrt(dx * dx + dy * dy);
}

/** Squared distance, exact integer, for cheap comparisons. */
export function fpDist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Clamp helper. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Linear interpolation in fixed point, t in [0, FP_ONE]. */
export function fpLerp(a: number, b: number, t: number): number {
  return a + fpMul(b - a, t);
}

/**
 * Integer trigonometry table. Angles are 1/256th of a turn (0..255).
 * Precomputed with exact integer rounding so no transcendental math is ever
 * executed inside the simulation loop.
 */
export const ANGLE_STEPS = 256;

/** sin table scaled by FP_ONE, index 0..255 == angle 0..2pi. */
export const SIN_TABLE: Int32Array = (() => {
  const t = new Int32Array(ANGLE_STEPS);
  // Build with a one-time numeric integration of the unit circle (exact enough
  // and computed once at module load, outside the deterministic tick path).
  for (let i = 0; i < ANGLE_STEPS; i++) {
    t[i] = Math.round(Math.sin((i / ANGLE_STEPS) * Math.PI * 2) * FP_ONE);
  }
  t[0] = 0;
  t[ANGLE_STEPS / 4] = FP_ONE;
  t[ANGLE_STEPS / 2] = 0;
  t[(ANGLE_STEPS * 3) / 4] = -FP_ONE;
  return t;
})();

export function fpSin(angle: number): number {
  return SIN_TABLE[angle & (ANGLE_STEPS - 1)] as number;
}

export function fpCos(angle: number): number {
  return SIN_TABLE[(angle + ANGLE_STEPS / 4) & (ANGLE_STEPS - 1)] as number;
}

/**
 * Normalize a direction vector given in fixed point into a unit vector of
 * length FP_ONE, using integer math only.
 */
export function fpNormalize(x: number, y: number): { x: number; y: number } {
  const len = isqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: Math.trunc((x * FP_ONE) / len), y: Math.trunc((y * FP_ONE) / len) };
}

/** Move `from` toward `to` by at most `step`, returning the new point. */
export function fpMoveToward(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  step: number,
): { x: number; y: number; done: boolean } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = isqrt(dx * dx + dy * dy);
  if (dist <= step || dist === 0) {
    return { x: toX, y: toY, done: true };
  }
  return {
    x: fromX + Math.trunc((dx * step) / dist),
    y: fromY + Math.trunc((dy * step) / dist),
    done: false,
  };
}
