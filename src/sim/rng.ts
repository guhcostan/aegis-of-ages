/**
 * Deterministic pseudo random number generator.
 *
 * We use mulberry32 seeded through a splitmix32 mixing step. All arithmetic is
 * 32-bit integer arithmetic via `>>> 0` / `| 0`, so the output sequence is
 * bit-identical in every JS engine and in Node.
 *
 * The generator state lives inside the World, so a snapshot/restore of the
 * world fully reproduces subsequent randomness. Never use Math.random() in sim
 * code: lint forbids it (see eslint.config.js).
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = Rng.mix(seed | 0);
  }

  /** splitmix32 finalizer used to decorrelate weak/low seeds. */
  static mix(x: number): number {
    let z = (x + 0x9e3779b9) | 0;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  }

  /** Raw 32-bit unsigned value. */
  nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Integer in [0, bound). bound must be > 0. */
  nextInt(bound: number): number {
    if (bound <= 0) return 0;
    // Rejection sampling keeps the distribution uniform without floats.
    const limit = 0x100000000 - (0x100000000 % bound);
    for (;;) {
      const v = this.nextUint32();
      if (v < limit) return v % bound;
    }
  }

  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number {
    if (max <= min) return min;
    return min + this.nextInt(max - min + 1);
  }

  /** Fixed-point value in [0, FP_ONE). */
  nextFixedUnit(fpOne: number): number {
    return this.nextInt(fpOne);
  }

  /** True with probability numerator/denominator (integer math). */
  chance(numerator: number, denominator: number): boolean {
    return this.nextInt(denominator) < numerator;
  }

  /** Fisher-Yates shuffle, in place, deterministic. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j] as T;
      arr[j] = tmp as T;
    }
    return arr;
  }

  /** Serialize/restore for snapshots. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * FNV-1a based hasher used for the deterministic state digest and for deriving
 * per-subsystem seeds from the match seed.
 */
export class Hasher {
  private h = 0x811c9dc5;

  reset(): void {
    this.h = 0x811c9dc5;
  }

  int(value: number): this {
    let v = value | 0;
    for (let i = 0; i < 4; i++) {
      this.h ^= v & 0xff;
      this.h = Math.imul(this.h, 0x01000193) >>> 0;
      v >>>= 8;
    }
    return this;
  }

  string(s: string): this {
    for (let i = 0; i < s.length; i++) {
      this.h ^= s.charCodeAt(i) & 0xff;
      this.h = Math.imul(this.h, 0x01000193) >>> 0;
    }
    return this;
  }

  bool(b: boolean): this {
    return this.int(b ? 1 : 0);
  }

  /** Final 32-bit digest. */
  digest(): number {
    return this.h >>> 0;
  }

  /** Digest as an 8 char hex string, convenient in test output. */
  hex(): string {
    return (this.h >>> 0).toString(16).padStart(8, '0');
  }
}
