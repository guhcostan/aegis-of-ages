/**
 * Input controller: turns mouse and keyboard into session actions.
 *
 * Left click selects (shift adds), left drag box-selects, double click selects
 * every unit of the same type on the map, right click issues the contextual
 * order (move, attack, gather, garrison, relic) and shift queues orders.
 * The camera pans with WASD/arrow keys, the screen edges, or a middle-drag;
 * the wheel zooms; Q and E rotate.
 */
import type { ScreenRect } from '../render/types';
import { FP_ONE } from '../sim/constants';
import type { GameSession } from './session';

/** Distance from a screen edge, in CSS pixels, that triggers edge panning. */
const EDGE_PAN_MARGIN = 24;
/** Ticks between camera pan updates while a key is held. */
const KEY_PAN_STEP = 8;
const DOUBLE_CLICK_MS = 320;

export class InputController {
  private keys = new Set<string>();
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;
  private middleDragging = false;
  private lastMiddleX = 0;
  private lastMiddleY = 0;
  private attackMoveArmed = false;
  private lastClickTime = 0;
  private lastClickTarget = 0;
  private pointerX = 0;
  private pointerY = 0;
  /** True only while the pointer is genuinely over the canvas. */
  private pointerOverCanvas = false;
  private edgePanTimer = 0;
  private disposers: Array<() => void> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly session: GameSession,
  ) {
    this.bind();
  }

  /* ---------------------------------------------------------------- *
   * Public controls used by the session and the HUD
   * ---------------------------------------------------------------- */

  armAttackMove(): void {
    this.attackMoveArmed = true;
    this.session.toast('Attack-move: right click a target position');
  }

  disarmAttackMove(): void {
    this.attackMoveArmed = false;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    if (this.edgePanTimer) window.clearInterval(this.edgePanTimer);
    this.edgePanTimer = 0;
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */

  private bind(): void {
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window | Document,
      type: K | string,
      handler: (ev: Event) => void,
      options?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type as string, handler as EventListener, options);
      this.disposers.push(() => target.removeEventListener(type as string, handler as EventListener));
    };

    on(this.canvas, 'contextmenu', (ev) => ev.preventDefault());
    on(this.canvas, 'mousedown', (ev) => this.onMouseDown(ev as MouseEvent));
    on(this.canvas, 'mousemove', (ev) => this.onMouseMove(ev as MouseEvent));
    on(window, 'mouseup', (ev) => this.onMouseUp(ev as MouseEvent));
    on(this.canvas, 'wheel', (ev) => this.onWheel(ev as WheelEvent), { passive: false });
    on(window, 'keydown', (ev) => this.onKeyDown(ev as KeyboardEvent));
    on(window, 'keyup', (ev) => this.onKeyUp(ev as KeyboardEvent));
    on(window, 'blur', () => this.keys.clear());
    on(this.canvas, 'mouseenter', () => {
      this.pointerOverCanvas = true;
    });
    on(this.canvas, 'mouseleave', () => {
      this.pointerOverCanvas = false;
      this.middleDragging = false;
    });

    // Edge panning runs on its own slow timer: it is a camera action, not a
    // simulation action, so it does not need frame-rate precision.
    this.edgePanTimer = window.setInterval(() => this.edgePan(), 33);
  }

  private canvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  private localX(ev: MouseEvent): number {
    return ev.clientX - this.canvasRect().left;
  }

  private localY(ev: MouseEvent): number {
    return ev.clientY - this.canvasRect().top;
  }

  /* ---------------------------------------------------------------- *
   * Mouse
   * ---------------------------------------------------------------- */

  private onMouseDown(ev: MouseEvent): void {
    this.canvas.focus();
    if (ev.button === 1) {
      this.middleDragging = true;
      this.lastMiddleX = ev.clientX;
      this.lastMiddleY = ev.clientY;
      ev.preventDefault();
      return;
    }
    if (ev.button === 0) {
      this.dragging = true;
      this.dragMoved = false;
      this.dragStartX = this.localX(ev);
      this.dragStartY = this.localY(ev);
      return;
    }
    if (ev.button === 2) {
      const x = this.localX(ev);
      const y = this.localY(ev);
      const world = this.session.renderer.screenToWorld(x, y);
      if (this.attackMoveArmed) {
        this.session.orderAt(world.x, world.y, x, y, ev.shiftKey, true);
        this.attackMoveArmed = false;
        return;
      }
      if (this.session.pendingBuild) {
        this.session.placePendingBuild(world.x, world.y);
        return;
      }
      this.session.orderAt(world.x, world.y, x, y, ev.shiftKey, false);
    }
  }

  private onMouseMove(ev: MouseEvent): void {
    const x = this.localX(ev);
    const y = this.localY(ev);
    this.pointerX = x;
    this.pointerY = y;

    if (this.middleDragging) {
      const dx = ev.clientX - this.lastMiddleX;
      const dy = ev.clientY - this.lastMiddleY;
      this.lastMiddleX = ev.clientX;
      this.lastMiddleY = ev.clientY;
      this.session.renderer.camera.panByScreen(-dx, -dy);
      return;
    }

    if (this.dragging) {
      if (Math.abs(x - this.dragStartX) > 4 || Math.abs(y - this.dragStartY) > 4) {
        this.dragMoved = true;
        this.session.setSelectionBox({
          x0: this.dragStartX,
          y0: this.dragStartY,
          x1: x,
          y1: y,
        });
      }
      return;
    }

    // Hover highlight.
    const snapshot = this.session.snapshot();
    const id = this.session.renderer.pickEntity(x, y, snapshot);
    this.session.setHovered(id);
  }

  private onMouseUp(ev: MouseEvent): void {
    if (ev.button === 1) {
      this.middleDragging = false;
      return;
    }
    if (ev.button !== 0 || !this.dragging) return;
    this.dragging = false;

    const x = this.localX(ev);
    const y = this.localY(ev);

    if (this.dragMoved) {
      const rect: ScreenRect = {
        x0: Math.min(this.dragStartX, x),
        y0: Math.min(this.dragStartY, y),
        x1: Math.max(this.dragStartX, x),
        y1: Math.max(this.dragStartY, y),
      };
      this.session.boxSelect(rect, ev.shiftKey);
      this.session.setSelectionBox(null);
      return;
    }

    const world = this.session.renderer.screenToWorld(x, y);
    if (this.session.pendingBuild) {
      this.session.placePendingBuild(world.x, world.y);
      return;
    }

    // Double click on the same entity selects every unit of its type.
    const picked = this.session.renderer.pickEntity(x, y, this.session.snapshot());
    const now = performance.now();
    if (picked !== 0 && picked === this.lastClickTarget && now - this.lastClickTime < DOUBLE_CLICK_MS) {
      this.session.selectAllOfType(picked);
      this.lastClickTime = 0;
      this.lastClickTarget = 0;
      return;
    }
    this.lastClickTime = now;
    this.lastClickTarget = picked;

    this.session.clickSelect(world.x, world.y, x, y, ev.shiftKey);
  }

  private onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    // CameraController.zoomBy takes a zoom-level multiplier: > 1 moves the
    // camera closer. Scrolling down must therefore zoom OUT.
    const factor = ev.deltaY > 0 ? 1 / 1.12 : 1.12;
    this.session.renderer.camera.zoomBy(factor);
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */

  private onKeyDown(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const key = ev.key;
    this.keys.add(key.toLowerCase());
    const ctrl = ev.ctrlKey || ev.metaKey;

    // Camera rotation: Q and E step 45 degrees, matching the AoE IV feel.
    if (!ctrl && (key === 'q' || key === 'Q')) {
      this.session.renderer.camera.rotateBy(-1);
      ev.preventDefault();
      return;
    }
    if (!ctrl && (key === 'e' || key === 'E')) {
      this.session.renderer.camera.rotateBy(1);
      ev.preventDefault();
      return;
    }
    // B toggles the build menu hint (the card already shows the options).
    if (!ctrl && key === 'b') {
      this.session.toast('Pick a building from the command card, then click the ground');
      ev.preventDefault();
      return;
    }
    if (key === 'Home') {
      const home = this.session.homePosition();
      this.session.renderer.camera.centerOn(home.x, home.y);
      ev.preventDefault();
      return;
    }

    if (this.session.handleHotkey(key, ctrl, ev.shiftKey)) {
      ev.preventDefault();
    }
  }

  private onKeyUp(ev: KeyboardEvent): void {
    this.keys.delete(ev.key.toLowerCase());
  }

  /** Pan the camera with the keyboard or by touching a screen edge. */
  private edgePan(): void {
    const camera = this.session.renderer.camera;
    const rect = this.canvasRect();
    const step = KEY_PAN_STEP * (camera.distance() / 40);

    let dx = 0;
    let dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx += step;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx -= step;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy += step;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy -= step;

    // Edge scrolling only while the pointer is really over the canvas: before
    // the first mouse move the tracked position is (0,0), which would otherwise
    // read as "top-left edge" and drag the camera away on its own.
    if (this.pointerOverCanvas) {
      if (this.pointerX < EDGE_PAN_MARGIN) dx += step;
      if (this.pointerX > rect.width - EDGE_PAN_MARGIN) dx -= step;
      if (this.pointerY < EDGE_PAN_MARGIN) dy += step;
      if (this.pointerY > rect.height - EDGE_PAN_MARGIN) dy -= step;
    }

    if (dx !== 0 || dy !== 0) camera.panByScreen(dx, dy);
  }

  /** Screen-space pointer position, exposed for tests and tooltips. */
  pointer(): { x: number; y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }

  /** Fixed-point world position under the pointer. */
  pointerWorld(): { x: number; y: number } {
    return this.session.renderer.screenToWorld(this.pointerX, this.pointerY);
  }

  isAttackMoveArmed(): boolean {
    return this.attackMoveArmed;
  }
}

export { FP_ONE };
