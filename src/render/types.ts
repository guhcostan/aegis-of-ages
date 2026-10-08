/**
 * Renderer contract.
 *
 * The render layer is a pure consumer of StateSnapshot: it never mutates
 * simulation state and never reads the World directly. That keeps the
 * deterministic core independent of three.js and lets the same snapshot feed
 * the HUD and the e2e tests.
 */
import type { StateSnapshot, EntitySnapshot } from '../sim/game';
import type { GameMap } from '../sim/map/terrain';

/** Camera behaviour required by the SPEC: pan, zoom and rotate. */
export interface CameraController {
  /** Move the camera focus by screen-space delta, in CSS pixels. */
  panByScreen(dx: number, dy: number): void;
  /** Move the camera focus straight to a world position (fixed point). */
  centerOn(x: number, y: number): void;
  /** Zoom by a multiplicative step (1.1 == 10% closer). */
  zoomBy(factor: number): void;
  /** Rotate the camera by a number of 1/256 turn steps. */
  rotateBy(steps: number): void;
  /** Set the rotation directly, in 1/256 turns. */
  setRotation(angle: number): void;
  /** Current rotation in 1/256 turns. */
  rotation(): number;
  /** Focus point in fixed point coordinates. */
  focus(): { x: number; y: number };
  /** Current zoom distance in world units. */
  distance(): number;
  /** Fit the camera to a world point with a sensible distance. */
  frameMap(widthTiles: number, heightTiles: number): void;
}

export interface FogView {
  /** 1 when the tile is currently visible to the local player. */
  visible: Uint8Array;
  /** 1 when the tile has ever been seen. */
  explored: Uint8Array;
}

/** Screen-space rectangle in CSS pixels. */
export interface ScreenRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Renderer {
  readonly camera: CameraController;

  /**
   * Provide the terrain once at match start. The renderer builds the terrain
   * mesh, the resource decorations and the static water from this.
   */
  setMap(map: GameMap): void;

  /** Push one simulation snapshot to the GPU. */
  sync(snapshot: StateSnapshot, selection: number[], hovered: number): void;

  /** Update the fog-of-war texture for the local player. */
  setFog(fog: FogView): void;

  /** Update the minimap every frame. */
  renderMinimap(canvas: HTMLCanvasElement, snapshot: StateSnapshot, fog: FogView): void;

  /**
   * Convert a canvas-relative CSS pixel position into world fixed-point
   * coordinates, ray-casting against the terrain.
   */
  screenToWorld(cssX: number, cssY: number): { x: number; y: number };

  /**
   * Entity id under the cursor, or 0. Units take priority over buildings and
   * resources so that clicking a villager standing on a farm selects the
   * villager.
   */
  pickEntity(cssX: number, cssY: number, snapshot: StateSnapshot): number;

  /**
   * Every own entity whose screen projection falls inside the rectangle.
   * Ownership filtering is left to the caller.
   */
  pickRect(rect: ScreenRect, snapshot: StateSnapshot): number[];

  /** Draw the current drag-selection box, or clear it with null. */
  setSelectionBox(rect: ScreenRect | null): void;

  /** Show a click feedback marker at a world position (attack/move orders). */
  showOrderMarker(x: number, y: number, kind: 'move' | 'attack' | 'gather' | 'build'): void;

  /** Per-frame interpolation between the previous and current snapshot. */
  setInterpolation(alpha: number): void;

  /** Called once per animation frame to draw. */
  draw(): void;

  resize(width: number, height: number): void;

  /** Performance counters for the e2e fps test. */
  stats(): { drawCalls: number; instances: number; fps: number };

  dispose(): void;
}

export type { EntitySnapshot };
