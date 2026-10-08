/**
 * three.js renderer for Aegis of Ages.
 *
 * The renderer is a pure consumer of `StateSnapshot`: it never touches the
 * simulation, it only uploads positions, colours and fog into GPU buffers.
 *
 * Design notes
 * ------------
 *  - WebGL2 through three.js, antialiased, sRGB output, shadows off (the SPEC
 *    asks for 200 units at 60 fps: shadows would triple the draw cost).
 *  - One merged geometry per entity definition, drawn with a single
 *    InstancedMesh: 200 units cost as many draw calls as there are unit types.
 *  - InstancedMesh objects are only reallocated when a type's capacity really
 *    changes, never per frame; matrices, colours and per-instance alpha are
 *    rewritten in place every frame from scratch objects (no allocations).
 *  - Fog of war is a single textured quad above the terrain; enemies on tiles
 *    the local player cannot see are written with a zero-scale matrix.
 */
import * as THREE from 'three';
import { FP_ONE } from '../sim/constants';
import { EntityKind } from '../sim/types';
import { BUILDINGS } from '../sim/data/buildings';
import { ELEV_UNIT } from '../sim/map/terrain';
import type { GameMap } from '../sim/map/terrain';
import type { EntitySnapshot, StateSnapshot } from '../sim/game';
import type { CameraController, FogView, Renderer, ScreenRect } from './types';
import {
  buildTerrainMesh,
  buildWaterMesh,
  resetTerrainDrawRange,
  setTerrainRowWindow,
  terrainHeightAtWorld,
} from './terrain-mesh';
import { createDiscTexture, createFogTexture, createNoiseTexture } from './textures';
import {
  buildBuildingGeometry,
  buildProjectileGeometry,
  buildResourceGeometry,
  buildUnitGeometry,
  createInstancedMaterial,
  setInstanceAlphaCapacity,
} from './models';
import { MinimapPainter, playerColor } from './minimap';
import type { MinimapRenderOptions } from './minimap';

/* ------------------------------------------------------------------ *
 * Tuning constants (SPEC camera block: pitch ~45-50, FOV ~41, dist 20..70)
 * ------------------------------------------------------------------ */

const CAMERA_FOV = 41;
const CAMERA_PITCH = (47.5 * Math.PI) / 180;
const MIN_DISTANCE = 20;
const MAX_DISTANCE = 70;
/** 135 degrees in 1/256 turns: the isometric-looking default yaw. */
const DEFAULT_ROTATION = 96;
const ROTATION_SMOOTH_MS = 90;
const ORDER_MARKER_MS = 900;
const MARKER_POOL = 16;
const FOG_UPLOAD_MS = 80;

/** Order marker colours per order kind. */
const ORDER_MARKER_COLORS: Record<string, number> = {
  move: 0x62ff9a,
  attack: 0xff4a3d,
  gather: 0xffd23d,
  build: 0x54a8ff,
};

/** Smallest / largest scale factor used when hiding entities under fog. */
const HIDDEN_SCALE = 0;

/* ------------------------------------------------------------------ *
 * Scratch objects (never allocate inside the frame loop)
 * ------------------------------------------------------------------ */

const _slotMatrix = new THREE.Matrix4();
const _slotPos = new THREE.Vector3();
const _slotScale = new THREE.Vector3();
const _slotQuat = new THREE.Quaternion();
const _slotColor = new THREE.Color();
const _white = new THREE.Color(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3(0, 0, 1);
const _aimDir = new THREE.Vector3();
const _project = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
/** NDC corners of the viewport, clockwise from the bottom-left. */
const VIEW_QUAD_CORNERS = [-1, -1, 1, -1, 1, 1, -1, 1];

/* ------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------ */

/**
 * RTS camera: yaw + fixed pitch, orbit distance, focus point in tiles.
 * Rotation is smoothed towards its target so `rotateBy` turns feel continuous
 * even though the caller always asks for 45 degree steps.
 */
class RtsCamera implements CameraController {
  readonly object: THREE.PerspectiveCamera;
  private focusX = 0;
  private focusY = 0;
  private rotationValue = DEFAULT_ROTATION;
  private targetRotation = DEFAULT_ROTATION;
  private distanceValue = 34;
  private viewportWidth = 1280;
  private viewportHeight = 720;
  private boundsWidth = 0;
  private boundsHeight = 0;

  constructor() {
    this.object = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.4, 900);
    this.apply();
  }

  panByScreen(dx: number, dy: number): void {
    if (this.viewportHeight <= 0) return;
    // Ground distance covered by one CSS pixel: the view height divided by the
    // vertical squash caused by the pitch. Scales linearly with zoom.
    const halfFov = (CAMERA_FOV * Math.PI) / 360;
    const perPixel =
      (2 * this.distanceValue * Math.tan(halfFov)) / (this.viewportHeight * Math.max(0.4, Math.sin(CAMERA_PITCH)));
    const ry = (this.rotationValue / 256) * Math.PI * 2;
    const rightX = Math.cos(ry);
    const rightZ = -Math.sin(ry);
    const forwardX = -Math.sin(ry);
    const forwardZ = -Math.cos(ry);
    this.focusX -= (rightX * dx + forwardX * dy) * perPixel;
    this.focusY -= (rightZ * dx + forwardZ * dy) * perPixel;
    this.clampFocus();
    this.apply();
  }

  centerOn(x: number, y: number): void {
    this.focusX = x / FP_ONE;
    this.focusY = y / FP_ONE;
    this.clampFocus();
    this.apply();
  }

  zoomBy(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.distanceValue = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, this.distanceValue / factor));
    this.apply();
  }

  rotateBy(steps: number): void {
    if (!Number.isFinite(steps)) return;
    this.targetRotation += steps;
  }

  setRotation(angle: number): void {
    if (!Number.isFinite(angle)) return;
    this.targetRotation = angle;
    this.rotationValue = angle;
    this.apply();
  }

  rotation(): number {
    return Math.round(((this.rotationValue % 256) + 256) % 256);
  }

  focus(): { x: number; y: number } {
    return { x: Math.round(this.focusX * FP_ONE), y: Math.round(this.focusY * FP_ONE) };
  }

  distance(): number {
    return this.distanceValue;
  }

  frameMap(widthTiles: number, heightTiles: number): void {
    this.boundsWidth = Math.max(1, widthTiles);
    this.boundsHeight = Math.max(1, heightTiles);
    this.focusX = this.boundsWidth / 2;
    this.focusY = this.boundsHeight / 2;
    const wanted = Math.max(this.boundsWidth, this.boundsHeight) * 0.32;
    this.distanceValue = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, wanted));
    this.apply();
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.object.aspect = this.viewportWidth / this.viewportHeight;
    this.object.updateProjectionMatrix();
    this.apply();
  }

  /** Advance the smooth rotation. Called once per animation frame. */
  update(deltaMs: number): void {
    let delta = this.targetRotation - this.rotationValue;
    if (Math.abs(delta) > 0.0005) {
      // Shortest way around the 256-step circle.
      delta = ((((delta + 128) % 256) + 256) % 256) - 128;
      const k = 1 - Math.exp(-Math.max(0, deltaMs) / ROTATION_SMOOTH_MS);
      this.rotationValue += delta * k;
      if (Math.abs(this.targetRotation - this.rotationValue) < 0.01) {
        this.rotationValue = this.targetRotation;
      }
      this.apply();
    }
  }

  private clampFocus(): void {
    if (this.boundsWidth <= 0 || this.boundsHeight <= 0) return;
    this.focusX = Math.min(this.boundsWidth, Math.max(0, this.focusX));
    this.focusY = Math.min(this.boundsHeight, Math.max(0, this.focusY));
  }

  private apply(): void {
    const ry = (this.rotationValue / 256) * Math.PI * 2;
    const cosPitch = Math.cos(CAMERA_PITCH);
    const sinPitch = Math.sin(CAMERA_PITCH);
    this.object.position.set(
      this.focusX + Math.sin(ry) * cosPitch * this.distanceValue,
      sinPitch * this.distanceValue,
      this.focusY + Math.cos(ry) * cosPitch * this.distanceValue,
    );
    this.object.lookAt(this.focusX, 0, this.focusY);
    this.object.updateMatrixWorld();
  }
}

/* ------------------------------------------------------------------ *
 * Instanced buckets
 * ------------------------------------------------------------------ */

/** One live entity as the renderer sees it (positions are already in tiles). */
interface RenderEntity {
  id: number;
  kind: number;
  def: string;
  owner: number;
  /** Position at the previous simulation tick, in tiles. */
  prevX: number;
  prevY: number;
  /** Position at the current simulation tick, in tiles. */
  curX: number;
  curY: number;
  /** Model yaw in radians (buildings derive it from their wall neighbours). */
  yaw: number;
  /** 0..1000 construction progress for buildings. */
  construction: number;
  /** True while the entity flies (arrow/boulder): aim along its velocity. */
  aim: boolean;
  /** True when fog of war hides this entity. */
  hidden: boolean;
  height: number;
  radius: number;
  bucket: InstanceBucket | null;
  /** Sync generation, used to retire entities that left the snapshot. */
  stamp: number;
}

function makeRenderEntity(id: number): RenderEntity {
  return {
    id,
    kind: EntityKind.None,
    def: '',
    owner: -1,
    prevX: 0,
    prevY: 0,
    curX: 0,
    curY: 0,
    yaw: 0,
    construction: 1000,
    aim: false,
    hidden: false,
    height: 1,
    radius: 0.5,
    bucket: null,
    stamp: 0,
  };
}

/**
 * An InstancedMesh plus the entity list feeding it. The mesh is only rebuilt
 * when the required capacity changes; per-frame writes reuse one matrix.
 */
class InstanceBucket {
  readonly items: RenderEntity[] = [];
  readonly height: number;
  readonly radius: number;
  mesh: THREE.InstancedMesh;
  count = 0;

  private capacity = 0;
  private alpha: THREE.InstancedBufferAttribute;

  constructor(
    private readonly parent: THREE.Object3D,
    readonly geometry: THREE.BufferGeometry,
    private readonly material: THREE.Material,
    initialCapacity: number,
    height: number,
    radius: number,
  ) {
    this.height = height;
    this.radius = radius;
    const created = this.createMesh(Math.max(16, initialCapacity));
    this.mesh = created.mesh;
    this.alpha = created.alpha;
  }

  /**
   * Resize the instance buffers when a definition's entity count no longer fits
   * (grow immediately, shrink only once the count drops to a third), so a type
   * is reallocated when its count really changes - never once per frame.
   */
  ensureCapacity(needed: number): void {
    if (needed <= this.capacity && !(this.capacity > 64 && needed * 3 < this.capacity)) return;
    const capacity = Math.max(16, Math.ceil(needed * 1.25));
    const created = this.createMesh(capacity);
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.mesh = created.mesh;
    this.alpha = created.alpha;
    this.parent.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  write(
    x: number,
    y: number,
    z: number,
    quaternion: THREE.Quaternion,
    scaleXZ: number,
    scaleY: number,
    colorHex: number,
    alpha: number,
  ): void {
    const index = this.count++;
    _slotPos.set(x, y, z);
    _slotScale.set(scaleXZ, scaleY, scaleXZ);
    _slotMatrix.compose(_slotPos, quaternion, _slotScale);
    this.mesh.setMatrixAt(index, _slotMatrix);
    _slotColor.setHex(colorHex, THREE.SRGBColorSpace);
    this.mesh.setColorAt(index, _slotColor);
    this.alpha.array[index] = alpha;
  }

  finish(): void {
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.alpha.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.geometry.dispose();
  }

  private createMesh(capacity: number): { mesh: THREE.InstancedMesh; alpha: THREE.InstancedBufferAttribute } {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.count = 0;
    mesh.visible = false;
    _slotMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, _slotMatrix);
      mesh.setColorAt(i, _white);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor.needsUpdate = true;
    }
    this.capacity = capacity;
    const alpha = setInstanceAlphaCapacity(this.geometry, capacity);
    return { mesh, alpha };
  }
}

/* ------------------------------------------------------------------ *
 * Order markers
 * ------------------------------------------------------------------ */

interface OrderMarker {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  start: number;
  active: boolean;
}

/* ------------------------------------------------------------------ *
 * Fog material
 * ------------------------------------------------------------------ */

function createFogMaterial(texture: THREE.DataTexture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      fogMap: { value: texture },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: [
      'varying vec2 vFogUv;',
      'void main() {',
      '  vFogUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D fogMap;',
      'varying vec2 vFogUv;',
      'void main() {',
      '  vec4 fog = texture2D( fogMap, vFogUv );',
      '  float alpha = mix( 1.0, 0.55, fog.g ) * ( 1.0 - fog.r );',
      '  if ( alpha < 0.01 ) discard;',
      '  gl_FragColor = vec4( 0.02, 0.024, 0.034, alpha );',
      '}',
    ].join('\n'),
  });
}

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */

class AegisRenderer implements Renderer {
  readonly camera: RtsCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly minimap = new MinimapPainter();

  private readonly terrainMaterial: THREE.MeshLambertMaterial;
  private readonly waterMaterial: THREE.MeshLambertMaterial;
  private readonly unitMaterial: THREE.MeshLambertMaterial;
  private readonly buildingMaterial: THREE.MeshLambertMaterial;
  private readonly noiseTexture: THREE.CanvasTexture;
  private readonly waterNoiseTexture: THREE.CanvasTexture;
  private readonly discTexture: THREE.CanvasTexture;

  private readonly unitBuckets = new Map<string, InstanceBucket>();
  private readonly buildingBuckets = new Map<string, InstanceBucket>();
  private readonly propBuckets = new Map<string, InstanceBucket>();
  private readonly projectileBuckets = new Map<string, InstanceBucket>();
  private readonly bucketMaps: Array<Map<string, InstanceBucket>> = [
    this.unitBuckets,
    this.buildingBuckets,
    this.propBuckets,
    this.projectileBuckets,
  ];
  private readonly entitiesById = new Map<number, RenderEntity>();
  private readonly entityPool: RenderEntity[] = [];
  private readonly frameEntities: RenderEntity[] = [];
  private readonly selectionSet = new Set<number>();
  private readonly teamByPlayer: number[] = [];

  private map: GameMap | null = null;
  private terrainMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private fogMesh: THREE.Mesh | null = null;
  private fogMaterial: THREE.ShaderMaterial | null = null;
  private fogTexture: THREE.DataTexture | null = null;
  private fogData: Uint8Array | null = null;
  private fogView: FogView | null = null;
  private fogRevealed = true;
  private lastFogUpload = -1e9;

  private readonly raycaster = new THREE.Raycaster();
  private readonly hitBuffer: THREE.Intersection[] = [];
  private readonly viewQuad = new Float32Array(8);
  /** Reused so a minimap refresh allocates nothing. */
  private readonly minimapOptions: MinimapRenderOptions = { localPlayer: 0, revealed: true, viewQuad: null };

  private readonly selectionGeometry: THREE.BufferGeometry;
  private readonly selectionMaterial: THREE.MeshBasicMaterial;
  private selectionMesh: THREE.InstancedMesh;
  private readonly hoverMesh: THREE.Mesh;
  private readonly hoverMaterial: THREE.MeshBasicMaterial;
  private readonly markerGeometry: THREE.BufferGeometry;
  private readonly markers: OrderMarker[] = [];
  private markerCursor = 0;

  private readonly overlayScene = new THREE.Scene();
  private readonly overlayCamera: THREE.OrthographicCamera;
  private readonly boxFill: THREE.Mesh;
  private readonly boxOutline: THREE.LineLoop;
  private boxActive = false;
  private boxX0 = 0;
  private boxY0 = 0;
  private boxX1 = 0;
  private boxY1 = 0;

  private cssWidth = 1;
  private cssHeight = 1;
  private alpha = 1;
  private lastTick = -1;
  private localPlayer = 0;
  private localTeam = 0;
  private hoveredId = 0;
  private syncStamp = 0;
  private fps = 0;
  private lastFrameTime = 0;
  private drawCalls = 0;
  private instanceCount = 0;
  private disposed = false;
  private readonly frameTimes: Float32Array;
  private frameIndex = 0;
  private frameFilled = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x0b0f16, 1);
    this.renderer.info.autoReset = false;

    this.scene.background = new THREE.Color(0x0b0f16);

    // Hemisphere light keeps every facet readable; the sun adds direction.
    const hemisphere = new THREE.HemisphereLight(0xcfe4ff, 0x50452f, 1.5);
    hemisphere.position.set(0, 80, 0);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
    sun.position.set(-60, 90, 45);
    sun.castShadow = false;
    this.scene.add(sun);
    this.scene.add(sun.target);

    this.camera = new RtsCamera();

    this.noiseTexture = createNoiseTexture({ size: 256, contrast: 0.24, brightness: 0.95, seed: 0xa17e });
    this.waterNoiseTexture = createNoiseTexture({ size: 128, contrast: 0.1, brightness: 0.98, seed: 0x5ea });
    this.discTexture = createDiscTexture({ size: 128, rim: 0.8, fill: 0.1 });

    this.terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, map: this.noiseTexture });
    this.terrainMaterial.name = 'aegis-terrain';
    this.waterMaterial = new THREE.MeshLambertMaterial({
      color: 0x2f6f9d,
      map: this.waterNoiseTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.waterMaterial.name = 'aegis-water';
    this.unitMaterial = createInstancedMaterial({ transparent: false });
    this.buildingMaterial = createInstancedMaterial({ transparent: true });

    // Selection disc: a unit-radius circle lying flat, scaled per entity.
    this.selectionGeometry = new THREE.CircleGeometry(1, 22);
    this.selectionGeometry.rotateX(-Math.PI / 2);
    this.selectionMaterial = new THREE.MeshBasicMaterial({
      map: this.discTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.selectionMesh = new THREE.InstancedMesh(this.selectionGeometry, this.selectionMaterial, 256);
    this.selectionMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.selectionMesh.frustumCulled = false;
    this.selectionMesh.count = 0;
    this.selectionMesh.visible = false;
    this.selectionMesh.renderOrder = 4;
    _slotMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < 256; i++) {
      this.selectionMesh.setMatrixAt(i, _slotMatrix);
      this.selectionMesh.setColorAt(i, _white);
    }
    this.scene.add(this.selectionMesh);

    this.hoverMaterial = new THREE.MeshBasicMaterial({
      map: this.discTexture,
      color: 0xfff0b8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hoverMesh = new THREE.Mesh(this.selectionGeometry, this.hoverMaterial);
    this.hoverMesh.visible = false;
    this.hoverMesh.renderOrder = 5;
    this.hoverMesh.frustumCulled = false;
    this.scene.add(this.hoverMesh);

    // Order markers.
    this.markerGeometry = new THREE.CircleGeometry(1, 24);
    this.markerGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < MARKER_POOL; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: this.discTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.markerGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 6;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.markers.push({ mesh, material, start: 0, active: false });
    }

    // Screen-space drag-selection overlay.
    this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.boxFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x9dffb0,
        transparent: true,
        opacity: 0.18,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.boxFill.position.z = -1;
    this.boxFill.frustumCulled = false;
    this.overlayScene.add(this.boxFill);
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
    ]);
    this.boxOutline = new THREE.LineLoop(
      outlineGeometry,
      new THREE.LineBasicMaterial({ color: 0xd8ffe6, transparent: true, opacity: 0.95, depthTest: false }),
    );
    this.boxOutline.position.z = -2;
    this.boxOutline.frustumCulled = false;
    this.overlayScene.add(this.boxOutline);

    this.frameTimes = new Float32Array(60);

    const width = Math.max(1, canvas.clientWidth || canvas.width || 1280);
    const height = Math.max(1, canvas.clientHeight || canvas.height || 720);
    this.resize(width, height);
  }

  /* ---------------------------------------------------------------- *
   * Map + fog
   * ---------------------------------------------------------------- */

  setMap(map: GameMap): void {
    this.disposeMapObjects();
    this.map = map;

    this.terrainMesh = buildTerrainMesh(map, this.terrainMaterial);
    this.scene.add(this.terrainMesh);

    this.waterNoiseTexture.repeat.set(Math.max(1, map.width / 12), Math.max(1, map.height / 12));
    this.waterMesh = buildWaterMesh(map, this.waterMaterial);
    this.scene.add(this.waterMesh);

    let maxElevation = 0;
    for (let i = 0; i < map.elevation.length; i++) {
      const value = map.elevation[i] as number;
      if (value > maxElevation) maxElevation = value;
    }

    this.fogTexture = createFogTexture(map.width, map.height);
    // The upload buffer IS the texture's pixel array: writing into it and
    // flagging `needsUpdate` is what pushes fog changes to the GPU.
    const fogData = this.fogTexture.image.data as Uint8Array;
    fogData.fill(255);
    this.fogData = fogData;
    this.fogMaterial = createFogMaterial(this.fogTexture);
    const fogGeometry = new THREE.PlaneGeometry(map.width, map.height);
    // +90 degrees about X maps the plane's V axis onto +Z, so texel (x, y)
    // lands on tile (x, y) with world x/z == tile x/y.
    fogGeometry.rotateX(Math.PI / 2);
    this.fogMesh = new THREE.Mesh(fogGeometry, this.fogMaterial);
    this.fogMesh.position.set(map.width / 2, maxElevation / ELEV_UNIT + 0.45, map.height / 2);
    this.fogMesh.renderOrder = 20;
    this.fogMesh.frustumCulled = false;
    this.scene.add(this.fogMesh);

    this.lastFogUpload = -1e9;
    this.minimap.setMap(map);
    this.camera.frameMap(map.width, map.height);
  }

  setFog(fog: FogView): void {
    this.fogView = fog;
    this.fogRevealed = allOnes(fog.visible) && allOnes(fog.explored);
    this.lastFogUpload = -1e9;
    this.minimap.setFog(fog, this.fogRevealed);
  }

  private uploadFog(now: number, force: boolean): void {
    const fog = this.fogView;
    const data = this.fogData;
    const texture = this.fogTexture;
    if (!fog || !data || !texture) return;
    if (!force && now - this.lastFogUpload < FOG_UPLOAD_MS) return;
    this.lastFogUpload = now;
    const tiles = Math.min(data.length >> 2, fog.visible.length, fog.explored.length);
    for (let i = 0; i < tiles; i++) {
      const o = i * 4;
      data[o] = fog.visible[i] ? 255 : 0;
      data[o + 1] = fog.explored[i] ? 255 : 0;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
    texture.needsUpdate = true;
    this.minimap.setFog(fog, this.fogRevealed);
  }

  /* ---------------------------------------------------------------- *
   * Snapshot sync
   * ---------------------------------------------------------------- */

  sync(snapshot: StateSnapshot, selection: number[], hovered: number): void {
    this.selectionSet.clear();
    for (let i = 0; i < selection.length; i++) {
      const id = selection[i] as number;
      if (id > 0) this.selectionSet.add(id);
    }
    this.hoveredId = hovered;

    this.updateLocalPlayer(snapshot);

    const sameTick = snapshot.tick === this.lastTick;
    this.lastTick = snapshot.tick;
    this.syncStamp++;

    for (const buckets of this.bucketMaps) {
      for (const bucket of buckets.values()) bucket.items.length = 0;
    }
    this.frameEntities.length = 0;

    const entities = snapshot.entities;
    for (let i = 0; i < entities.length; i++) {
      const snap = entities[i] as EntitySnapshot;
      const bucket = this.bucketFor(snap);
      if (!bucket) continue;

      let entity = this.entitiesById.get(snap.id);
      if (!entity) {
        entity = this.entityPool.pop() ?? makeRenderEntity(snap.id);
        entity.id = snap.id;
        entity.prevX = snap.x / FP_ONE;
        entity.prevY = snap.y / FP_ONE;
        this.entitiesById.set(snap.id, entity);
      } else if (!sameTick) {
        entity.prevX = entity.curX;
        entity.prevY = entity.curY;
      }
      entity.stamp = this.syncStamp;
      entity.kind = snap.kind;
      entity.def = snap.def;
      entity.owner = snap.owner;
      entity.curX = snap.x / FP_ONE;
      entity.curY = snap.y / FP_ONE;
      entity.construction = snap.construction;
      entity.aim = snap.kind === EntityKind.Projectile;
      entity.hidden = this.isHidden(snap);
      entity.bucket = bucket;
      entity.height = bucket.height;
      entity.radius = bucket.radius;
      entity.yaw = this.yawFor(snap);
      bucket.items.push(entity);
      this.frameEntities.push(entity);
    }

    // Retire entities that are gone from the snapshot.
    for (const [id, entity] of this.entitiesById) {
      if (entity.stamp === this.syncStamp) continue;
      this.entitiesById.delete(id);
      entity.bucket = null;
      this.entityPool.push(entity);
    }

    for (const buckets of this.bucketMaps) {
      for (const bucket of buckets.values()) bucket.ensureCapacity(bucket.items.length);
    }
    this.ensureSelectionCapacity(this.selectionSet.size);
  }

  private updateLocalPlayer(snapshot: StateSnapshot): void {
    let local = -1;
    let team = 0;
    for (let i = 0; i < snapshot.players.length; i++) {
      const player = snapshot.players[i];
      if (!player) continue;
      this.teamByPlayer[player.id] = player.team;
      if (local < 0 && player.bot < 0) {
        local = player.id;
        team = player.team;
      }
    }
    if (local < 0) {
      local = snapshot.players[0]?.id ?? 0;
      team = snapshot.players[0]?.team ?? 0;
    }
    this.localPlayer = local;
    this.localTeam = team;
  }

  /** True when fog of war must hide this entity from the local player. */
  private isHidden(snap: EntitySnapshot): boolean {
    const fog = this.fogView;
    const map = this.map;
    if (!fog || !map || this.fogRevealed) return false;
    if (snap.owner === this.localPlayer) return false;
    if (snap.owner >= 0 && this.teamByPlayer[snap.owner] === this.localTeam) return false;
    const tx = Math.max(0, Math.min(map.width - 1, snap.x >> 10));
    const ty = Math.max(0, Math.min(map.height - 1, snap.y >> 10));
    const tile = ty * map.width + tx;
    if (snap.owner < 0) return fog.explored[tile] !== 1;
    return fog.visible[tile] !== 1;
  }

  /** Model yaw: walls and gates follow their neighbours, everything else faces. */
  private yawFor(snap: EntitySnapshot): number {
    const map = this.map;
    if (snap.kind === EntityKind.Building && map) {
      const def = BUILDINGS[snap.def];
      if (def?.isWallSegment) {
        const tx = Math.max(0, Math.min(map.width - 1, snap.x >> 10));
        const ty = Math.max(0, Math.min(map.height - 1, snap.y >> 10));
        const at = (x: number, y: number): boolean => map.buildingAt[y * map.width + x] !== 0;
        const horizontal =
          (tx > 0 ? (at(tx - 1, ty) ? 1 : 0) : 0) + (tx < map.width - 1 ? (at(tx + 1, ty) ? 1 : 0) : 0);
        const vertical =
          (ty > 0 ? (at(tx, ty - 1) ? 1 : 0) : 0) + (ty < map.height - 1 ? (at(tx, ty + 1) ? 1 : 0) : 0);
        // The wall model runs along X; a vertical run needs a quarter turn.
        return vertical > horizontal ? Math.PI / 2 : 0;
      }
    }
    return finiteYaw(snap.facing);
  }

  private groundHeight(worldX: number, worldZ: number): number {
    return this.map ? terrainHeightAtWorld(this.map, worldX, worldZ) : 0;
  }

  /** The InstancedMesh bucket for an entity, built on first use per definition. */
  private bucketFor(snap: EntitySnapshot): InstanceBucket | null {
    switch (snap.kind) {
      case EntityKind.Unit: {
        const existing = this.unitBuckets.get(snap.def);
        if (existing) return existing;
        return this.createBucket(this.unitBuckets, snap.def, buildUnitGeometry(snap.def), this.unitMaterial, 24);
      }
      case EntityKind.Building: {
        const existing = this.buildingBuckets.get(snap.def);
        if (existing) return existing;
        const def = BUILDINGS[snap.def];
        if (!def) return null;
        return this.createBucket(this.buildingBuckets, snap.def, buildBuildingGeometry(def), this.buildingMaterial, 4);
      }
      case EntityKind.ResourceNode:
      case EntityKind.Relic:
      case EntityKind.SacredSite: {
        const existing = this.propBuckets.get(snap.def);
        if (existing) return existing;
        return this.createBucket(this.propBuckets, snap.def, buildResourceGeometry(snap.def), this.unitMaterial, 48);
      }
      case EntityKind.Projectile: {
        const existing = this.projectileBuckets.get(snap.def);
        if (existing) return existing;
        return this.createBucket(this.projectileBuckets, snap.def, buildProjectileGeometry(snap.def), this.unitMaterial, 24);
      }
      default:
        return null;
    }
  }

  private createBucket(
    target: Map<string, InstanceBucket>,
    def: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    initialCapacity: number,
  ): InstanceBucket {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const height = box ? Math.max(0.2, box.max.y) : 1;
    const width = box ? box.max.x - box.min.x : 1;
    const depth = box ? box.max.z - box.min.z : 1;
    const radius = Math.max(0.32, Math.max(width, depth) / 2 + 0.12);
    const bucket = new InstanceBucket(this.scene, geometry, material, initialCapacity, height, radius);
    this.scene.add(bucket.mesh);
    target.set(def, bucket);
    return bucket;
  }

  /* ---------------------------------------------------------------- *
   * Frame
   * ---------------------------------------------------------------- */

  setInterpolation(alpha: number): void {
    this.alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  }

  draw(): void {
    if (this.disposed) return;
    const now = performance.now();
    const delta = this.lastFrameTime > 0 ? now - this.lastFrameTime : 16.7;
    this.lastFrameTime = now;
    this.pushFrameTime(delta);

    this.camera.update(delta);
    this.uploadFog(now, false);
    this.writeInstances();
    this.updateSelection();
    this.updateHover();
    this.updateMarkers(now);
    if (this.boxActive) this.updateBox();

    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera.object);
    if (this.boxActive) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.overlayScene, this.overlayCamera);
      this.renderer.autoClear = true;
    }
    this.drawCalls = this.renderer.info.render.calls;
  }

  private writeInstances(): void {
    this.instanceCount = 0;
    for (const buckets of this.bucketMaps) {
      for (const bucket of buckets.values()) bucket.begin();
    }
    for (const buckets of this.bucketMaps) {
      for (const bucket of buckets.values()) this.writeBucket(bucket);
    }
  }

  /** Write one bucket's instances for this frame (interpolated positions). */
  private writeBucket(bucket: InstanceBucket): void {
    const alpha = this.alpha;
    {
      const items = bucket.items;
      for (let i = 0; i < items.length; i++) {
        const entity = items[i] as RenderEntity;
        const x = entity.prevX + (entity.curX - entity.prevX) * alpha;
        const z = entity.prevY + (entity.curY - entity.prevY) * alpha;
        let y = this.groundHeight(x, z);
        let scaleXZ = 1;
        let scaleY = 1;
        let tint = 0xffffff;
        let instanceAlpha = 1;

        if (entity.hidden) {
          scaleXZ = HIDDEN_SCALE;
          scaleY = HIDDEN_SCALE;
        } else if (entity.kind === EntityKind.Unit) {
          tint = playerColor(entity.owner);
        } else if (entity.kind === EntityKind.Building) {
          tint = playerColor(entity.owner);
          const progress = Math.max(0, Math.min(1, entity.construction / 1000));
          if (progress < 1) {
            // Under construction: shorter, semi-transparent, sunk slightly.
            scaleY = 0.3 + 0.7 * progress;
            instanceAlpha = 0.4 + 0.6 * progress;
            y -= 0.03;
          }
        } else if (entity.aim) {
          // Projectiles read best slightly above the ground, aimed down-range.
          y += 0.6;
          const dx = entity.curX - entity.prevX;
          const dz = entity.curY - entity.prevY;
          const length = Math.hypot(dx, dz);
          if (length > 0.0001) {
            _aimDir.set(dx / length, 0.3, dz / length).normalize();
            _slotQuat.setFromUnitVectors(_forward, _aimDir);
          } else {
            _slotQuat.setFromAxisAngle(_up, entity.yaw);
          }
          bucket.write(x, y, z, _slotQuat, 1, 1, tint, instanceAlpha);
          continue;
        }

        _slotQuat.setFromAxisAngle(_up, entity.yaw);
        bucket.write(x, y, z, _slotQuat, scaleXZ, scaleY, tint, instanceAlpha);
      }
      bucket.finish();
      this.instanceCount += bucket.mesh.count;
    }
  }

  private updateSelection(): void {
    const alpha = this.alpha;
    let count = 0;
    if (this.selectionSet.size > 0) {
      for (let i = 0; i < this.frameEntities.length; i++) {
        const entity = this.frameEntities[i] as RenderEntity;
        if (entity.hidden || !this.selectionSet.has(entity.id)) continue;
        if (count >= this.selectionMesh.instanceMatrix.count) break;
        const x = entity.prevX + (entity.curX - entity.prevX) * alpha;
        const z = entity.prevY + (entity.curY - entity.prevY) * alpha;
        _slotQuat.setFromAxisAngle(_up, 0);
        _slotPos.set(x, this.groundHeight(x, z) + 0.04, z);
        _slotScale.set(entity.radius, 1, entity.radius);
        _slotMatrix.compose(_slotPos, _slotQuat, _slotScale);
        this.selectionMesh.setMatrixAt(count, _slotMatrix);
        _slotColor.setHex(playerColor(entity.owner), THREE.SRGBColorSpace).lerp(_white, 0.3);
        this.selectionMesh.setColorAt(count, _slotColor);
        count++;
      }
    }
    this.selectionMesh.count = count;
    this.selectionMesh.visible = count > 0;
    if (count > 0) {
      this.selectionMesh.instanceMatrix.needsUpdate = true;
      if (this.selectionMesh.instanceColor) this.selectionMesh.instanceColor.needsUpdate = true;
    }
    this.instanceCount += count;
  }

  private updateHover(): void {
    const id = this.hoveredId;
    if (id <= 0 || this.selectionSet.has(id)) {
      this.hoverMesh.visible = false;
      return;
    }
    let found: RenderEntity | null = null;
    for (let i = 0; i < this.frameEntities.length; i++) {
      const entity = this.frameEntities[i] as RenderEntity;
      if (entity.id === id) {
        found = entity;
        break;
      }
    }
    if (!found || found.hidden) {
      this.hoverMesh.visible = false;
      return;
    }
    const x = found.prevX + (found.curX - found.prevX) * this.alpha;
    const z = found.prevY + (found.curY - found.prevY) * this.alpha;
    const radius = found.radius * 1.18;
    this.hoverMesh.position.set(x, this.groundHeight(x, z) + 0.05, z);
    this.hoverMesh.scale.set(radius, 1, radius);
    this.hoverMesh.visible = true;
    this.instanceCount++;
  }

  private updateMarkers(now: number): void {
    for (let i = 0; i < this.markers.length; i++) {
      const marker = this.markers[i] as OrderMarker;
      if (!marker.active) continue;
      const t = (now - marker.start) / ORDER_MARKER_MS;
      if (t >= 1) {
        marker.active = false;
        marker.mesh.visible = false;
        continue;
      }
      const scale = 0.7 + 1.9 * t;
      marker.mesh.scale.set(scale, 1, scale);
      marker.material.opacity = (1 - t) * (1 - t) * 0.95;
    }
  }

  private updateBox(): void {
    const x0 = Math.min(this.boxX0, this.boxX1);
    const x1 = Math.max(this.boxX0, this.boxX1);
    const y0 = Math.min(this.boxY0, this.boxY1);
    const y1 = Math.max(this.boxY0, this.boxY1);
    const cx = ((x0 + x1) / 2 / this.cssWidth) * 2 - 1;
    const cy = -(((y0 + y1) / 2 / this.cssHeight) * 2 - 1);
    const sx = Math.max(0.0001, ((x1 - x0) / this.cssWidth) * 2);
    const sy = Math.max(0.0001, ((y1 - y0) / this.cssHeight) * 2);
    this.boxFill.position.set(cx, cy, -1);
    this.boxFill.scale.set(sx, sy, 1);
    this.boxOutline.position.set(cx, cy, -2);
    this.boxOutline.scale.set(sx, sy, 1);
  }

  setSelectionBox(rect: ScreenRect | null): void {
    if (!rect) {
      this.boxActive = false;
      return;
    }
    this.boxActive = true;
    this.boxX0 = rect.x0;
    this.boxY0 = rect.y0;
    this.boxX1 = rect.x1;
    this.boxY1 = rect.y1;
  }

  showOrderMarker(x: number, y: number, kind: 'move' | 'attack' | 'gather' | 'build'): void {
    if (this.markers.length === 0) return;
    const marker = this.markers[this.markerCursor % this.markers.length] as OrderMarker;
    this.markerCursor++;
    const worldX = x / FP_ONE;
    const worldZ = y / FP_ONE;
    marker.mesh.position.set(worldX, this.groundHeight(worldX, worldZ) + 0.07, worldZ);
    marker.material.color.setHex(ORDER_MARKER_COLORS[kind] ?? 0xffffff, THREE.SRGBColorSpace);
    marker.material.opacity = 0.95;
    marker.mesh.scale.set(0.7, 1, 0.7);
    marker.mesh.visible = true;
    marker.start = performance.now();
    marker.active = true;
  }

  /* ---------------------------------------------------------------- *
   * Picking
   * ---------------------------------------------------------------- */

  screenToWorld(cssX: number, cssY: number): { x: number; y: number } {
    const map = this.map;
    if (!map) return { x: 0, y: 0 };
    const point = this.raycastGround(cssX, cssY);
    if (!point) return { x: 0, y: 0 };
    const maxX = (map.width << 10) - 1;
    const maxY = (map.height << 10) - 1;
    return {
      x: Math.max(0, Math.min(maxX, Math.round(point.x * FP_ONE))),
      y: Math.max(0, Math.min(maxY, Math.round(point.z * FP_ONE))),
    };
  }

  /**
   * Ray against the terrain. A fast heightfield march brackets the hit, then
   * the real mesh is raycast with its draw range narrowed to a few tile rows,
   * which keeps picking exact without testing 40k triangles.
   */
  private raycastGround(cssX: number, cssY: number): THREE.Vector3 | null {
    const map = this.map;
    const terrain = this.terrainMesh;
    if (!map || !terrain) return null;

    _ndc.set((cssX / this.cssWidth) * 2 - 1, -((cssY / this.cssHeight) * 2 - 1));
    this.raycaster.setFromCamera(_ndc, this.camera.object);
    const ray = this.raycaster.ray;
    const origin = ray.origin;
    const direction = ray.direction;

    const step = 0.75;
    const maxDistance = 600;
    let hitT = -1;
    if (origin.y - terrainHeightAtWorld(map, origin.x, origin.z) <= 0) {
      hitT = 0;
    } else {
      let previous = 0;
      for (let t = step; t <= maxDistance; t += step) {
        const px = origin.x + direction.x * t;
        const py = origin.y + direction.y * t;
        const pz = origin.z + direction.z * t;
        if (py - terrainHeightAtWorld(map, px, pz) <= 0) {
          let low = previous;
          let high = t;
          for (let i = 0; i < 14; i++) {
            const mid = (low + high) * 0.5;
            const mx = origin.x + direction.x * mid;
            const my = origin.y + direction.y * mid;
            const mz = origin.z + direction.z * mid;
            if (my - terrainHeightAtWorld(map, mx, mz) <= 0) high = mid;
            else low = mid;
          }
          hitT = high;
          break;
        }
        previous = t;
      }
    }
    if (hitT < 0) return null;

    const hitX = origin.x + direction.x * hitT;
    const hitY = origin.y + direction.y * hitT;
    const hitZ = origin.z + direction.z * hitT;
    const tileY = Math.max(0, Math.min(map.height - 1, Math.floor(hitZ)));

    setTerrainRowWindow(terrain.geometry, map, tileY - 2, tileY + 2);
    this.hitBuffer.length = 0;
    this.raycaster.intersectObject(terrain, false, this.hitBuffer);
    resetTerrainDrawRange(terrain.geometry, map);
    const first = this.hitBuffer[0];
    if (first) return _hitPoint.copy(first.point);
    return _hitPoint.set(hitX, hitY, hitZ);
  }

  pickEntity(cssX: number, cssY: number, snapshot: StateSnapshot): number {
    if (!this.map) return 0;
    let bestId = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < snapshot.entities.length; i++) {
      const snap = snapshot.entities[i] as EntitySnapshot;
      if (snap.kind === EntityKind.Projectile) continue;
      const record = this.entitiesById.get(snap.id);
      if (record?.hidden) continue;
      if (!record && this.isHidden(snap)) continue;
      const height = record ? record.height : defaultHeight(snap.kind);
      if (!this.projectEntity(snap, height, _project)) continue;
      const dx = _project.x - cssX;
      const dy = _project.y - cssY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > pickRadius(snap.kind)) continue;
      const tier =
        snap.kind === EntityKind.Unit ? 0 : snap.kind === EntityKind.Building ? 1 : snap.kind === EntityKind.ResourceNode ? 2 : 3;
      const ownerPenalty = snap.owner === this.localPlayer ? 0 : 1;
      const score = tier * 1000 + ownerPenalty * 100 + distance;
      if (score < bestScore) {
        bestScore = score;
        bestId = snap.id;
      }
    }
    return bestId;
  }

  pickRect(rect: ScreenRect, snapshot: StateSnapshot): number[] {
    const out: number[] = [];
    if (!this.map) return out;
    const x0 = Math.min(rect.x0, rect.x1);
    const x1 = Math.max(rect.x0, rect.x1);
    const y0 = Math.min(rect.y0, rect.y1);
    const y1 = Math.max(rect.y0, rect.y1);
    for (let i = 0; i < snapshot.entities.length; i++) {
      const snap = snapshot.entities[i] as EntitySnapshot;
      if (snap.kind === EntityKind.Projectile) continue;
      const record = this.entitiesById.get(snap.id);
      if (record?.hidden) continue;
      if (!record && this.isHidden(snap)) continue;
      const height = record ? record.height : defaultHeight(snap.kind);
      if (!this.projectEntity(snap, height, _project)) continue;
      if (_project.x < x0 || _project.x > x1 || _project.y < y0 || _project.y > y1) continue;
      out.push(snap.id);
    }
    return out;
  }

  /** Project an entity's centre onto the canvas; false when behind the camera. */
  private projectEntity(snap: EntitySnapshot, height: number, out: THREE.Vector3): boolean {
    const record = this.entitiesById.get(snap.id);
    let worldX: number;
    let worldZ: number;
    if (record) {
      worldX = record.prevX + (record.curX - record.prevX) * this.alpha;
      worldZ = record.prevY + (record.curY - record.prevY) * this.alpha;
    } else {
      worldX = snap.x / FP_ONE;
      worldZ = snap.y / FP_ONE;
    }
    out.set(worldX, this.groundHeight(worldX, worldZ) + height * 0.55, worldZ);
    out.project(this.camera.object);
    if (out.z < -1 || out.z > 1) return false;
    out.x = (out.x * 0.5 + 0.5) * this.cssWidth;
    out.y = (-out.y * 0.5 + 0.5) * this.cssHeight;
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Minimap, stats, lifecycle
   * ---------------------------------------------------------------- */

  renderMinimap(canvas: HTMLCanvasElement, snapshot: StateSnapshot, fog: FogView): void {
    this.minimap.setFog(fog, this.fogRevealed);
    const options = this.minimapOptions;
    options.localPlayer = this.localPlayer;
    options.revealed = this.fogRevealed;
    options.viewQuad = this.computeViewQuad();
    this.minimap.render(canvas, snapshot, fog, options);
  }

  /** Camera footprint on the ground plane, in tile coordinates (4 corners). */
  private computeViewQuad(): Float32Array {
    const quad = this.viewQuad;
    for (let i = 0; i < 4; i++) {
      _ndc.set(VIEW_QUAD_CORNERS[i * 2] as number, VIEW_QUAD_CORNERS[i * 2 + 1] as number);
      this.raycaster.setFromCamera(_ndc, this.camera.object);
      const point = this.raycaster.ray.intersectPlane(_plane, _hitPoint);
      if (point) {
        quad[i * 2] = point.x;
        quad[i * 2 + 1] = point.z;
      } else {
        quad[i * 2] = this.camera.focus().x / FP_ONE;
        quad[i * 2 + 1] = this.camera.focus().y / FP_ONE;
      }
    }
    return quad;
  }

  stats(): { drawCalls: number; instances: number; fps: number } {
    return { drawCalls: this.drawCalls, instances: this.instanceCount, fps: this.fps };
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.cssWidth = w;
    this.cssHeight = h;
    const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, true);
    this.camera.setViewport(w, h);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const buckets of this.bucketMaps) {
      for (const bucket of buckets.values()) bucket.dispose();
      buckets.clear();
    }
    this.entitiesById.clear();
    this.entityPool.length = 0;
    this.frameEntities.length = 0;

    this.disposeMapObjects();

    this.selectionGeometry.dispose();
    this.selectionMaterial.dispose();
    this.hoverMaterial.dispose();
    this.markerGeometry.dispose();
    for (const marker of this.markers) marker.material.dispose();

    this.boxFill.geometry.dispose();
    (this.boxFill.material as THREE.Material).dispose();
    this.boxOutline.geometry.dispose();
    (this.boxOutline.material as THREE.Material).dispose();

    this.terrainMaterial.dispose();
    this.waterMaterial.dispose();
    this.unitMaterial.dispose();
    this.buildingMaterial.dispose();
    this.noiseTexture.dispose();
    this.waterNoiseTexture.dispose();
    this.discTexture.dispose();
    this.minimap.dispose();
    this.renderer.dispose();
  }

  private disposeMapObjects(): void {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      this.scene.remove(this.terrainMesh);
      this.terrainMesh = null;
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      this.scene.remove(this.waterMesh);
      this.waterMesh = null;
    }
    if (this.fogMesh) {
      this.fogMesh.geometry.dispose();
      this.scene.remove(this.fogMesh);
      this.fogMesh = null;
    }
    if (this.fogMaterial) {
      this.fogMaterial.dispose();
      this.fogMaterial = null;
    }
    if (this.fogTexture) {
      this.fogTexture.dispose();
      this.fogTexture = null;
    }
    this.fogData = null;
    this.map = null;
  }

  private ensureSelectionCapacity(needed: number): void {
    const capacity = this.selectionMesh.instanceMatrix.count;
    if (needed <= capacity) return;
    const grown = Math.max(256, Math.ceil(needed * 1.5));
    this.selectionMesh.dispose();
    this.selectionMesh.removeFromParent();
    const mesh = new THREE.InstancedMesh(this.selectionGeometry, this.selectionMaterial, grown);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.renderOrder = 4;
    _slotMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < grown; i++) {
      mesh.setMatrixAt(i, _slotMatrix);
      mesh.setColorAt(i, _white);
    }
    this.scene.add(mesh);
    this.selectionMesh = mesh;
  }

  private pushFrameTime(delta: number): void {
    this.frameTimes[this.frameIndex] = delta;
    this.frameIndex = (this.frameIndex + 1) % this.frameTimes.length;
    if (this.frameFilled < this.frameTimes.length) this.frameFilled++;
    let sum = 0;
    for (let i = 0; i < this.frameFilled; i++) sum += this.frameTimes[i] as number;
    const average = sum / this.frameFilled;
    this.fps = average > 0 ? 1000 / average : 0;
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function allOnes(values: Uint8Array): boolean {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== 1) return false;
  }
  return true;
}

function finiteYaw(facing: number): number {
  const turns = (Number.isFinite(facing) ? facing : 0) / 256;
  // The sim measures facing from +X towards +Y; models are built facing +Z.
  return Math.PI / 2 - turns * Math.PI * 2;
}

function defaultHeight(kind: number): number {
  return kind === EntityKind.Unit ? 1.1 : kind === EntityKind.Building ? 1.6 : 0.8;
}

function pickRadius(kind: number): number {
  return kind === EntityKind.Unit ? 22 : kind === EntityKind.Building ? 36 : 20;
}

/**
 * Create the WebGL2 renderer for one canvas.
 *
 * three.js 0.180 is WebGL2 only, so the context is always WebGL2 with
 * antialiasing and sRGB output; shadow maps stay disabled for performance.
 */
export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  return new AegisRenderer(canvas);
}
