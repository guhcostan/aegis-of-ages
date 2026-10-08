/**
 * Procedural audio engine.
 *
 * Every sound is synthesised at runtime with the Web Audio API: no sample files,
 * no third-party assets. The engine also watches the simulation snapshots and
 * fires the right cue when something actually happens (a unit finishes, a
 * building completes, an age is reached, a fight starts, the match ends).
 *
 * The audio layer is strictly a consumer of state. It never touches the
 * simulation, so it cannot affect determinism.
 */
import { Age } from '../sim/constants';
import type { StateSnapshot } from '../sim/game';

type Cue =
  | 'uiClick'
  | 'unitReady'
  | 'buildingComplete'
  | 'ageUp'
  | 'combat'
  | 'select'
  | 'error'
  | 'victory'
  | 'defeat';

export interface AudioPreference {
  enabled: boolean;
  /** Master gain, 0..1. */
  volume: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.35;
  /** Throttle map so combat does not machine-gun the same cue. */
  private lastPlayed = new Map<Cue, number>();
  private lastTick = -1;
  private lastUnitCount: number[] = [];
  private lastBuildingCount: number[] = [];
  private lastAges: number[] = [];
  private wasOver = false;

  constructor(preference?: Partial<AudioPreference>) {
    if (preference?.enabled !== undefined) this.enabled = preference.enabled;
    if (preference?.volume !== undefined) this.volume = preference.volume;
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  resume(): void {
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.enabled = false;
        return;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.resume();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** Play a named cue, ignoring it when muted or throttled. */
  play(cue: Cue): void {
    if (!this.enabled) return;
    this.resume();
    if (!this.ctx || !this.master) return;

    const now = this.ctx.currentTime;
    const throttleMs: Partial<Record<Cue, number>> = {
      combat: 90,
      select: 60,
      uiClick: 40,
      unitReady: 120,
      buildingComplete: 200,
      ageUp: 400,
      error: 250,
    };
    const key = cue as Cue;
    const last = this.lastPlayed.get(key) ?? -1;
    if (now - last < (throttleMs[key] ?? 0) / 1000) return;
    this.lastPlayed.set(key, now);

    switch (cue) {
      case 'uiClick':
        this.blip(660, 0.05, 'square', 0.25);
        break;
      case 'select':
        this.blip(880, 0.04, 'triangle', 0.18);
        break;
      case 'error':
        this.blip(180, 0.14, 'sawtooth', 0.22);
        break;
      case 'unitReady':
        this.blip(520, 0.07, 'triangle', 0.22);
        this.blip(780, 0.09, 'triangle', 0.16, 0.05);
        break;
      case 'buildingComplete':
        this.thud(90, 0.16, 0.3);
        this.blip(392, 0.12, 'triangle', 0.14, 0.03);
        break;
      case 'ageUp':
        this.arpeggio([392, 494, 587, 784], 0.13, 'triangle', 0.22);
        break;
      case 'combat':
        this.noiseBurst(0.05, 0.16);
        break;
      case 'victory':
        this.arpeggio([523, 659, 784, 1047, 1319], 0.22, 'triangle', 0.3);
        break;
      case 'defeat':
        this.arpeggio([440, 392, 330, 262], 0.28, 'sawtooth', 0.22);
        break;
      default:
        break;
    }
  }

  /**
   * Compare two snapshots and fire the cues for what changed. Called once per
   * rendered frame by the session.
   */
  update(snapshot: StateSnapshot, localPlayer: number): void {
    if (!this.enabled) return;
    if (snapshot.tick === this.lastTick) return;
    this.lastTick = snapshot.tick;

    let units = 0;
    let buildings = 0;
    let fighting = false;
    for (const e of snapshot.entities) {
      if (e.owner !== localPlayer) continue;
      if (e.kind === 1) units++;
      else if (e.kind === 2 && e.construction >= 1000) buildings++;
      if (e.kind === 1 && e.hp < e.maxHp) fighting = true;
    }

    const prevUnits = this.lastUnitCount[localPlayer] ?? units;
    const prevBuildings = this.lastBuildingCount[localPlayer] ?? buildings;
    if (units > prevUnits) this.play('unitReady');
    if (buildings > prevBuildings) this.play('buildingComplete');
    if (fighting) this.play('combat');
    this.lastUnitCount[localPlayer] = units;
    this.lastBuildingCount[localPlayer] = buildings;

    const local = snapshot.players.find((p) => p.id === localPlayer);
    if (local) {
      const prevAge = this.lastAges[localPlayer] ?? Age.Dark;
      if (local.age > prevAge) this.play('ageUp');
      this.lastAges[localPlayer] = local.age;
    }

    if (snapshot.over && !this.wasOver) {
      this.wasOver = true;
      this.play(snapshot.winner === localPlayer ? 'victory' : 'defeat');
    }
  }

  dispose(): void {
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
  }

  /* ---------------------------------------------------------------- *
   * Synthesis primitives
   * ---------------------------------------------------------------- */

  private blip(frequency: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private thud(frequency: number, duration: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * 2, t0);
    osc.frequency.exponentialRampToValueAtTime(frequency, t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBurst(duration: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic-ish pseudo noise: a simple LCG, so the sound is stable
    // between runs of the same session without touching the sim RNG.
    let seed = 0x1234567;
    for (let i = 0; i < frames; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const env = 1 - i / frames;
      data[i] = ((seed / 0xffffffff) * 2 - 1) * env;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  private arpeggio(notes: number[], step: number, type: OscillatorType, gain: number): void {
    notes.forEach((note, i) => this.blip(note, step * 1.6, type, gain, i * step));
  }
}
