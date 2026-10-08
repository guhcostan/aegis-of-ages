/**
 * Procedural low-poly geometry factories.
 *
 * Everything here is generated from primitives at runtime (boxes, cones,
 * cylinders, icosahedra): no meshes, textures or silhouettes are copied from
 * any existing game. Models are baked into a single merged BufferGeometry per
 * entity definition so the renderer can draw a whole army with one
 * InstancedMesh and one draw call.
 *
 * Conventions
 * -----------
 *  - One world unit == one map tile. Y is up, models stand on y = 0 and face +Z.
 *  - Buildings are built in their real footprint and centred on the origin.
 *  - A vertex tagged "team" uses a white base colour, so the per-instance owner
 *    colour shows through; every other vertex keeps its baked colour.
 *  - `instanceAlpha` lets construction sites fade out per instance.
 */
import * as THREE from 'three';
import { BuildingKind } from '../sim/types';
import type { BuildingDef } from '../sim/types';

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

const SKIN = 0xd8a878;
const HAIR = 0x4b3323;
const LEATHER = 0x7a5530;
const DARK_LEATHER = 0x4c3520;
const WOOD = 0x8b6236;
const DARK_WOOD = 0x5a3f22;
const METAL = 0xc3cad3;
const DARK_METAL = 0x78808a;
const STONE = 0x9d9a92;
const DARK_STONE = 0x6f6d67;
const THATCH = 0xb99a5b;
const ROOF_TILE = 0x8d5b46;
const SLATE = 0x54617a;
const SACK = 0xc9b487;
const FOLIAGE = 0x3f6b32;
const FOLIAGE_DARK = 0x2f5227;
const BARK = 0x5b4228;
const GOLD = 0xd8b13c;
const HORSE_BROWN = 0x71503a;
const HORSE_DARK = 0x46352a;
const HORSE_LIGHT = 0x9a7a58;

/** White base colour: the per-instance owner colour is mixed in over these. */
const TEAM = 0xffffff;

/** Attribute read by the patched shader to mix the owner colour per vertex. */
export const TEAM_TINT_ATTRIBUTE = 'teamTint';
/** Per-instance opacity attribute (construction sites fade in). */
export const INSTANCE_ALPHA_ATTRIBUTE = 'instanceAlpha';

export interface InstanceMaterialOptions {
  /** Render in the transparent pass so per-instance alpha is honoured. */
  transparent?: boolean;
}

/* ------------------------------------------------------------------ *
 * Geometry builder
 * ------------------------------------------------------------------ */

interface PartTransform {
  x?: number;
  y?: number;
  z?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

const _matrix = new THREE.Matrix4();
const _normalMatrix = new THREE.Matrix3();
const _vec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scaleVec = new THREE.Vector3();
const _color = new THREE.Color();

function partMatrix(t: PartTransform | undefined): THREE.Matrix4 {
  _euler.set(t?.rx ?? 0, t?.ry ?? 0, t?.rz ?? 0);
  _quat.setFromEuler(_euler);
  _vec.set(t?.x ?? 0, t?.y ?? 0, t?.z ?? 0);
  _scaleVec.set(t?.sx ?? 1, t?.sy ?? 1, t?.sz ?? 1);
  return _matrix.compose(_vec, _quat, _scaleVec);
}

/** Merges transformed primitives into one indexed geometry. */
class ModelBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly colors: number[] = [];
  private readonly team: number[] = [];
  private readonly indices: number[] = [];

  add(geometry: THREE.BufferGeometry, color: number, teamPart = false, transform?: PartTransform): void {
    const matrix = partMatrix(transform);
    _normalMatrix.getNormalMatrix(matrix);
    _color.setHex(color, THREE.SRGBColorSpace);

    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const base = this.positions.length / 3;

    for (let i = 0; i < position.count; i++) {
      _vec.fromBufferAttribute(position, i).applyMatrix4(matrix);
      this.positions.push(_vec.x, _vec.y, _vec.z);
      if (normal) {
        _vec.fromBufferAttribute(normal, i).applyMatrix3(_normalMatrix).normalize();
      } else {
        _vec.set(0, 1, 0);
      }
      this.normals.push(_vec.x, _vec.y, _vec.z);
      this.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      this.colors.push(_color.r, _color.g, _color.b);
      this.team.push(teamPart ? 1 : 0);
    }

    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) this.indices.push(base + index.getX(i));
    } else {
      for (let i = 0; i < position.count; i++) this.indices.push(base + i);
    }
    geometry.dispose();
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute(TEAM_TINT_ATTRIBUTE, new THREE.Float32BufferAttribute(this.team, 1));
    geometry.setIndex(this.indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/* ------------------------------------------------------------------ *
 * Primitive helpers
 * ------------------------------------------------------------------ */

function addBox(
  b: ModelBuilder,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
  team = false,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  b.add(new THREE.BoxGeometry(w, h, d), color, team, { x, y, z, rx, ry, rz });
}

function addCylinder(
  b: ModelBuilder,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  x: number,
  y: number,
  z: number,
  color: number,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  b.add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), color, false, { x, y, z, rx, ry, rz });
}

function addCone(
  b: ModelBuilder,
  radius: number,
  height: number,
  segments: number,
  x: number,
  y: number,
  z: number,
  color: number,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  b.add(new THREE.ConeGeometry(radius, height, segments), color, false, { x, y, z, rx, ry, rz });
}

function addRock(
  b: ModelBuilder,
  radius: number,
  x: number,
  y: number,
  z: number,
  color: number,
  sx = 1,
  sy = 1,
  sz = 1,
  ry = 0,
): void {
  b.add(new THREE.IcosahedronGeometry(radius, 0), color, false, { x, y, z, sx, sy, sz, ry });
}

function addSphere(
  b: ModelBuilder,
  radius: number,
  x: number,
  y: number,
  z: number,
  color: number,
  sx = 1,
  sy = 1,
  sz = 1,
): void {
  b.add(new THREE.SphereGeometry(radius, 8, 6), color, false, { x, y, z, sx, sy, sz });
}

/**
 * Pole weapon: a shaft through (x, y, z) tilted `tilt` radians inside the XY
 * plane, with a tapering tip at the far end.
 */
function addPole(
  b: ModelBuilder,
  x: number,
  y: number,
  z: number,
  length: number,
  tilt: number,
  shaftColor: number,
  tipColor: number,
  tipLength: number,
  pitch = 0,
): void {
  addCylinder(b, 0.028, 0.028, length, 5, x, y, z, shaftColor, pitch, 0, tilt);
  // +Y rotated first by `tilt` about Z, then by `pitch` about X.
  const dx = -Math.sin(tilt);
  const dy = Math.cos(tilt) * Math.cos(pitch);
  const dz = Math.cos(tilt) * Math.sin(pitch);
  const half = length / 2 + tipLength / 2;
  addCone(b, 0.055, tipLength, 5, x + dx * half, y + dy * half, z + dz * half, tipColor, pitch, 0, tilt);
}

function addBow(b: ModelBuilder, x: number, y: number, z: number, scale: number): void {
  const s = scale;
  addBox(b, 0.05 * s, 0.36 * s, 0.06 * s, x, y + 0.24 * s, z + 0.05 * s, WOOD, false, 0.28, 0, 0);
  addBox(b, 0.05 * s, 0.36 * s, 0.06 * s, x, y - 0.24 * s, z + 0.05 * s, WOOD, false, -0.28, 0, 0);
  addBox(b, 0.055 * s, 0.14 * s, 0.06 * s, x, y, z + 0.13 * s, DARK_WOOD);
  addBox(b, 0.02 * s, 0.86 * s, 0.02 * s, x, y, z - 0.02 * s, 0xe8e2d0);
}

function addCrossbow(b: ModelBuilder, x: number, y: number, z: number, scale: number): void {
  const s = scale;
  addBox(b, 0.07 * s, 0.07 * s, 0.72 * s, x, y, z + 0.22 * s, DARK_WOOD);
  addBox(b, 0.5 * s, 0.06 * s, 0.06 * s, x, y, z + 0.42 * s, WOOD, false, 0, 0, 0.1);
  addBox(b, 0.02 * s, 0.02 * s, 0.5 * s, x, y + 0.02 * s, z + 0.16 * s, 0xd9d2bd);
}

function addShield(b: ModelBuilder, x: number, y: number, z: number, color: number, team: boolean, ry = 0): void {
  addBox(b, 0.06, 0.44, 0.34, x, y, z, color, team, 0, ry, 0);
}

function addSword(b: ModelBuilder, x: number, y: number, z: number, blade: number, tilt: number): void {
  addBox(b, 0.05, 0.14, 0.05, x, y - 0.12, z, DARK_LEATHER);
  addBox(b, 0.18, 0.05, 0.05, x, y - 0.03, z, DARK_METAL);
  addBox(b, 0.05, blade, 0.02, x, y - 0.03 + blade / 2, z, METAL, false, 0, 0, tilt);
}

function addBanner(b: ModelBuilder, x: number, y: number, z: number, height: number): void {
  addCylinder(b, 0.03, 0.03, height, 5, x, y + height / 2, z, DARK_WOOD);
  addBox(b, 0.36, 0.26, 0.03, x + 0.2, y + height - 0.18, z, TEAM, true);
  addBox(b, 0.1, 0.1, 0.04, x + 0.02, y + height + 0.04, z, METAL);
}

/** Merlons around a rectangular parapet of size w x d at height y. */
function addCrenellations(
  b: ModelBuilder,
  w: number,
  d: number,
  y: number,
  color: number,
  size = 0.18,
  step = 0.5,
): void {
  const nx = Math.max(2, Math.round(w / step));
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 0; i < nx; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / nx;
    addBox(b, (w / nx) * 0.7, size, 0.14, x, y + size / 2, -d / 2 + 0.07, color);
    addBox(b, (w / nx) * 0.7, size, 0.14, x, y + size / 2, d / 2 - 0.07, color);
  }
  for (let j = 0; j < nz; j++) {
    const z = -d / 2 + (d * (j + 0.5)) / nz;
    addBox(b, 0.14, size, (d / nz) * 0.7, -w / 2 + 0.07, y + size / 2, z, color);
    addBox(b, 0.14, size, (d / nz) * 0.7, w / 2 - 0.07, y + size / 2, z, color);
  }
}

/** Gable roof: two slabs leaning against a ridge running along X. */
function addGableRoof(
  b: ModelBuilder,
  w: number,
  d: number,
  baseY: number,
  rise: number,
  color: number,
  overhang = 0.16,
): void {
  const halfD = d / 2;
  const slope = Math.atan2(rise, halfD);
  const slabLen = Math.hypot(rise, halfD) + overhang * 0.5;
  const thickness = 0.1;
  const cx = w / 2 + overhang * 0.5;
  addBox(b, cx * 2, thickness, slabLen, 0, baseY + rise / 2, halfD / 2, color, false, slope, 0, 0);
  addBox(b, cx * 2, thickness, slabLen, 0, baseY + rise / 2, -halfD / 2, color, false, -slope, 0, 0);
  addBox(b, w + overhang, 0.12, 0.16, 0, baseY + rise + 0.02, 0, DARK_WOOD);
}

/** Four-sided pyramid roof over a square footprint. */
function addPyramidRoof(b: ModelBuilder, w: number, d: number, baseY: number, height: number, color: number): void {
  const radius = Math.hypot(w, d) / 2;
  addCone(b, radius, height, 4, 0, baseY + height / 2, 0, color, 0, Math.PI / 4, 0);
}

/* ------------------------------------------------------------------ *
 * Humanoids and animals
 * ------------------------------------------------------------------ */

type HelmKind = 'hair' | 'cap' | 'great' | 'hood' | 'mitre' | 'none';

interface HumanoidOptions {
  torso: number;
  scale?: number;
  bulk?: number;
  helm?: HelmKind;
  legColor?: number;
  armColor?: number;
  torsoTeam?: boolean;
}

/** Standing humanoid with the feet on y = 0. Returns the shoulder height. */
function addHumanoid(b: ModelBuilder, o: HumanoidOptions): number {
  const s = o.scale ?? 1;
  const bulk = o.bulk ?? 1;
  const legColor = o.legColor ?? DARK_LEATHER;
  const armColor = o.armColor ?? (o.torsoTeam === false ? o.torso : SKIN);
  const team = o.torsoTeam !== false;

  addBox(b, 0.15 * s, 0.4 * s, 0.17 * s, -0.11 * s, 0.2 * s, 0, legColor);
  addBox(b, 0.15 * s, 0.4 * s, 0.17 * s, 0.11 * s, 0.2 * s, 0, legColor);
  addBox(b, 0.36 * s * bulk, 0.42 * s, 0.24 * s * bulk, 0, 0.62 * s, 0, o.torso, team);
  addBox(b, 0.44 * s * bulk, 0.1 * s, 0.26 * s * bulk, 0, 0.79 * s, 0, o.torso, team);
  addBox(b, 0.1 * s, 0.36 * s, 0.12 * s, -0.24 * s * bulk, 0.6 * s, 0.01 * s, armColor);
  addBox(b, 0.1 * s, 0.36 * s, 0.12 * s, 0.24 * s * bulk, 0.6 * s, 0.01 * s, armColor);
  addBox(b, 0.2 * s, 0.2 * s, 0.2 * s, 0, 0.92 * s, 0.01 * s, SKIN);

  switch (o.helm ?? 'hair') {
    case 'hair':
      addBox(b, 0.22 * s, 0.09 * s, 0.22 * s, 0, 1.03 * s, 0.01 * s, HAIR);
      break;
    case 'cap':
      addBox(b, 0.23 * s, 0.11 * s, 0.23 * s, 0, 1.04 * s, 0.01 * s, METAL);
      addBox(b, 0.25 * s, 0.05 * s, 0.25 * s, 0, 0.99 * s, 0.01 * s, DARK_METAL);
      break;
    case 'great':
      addBox(b, 0.25 * s, 0.26 * s, 0.27 * s, 0, 0.96 * s, 0.02 * s, METAL);
      addBox(b, 0.2 * s, 0.05 * s, 0.06 * s, 0, 0.96 * s, 0.17 * s, DARK_METAL);
      addBox(b, 0.05 * s, 0.24 * s, 0.28 * s, 0, 0.94 * s, 0.02 * s, DARK_METAL);
      break;
    case 'hood':
      addBox(b, 0.24 * s, 0.2 * s, 0.26 * s, 0, 0.96 * s, -0.01 * s, o.torso, team);
      addCone(b, 0.15 * s, 0.2 * s, 6, 0, 1.08 * s, -0.02 * s, o.torso);
      break;
    case 'mitre':
      addBox(b, 0.24 * s, 0.16 * s, 0.24 * s, 0, 1.0 * s, 0.01 * s, METAL);
      addCone(b, 0.16 * s, 0.3 * s, 6, 0, 1.2 * s, 0.01 * s, 0xf0e6c8);
      break;
    case 'none':
      break;
  }
  return 0.79 * s;
}

interface HorseOptions {
  scale?: number;
  coat?: number;
  barding?: boolean;
  /** Gold trim on the barding (royal knights). */
  trim?: boolean;
  saddleTeam?: boolean;
}

/** Warhorse facing +Z, hooves on y = 0. Returns the saddle height. */
function addHorse(b: ModelBuilder, o: HorseOptions = {}): number {
  const s = o.scale ?? 1;
  const coat = o.coat ?? HORSE_BROWN;
  const dark = o.coat === HORSE_LIGHT ? 0x6d5238 : HORSE_DARK;

  addBox(b, 0.52 * s, 0.5 * s, 1.05 * s, 0, 0.68 * s, 0, coat);
  addBox(b, 0.46 * s, 0.42 * s, 0.3 * s, 0, 0.7 * s, 0.52 * s, coat);
  addBox(b, 0.16 * s, 0.42 * s, 0.16 * s, 0, 0.88 * s, 0.44 * s, coat, false, -0.55, 0, 0);
  addBox(b, 0.22 * s, 0.22 * s, 0.44 * s, 0, 1.08 * s, 0.66 * s, coat);
  addBox(b, 0.2 * s, 0.16 * s, 0.12 * s, 0, 1.02 * s, 0.88 * s, dark);
  addBox(b, 0.07 * s, 0.14 * s, 0.06 * s, -0.08 * s, 1.24 * s, 0.6 * s, dark);
  addBox(b, 0.07 * s, 0.14 * s, 0.06 * s, 0.08 * s, 1.24 * s, 0.6 * s, dark);
  addBox(b, 0.1 * s, 0.42 * s, 0.1 * s, 0, 0.76 * s, -0.56 * s, dark, false, 0.5, 0, 0);

  const legX = 0.19 * s;
  const legZ = 0.34 * s;
  addBox(b, 0.14 * s, 0.56 * s, 0.14 * s, -legX, 0.28 * s, legZ, dark);
  addBox(b, 0.14 * s, 0.56 * s, 0.14 * s, legX, 0.28 * s, legZ, dark);
  addBox(b, 0.14 * s, 0.56 * s, 0.14 * s, -legX, 0.28 * s, -legZ, dark);
  addBox(b, 0.14 * s, 0.56 * s, 0.14 * s, legX, 0.28 * s, -legZ, dark);

  const saddleY = 0.95 * s;
  addBox(b, 0.5 * s, 0.1 * s, 0.5 * s, 0, saddleY, -0.08 * s, DARK_LEATHER);

  if (o.barding) {
    addBox(b, 0.58 * s, 0.36 * s, 0.94 * s, 0, 0.68 * s, 0, TEAM, true);
    addBox(b, 0.56 * s, 0.14 * s, 0.6 * s, 0, 0.95 * s, 0.42 * s, TEAM, true);
    if (o.trim) {
      addBox(b, 0.6 * s, 0.05 * s, 0.98 * s, 0, 0.5 * s, 0, GOLD);
    }
  } else if (o.saddleTeam !== false) {
    addBox(b, 0.54 * s, 0.08 * s, 0.58 * s, 0, 0.82 * s, -0.06 * s, TEAM, true);
  }
  return saddleY;
}

interface RiderOptions {
  scale?: number;
  saddleY: number;
  torso: number;
  helm?: HelmKind;
  torsoTeam?: boolean;
}

/** Rider seated on a horse. */
function addRider(b: ModelBuilder, o: RiderOptions): void {
  const s = o.scale ?? 0.9;
  const hip = o.saddleY + 0.1 * s;
  const team = o.torsoTeam !== false;
  addBox(b, 0.16 * s, 0.44 * s, 0.18 * s, -0.29 * s, hip + 0.06 * s, -0.02 * s, DARK_LEATHER);
  addBox(b, 0.16 * s, 0.44 * s, 0.18 * s, 0.29 * s, hip + 0.06 * s, -0.02 * s, DARK_LEATHER);
  addBox(b, 0.36 * s, 0.44 * s, 0.26 * s, 0, hip + 0.32 * s, 0, o.torso, team);
  addBox(b, 0.44 * s, 0.1 * s, 0.28 * s, 0, hip + 0.5 * s, 0, o.torso, team);
  addBox(b, 0.24 * s, 0.34 * s, 0.12 * s, -0.22 * s, hip + 0.34 * s, 0.06 * s, SKIN);
  addBox(b, 0.1 * s, 0.34 * s, 0.12 * s, 0.22 * s, hip + 0.32 * s, 0.04 * s, SKIN);
  addBox(b, 0.2 * s, 0.2 * s, 0.2 * s, 0, hip + 0.62 * s, 0.01 * s, SKIN);
  switch (o.helm ?? 'cap') {
    case 'great':
      addBox(b, 0.25 * s, 0.26 * s, 0.27 * s, 0, hip + 0.66 * s, 0.02 * s, METAL);
      addBox(b, 0.05 * s, 0.24 * s, 0.28 * s, 0, hip + 0.64 * s, 0.02 * s, DARK_METAL);
      break;
    case 'cap':
      addBox(b, 0.23 * s, 0.12 * s, 0.23 * s, 0, hip + 0.74 * s, 0.01 * s, METAL);
      break;
    case 'hair':
      addBox(b, 0.22 * s, 0.09 * s, 0.22 * s, 0, hip + 0.73 * s, 0.01 * s, HAIR);
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Units
 * ------------------------------------------------------------------ */

function buildVillager(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'hair', scale: 0.96 });
  addCylinder(b, 0.03, 0.03, 0.66, 5, 0.26, shoulder, 0.14, WOOD);
  addBox(b, 0.06, 0.2, 0.13, 0.26, shoulder + 0.34, 0.17, METAL);
  addBox(b, 0.3, 0.16, 0.2, 0, 0.5, -0.2, SACK);
}

function buildSpearman(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'cap', scale: 1 });
  addPole(b, 0.27, shoulder + 0.1, 0.1, 1.55, -0.14, WOOD, METAL, 0.24);
  addShield(b, -0.28, 0.62, 0.16, LEATHER, false, 0.2);
}

function buildManAtArms(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'great', scale: 1.02, bulk: 1.12, legColor: 0x50565f });
  addBox(b, 0.42, 0.2, 0.3, 0, 0.34, 0, 0x606872);
  addSword(b, 0.26, shoulder - 0.02, 0.18, 0.52, -0.1);
  addShield(b, -0.3, 0.62, 0.18, TEAM, true, 0.15);
}

function buildArcher(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'hood', scale: 0.96 });
  addBow(b, 0.27, shoulder - 0.02, 0.12, 1);
  addBox(b, 0.12, 0.42, 0.12, -0.2, shoulder - 0.02, -0.2, DARK_LEATHER);
  addBox(b, 0.03, 0.28, 0.03, -0.24, shoulder + 0.18, -0.22, 0xe8e2d0);
}

function buildCrossbowman(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'cap', scale: 0.98, legColor: 0x6a6257 });
  addCrossbow(b, 0.2, shoulder - 0.06, 0.02, 1);
  addShield(b, -0.22, 0.6, -0.14, TEAM, true, 0.1);
}

function buildLongbowman(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'hood', scale: 1.0 });
  addBow(b, 0.28, shoulder + 0.02, 0.1, 1.15);
  addBox(b, 0.12, 0.44, 0.12, -0.2, shoulder - 0.04, -0.2, DARK_LEATHER);
}

function buildArbaletrier(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'cap', scale: 0.98, legColor: 0x6a6257 });
  addCrossbow(b, 0.22, shoulder - 0.06, 0.02, 1);
  addBox(b, 0.5, 0.7, 0.08, -0.16, 0.66, -0.24, TEAM, true, 0, 0.3, 0);
}

function buildMonk(b: ModelBuilder): void {
  addCylinder(b, 0.17, 0.28, 0.78, 8, 0, 0.39, 0, 0xded4bd);
  addCylinder(b, 0.16, 0.17, 0.2, 8, 0, 0.86, 0, 0xded4bd);
  addBox(b, 0.2, 0.2, 0.2, 0, 1.02, 0.01, SKIN);
  addBox(b, 0.24, 0.2, 0.26, 0, 1.06, -0.02, 0xded4bd);
  addCone(b, 0.15, 0.18, 6, 0, 1.15, -0.02, 0xded4bd);
  addBox(b, 0.1, 0.36, 0.12, -0.24, 0.62, 0.02, 0xded4bd);
  addBox(b, 0.1, 0.36, 0.12, 0.24, 0.62, 0.02, 0xded4bd);
  addCylinder(b, 0.03, 0.03, 1.3, 5, 0.3, 0.65, 0.08, DARK_WOOD);
  addBox(b, 0.14, 0.14, 0.05, 0.3, 1.32, 0.08, GOLD);
  addBox(b, 0.16, 0.22, 0.12, -0.2, 0.78, -0.16, 0x8a3b30);
}

function buildTrader(b: ModelBuilder): void {
  const shoulder = addHumanoid(b, { torso: TEAM, helm: 'hair', scale: 0.96, legColor: 0x6b563c });
  addBox(b, 0.34, 0.36, 0.24, 0, shoulder - 0.02, -0.24, SACK);
  addBox(b, 0.36, 0.12, 0.26, 0, shoulder + 0.16, -0.24, LEATHER);
  // handcart
  addBox(b, 0.5, 0.24, 0.66, 0.02, 0.36, 0.5, WOOD);
  addCylinder(b, 0.18, 0.18, 0.08, 8, -0.3, 0.18, 0.42, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.18, 0.18, 0.08, 8, 0.34, 0.18, 0.42, DARK_WOOD, 0, 0, Math.PI / 2);
  addBox(b, 0.28, 0.1, 0.1, 0.24, 0.5, 0.78, WOOD);
}

function buildScout(b: ModelBuilder): void {
  const saddle = addHorse(b, { coat: HORSE_LIGHT, saddleTeam: true });
  addRider(b, { saddleY: saddle, torso: TEAM, helm: 'cap' });
  addPole(b, 0.3, saddle + 0.46, 0.16, 0.85, -0.1, WOOD, METAL, 0.2);
}

function buildHorseman(b: ModelBuilder): void {
  const saddle = addHorse(b, { coat: HORSE_BROWN });
  addRider(b, { saddleY: saddle, torso: TEAM, helm: 'cap' });
  addShield(b, 0.3, saddle + 0.32, 0.12, TEAM, true, 0.3);
  addPole(b, -0.28, saddle + 0.5, 0.18, 0.9, -0.12, WOOD, METAL, 0.22);
}

function buildKnight(b: ModelBuilder, royal: boolean): void {
  const saddle = addHorse(b, { barding: true, trim: royal, coat: HORSE_DARK });
  addRider(b, { saddleY: saddle, torso: TEAM, helm: 'great' });
  addShield(b, -0.3, saddle + 0.34, 0.16, TEAM, true, 0.2);
  addPole(b, 0.3, saddle + 0.4, 0.3, 1.5, -0.08, DARK_WOOD, METAL, 0.26, 1.2);
}

function buildBatteringRam(b: ModelBuilder): void {
  addBox(b, 0.94, 0.34, 1.5, 0, 0.32, 0, DARK_WOOD);
  addBox(b, 1.0, 0.12, 1.56, 0, 0.5, 0, WOOD);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.12, 1.0, 0.12, sx * 0.42, 0.9, sz * 0.62, WOOD);
    }
  }
  addBox(b, 1.0, 0.1, 0.9, 0, 1.36, 0.28, ROOF_TILE, false, 0.5, 0, 0);
  addBox(b, 1.0, 0.1, 0.9, 0, 1.36, -0.28, ROOF_TILE, false, -0.5, 0, 0);
  addBox(b, 1.04, 0.12, 0.14, 0, 1.5, 0, DARK_WOOD);
  addCylinder(b, 0.14, 0.14, 1.3, 8, 0, 0.62, 0.24, DARK_WOOD, Math.PI / 2);
  addCone(b, 0.18, 0.34, 6, 0, 0.62, 1.05, METAL, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, -0.5, 0.2, 0.4, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, 0.5, 0.2, 0.4, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, -0.5, 0.2, -0.4, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, 0.5, 0.2, -0.4, DARK_WOOD, 0, 0, Math.PI / 2);
  addBox(b, 0.16, 0.4, 0.16, -0.3, 1.7, -0.3, TEAM, true);
}

function buildSiegeTower(b: ModelBuilder): void {
  addBox(b, 0.9, 0.28, 0.9, 0, 0.28, 0, DARK_WOOD);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.14, 1.5, 0.14, sx * 0.4, 0.95, sz * 0.4, WOOD);
    }
  }
  addBox(b, 0.94, 0.7, 0.08, 0, 1.05, 0.44, DARK_WOOD);
  addBox(b, 0.94, 0.7, 0.08, 0, 1.05, -0.44, DARK_WOOD);
  addBox(b, 0.08, 0.7, 0.9, 0.44, 1.05, 0, WOOD);
  addBox(b, 0.94, 0.14, 0.94, 0, 1.72, 0, WOOD);
  addCrenellations(b, 0.94, 0.94, 1.79, DARK_WOOD, 0.16, 0.42);
  addCylinder(b, 0.2, 0.2, 0.12, 8, -0.48, 0.2, 0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, 0.48, 0.2, 0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, -0.48, 0.2, -0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.2, 0.2, 0.12, 8, 0.48, 0.2, -0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addBanner(b, -0.42, 1.79, -0.42, 0.7);
}

function buildMangonel(b: ModelBuilder): void {
  addBox(b, 1.0, 0.3, 0.9, 0, 0.32, 0, DARK_WOOD);
  addBox(b, 0.16, 0.9, 0.16, -0.36, 0.85, -0.2, WOOD);
  addBox(b, 0.16, 0.9, 0.16, 0.36, 0.85, -0.2, WOOD);
  addBox(b, 0.9, 0.14, 0.16, 0, 1.28, -0.2, WOOD);
  addBox(b, 0.14, 0.14, 1.1, 0, 1.2, 0.22, WOOD, false, -0.75, 0, 0);
  addBox(b, 0.34, 0.3, 0.34, 0, 0.98, 0.62, DARK_WOOD);
  addCylinder(b, 0.16, 0.16, 0.7, 8, 0, 0.62, -0.02, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, -0.5, 0.2, 0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, 0.5, 0.2, 0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, -0.5, 0.2, -0.36, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, 0.5, 0.2, -0.36, DARK_WOOD, 0, 0, Math.PI / 2);
  addBox(b, 0.22, 0.22, 0.22, 0, 0.9, -0.3, STONE);
}

function buildSpringald(b: ModelBuilder): void {
  addBox(b, 0.8, 0.24, 1.0, 0, 0.3, 0, DARK_WOOD);
  addBox(b, 0.12, 0.7, 0.12, -0.3, 0.75, -0.1, WOOD);
  addBox(b, 0.12, 0.7, 0.12, 0.3, 0.75, -0.1, WOOD);
  addBox(b, 0.72, 0.1, 0.12, 0, 1.06, -0.1, WOOD);
  addBox(b, 0.5, 0.08, 0.08, 0, 0.98, 0.16, WOOD, false, 0, 0, 0.08);
  addBox(b, 0.5, 0.08, 0.08, 0, 0.98, 0.16, WOOD, false, 0, 0, -0.08);
  addCylinder(b, 0.05, 0.05, 0.9, 6, 0, 0.92, 0.36, DARK_WOOD, Math.PI / 2);
  addCone(b, 0.07, 0.2, 5, 0, 0.92, 0.86, METAL, Math.PI / 2);
  addCylinder(b, 0.18, 0.18, 0.1, 8, -0.4, 0.18, 0.32, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.18, 0.18, 0.1, 8, 0.4, 0.18, 0.32, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.18, 0.18, 0.1, 8, -0.4, 0.18, -0.3, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.18, 0.18, 0.1, 8, 0.4, 0.18, -0.3, DARK_WOOD, 0, 0, Math.PI / 2);
}

function buildTrebuchet(b: ModelBuilder): void {
  addBox(b, 1.1, 0.26, 1.3, 0, 0.3, 0, DARK_WOOD);
  addBox(b, 0.16, 1.5, 0.16, -0.42, 0.95, 0.1, WOOD, false, 0.28, 0, -0.22);
  addBox(b, 0.16, 1.5, 0.16, 0.42, 0.95, 0.1, WOOD, false, 0.28, 0, 0.22);
  addBox(b, 0.16, 1.5, 0.16, -0.42, 0.95, -0.34, WOOD, false, -0.28, 0, -0.22);
  addBox(b, 0.16, 1.5, 0.16, 0.42, 0.95, -0.34, WOOD, false, -0.28, 0, 0.22);
  addBox(b, 0.98, 0.12, 0.12, 0, 1.62, -0.12, DARK_WOOD);
  addBox(b, 0.12, 0.12, 1.9, 0, 1.52, 0.28, WOOD, false, -0.62, 0, 0);
  addBox(b, 0.4, 0.5, 0.4, 0, 0.95, -0.62, DARK_STONE);
  addBox(b, 0.02, 0.02, 0.7, 0, 1.1, 1.05, 0xd9d2bd);
  addBox(b, 0.24, 0.24, 0.24, 0, 0.98, 1.35, STONE);
  addCylinder(b, 0.22, 0.22, 0.12, 8, -0.56, 0.2, 0.5, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, 0.56, 0.2, 0.5, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, -0.56, 0.2, -0.5, DARK_WOOD, 0, 0, Math.PI / 2);
  addCylinder(b, 0.22, 0.22, 0.12, 8, 0.56, 0.2, -0.5, DARK_WOOD, 0, 0, Math.PI / 2);
  addBanner(b, 0.5, 0, -0.62, 1.1);
}

/** One merged geometry per unit definition id. */
export function buildUnitGeometry(defId: string): THREE.BufferGeometry {
  const b = new ModelBuilder();
  switch (defId) {
    case 'spearman':
      buildSpearman(b);
      break;
    case 'manatarms':
      buildManAtArms(b);
      break;
    case 'archer':
      buildArcher(b);
      break;
    case 'longbowman':
      buildLongbowman(b);
      break;
    case 'crossbowman':
      buildCrossbowman(b);
      break;
    case 'arbaletrier':
      buildArbaletrier(b);
      break;
    case 'monk':
      buildMonk(b);
      break;
    case 'trader':
      buildTrader(b);
      break;
    case 'scout':
      buildScout(b);
      break;
    case 'horseman':
      buildHorseman(b);
      break;
    case 'knight':
      buildKnight(b, false);
      break;
    case 'royal_knight':
      buildKnight(b, true);
      break;
    case 'battering_ram':
      buildBatteringRam(b);
      break;
    case 'siege_tower':
      buildSiegeTower(b);
      break;
    case 'mangonel':
      buildMangonel(b);
      break;
    case 'springald':
      buildSpringald(b);
      break;
    case 'trebuchet':
      buildTrebuchet(b);
      break;
    case 'villager':
    default:
      buildVillager(b);
      break;
  }
  return b.build();
}

/* ------------------------------------------------------------------ *
 * Buildings
 * ------------------------------------------------------------------ */

function addHouse(b: ModelBuilder, w: number, d: number): void {
  const wallH = 0.95 + d * 0.12;
  addBox(b, w * 0.94, 0.16, d * 0.94, 0, 0.08, 0, DARK_STONE);
  addBox(b, w * 0.88, wallH, d * 0.88, 0, 0.16 + wallH / 2, 0, 0xd8cdb4);
  addBox(b, w * 0.3, 0.42, 0.08, 0, 0.42, d * 0.44, DARK_WOOD);
  addBox(b, 0.16, 0.16, 0.06, w * 0.22, 0.16 + wallH * 0.6, d * 0.44, 0x3d4a58);
  addBox(b, 0.16, 0.16, 0.06, -w * 0.22, 0.16 + wallH * 0.6, d * 0.44, 0x3d4a58);
  addGableRoof(b, w * 0.98, d * 0.98, 0.16 + wallH, 0.55 + d * 0.1, THATCH);
  addBox(b, 0.13, 0.5, 0.13, w * 0.28, 0.16 + wallH + 0.5, -d * 0.2, DARK_STONE);
  addBox(b, 0.36, 0.22, 0.03, 0, 0.16 + wallH + 0.4, d * 0.46, TEAM, true);
}

function addHall(b: ModelBuilder, w: number, d: number, roof: number, annex: boolean): void {
  const wallH = 1.25 + Math.min(w, d) * 0.12;
  addBox(b, w * 0.96, 0.2, d * 0.96, 0, 0.1, 0, DARK_STONE);
  addBox(b, w * 0.88, wallH, d * 0.88, 0, 0.2 + wallH / 2, 0, 0xcfc3a6);
  addBox(b, w * 0.9, 0.1, d * 0.9, 0, 0.2 + wallH, 0, DARK_WOOD);
  addGableRoof(b, w * 0.96, d * 0.96, 0.2 + wallH, 0.6 + d * 0.12, roof);
  addBox(b, w * 0.26, 0.5, 0.08, 0, 0.45, d * 0.45, DARK_WOOD);
  for (const sx of [-1, 1]) {
    addBox(b, 0.14, 0.14, 0.06, sx * w * 0.28, 0.2 + wallH * 0.62, d * 0.45, 0x3d4a58);
  }
  addBanner(b, -w * 0.42, 0.2, d * 0.42, 1.5);
  if (annex) {
    addBox(b, w * 0.4, 0.7, d * 0.4, w * 0.42, 0.35, -d * 0.4, 0xbfb298);
    addGableRoof(b, w * 0.45, d * 0.45, 0.7, 0.3, DARK_WOOD);
  }
}

function addTower(b: ModelBuilder, w: number, d: number, heightScale: number): void {
  const bodyH = 2.0 * heightScale;
  const side = Math.min(w, d);
  addBox(b, w * 0.98, 0.24, d * 0.98, 0, 0.12, 0, DARK_STONE);
  addBox(b, side * 0.82, bodyH, side * 0.82, 0, 0.24 + bodyH / 2, 0, STONE);
  addBox(b, side * 0.9, 0.16, side * 0.9, 0, 0.24 + bodyH, 0, DARK_STONE);
  addCrenellations(b, side * 0.9, side * 0.9, 0.32 + bodyH, STONE, 0.22, 0.4);
  addBox(b, 0.16, 0.3, 0.06, 0, 1.3 * heightScale, side * 0.41, 0x2b3542);
  addBox(b, 0.06, 0.3, 0.16, side * 0.41, 1.6 * heightScale, 0, 0x2b3542);
  addBox(b, 0.34, 0.46, 0.08, 0, 0.62, side * 0.41, DARK_WOOD);
  if (w > 2 || d > 2) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tx = (sx * (w - side * 0.9)) / 2;
        const tz = (sz * (d - side * 0.9)) / 2;
        addBox(b, side * 0.26, bodyH * 0.7, side * 0.26, tx, 0.24 + (bodyH * 0.7) / 2, tz, STONE);
        addPyramidRoof(b, side * 0.26, side * 0.26, 0.24 + bodyH * 0.7, 0.3, SLATE);
      }
    }
  }
  addBanner(b, 0, 0.32 + bodyH, -side * 0.5, 1.0);
}

function addTownCenter(b: ModelBuilder, w: number, d: number): void {
  const bodyH = 1.9;
  addBox(b, w * 0.98, 0.26, d * 0.98, 0, 0.13, 0, DARK_STONE);
  addBox(b, w * 0.78, bodyH, d * 0.78, 0, 0.26 + bodyH / 2, 0, 0xd6c9a8);
  addBox(b, w * 0.82, 0.16, d * 0.82, 0, 0.26 + bodyH, 0, DARK_WOOD);
  addGableRoof(b, w * 0.8, d * 0.8, 0.26 + bodyH, 0.75, ROOF_TILE);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = (sx * w * 0.86) / 2;
      const tz = (sz * d * 0.86) / 2;
      addBox(b, 0.46, bodyH + 0.7, 0.46, tx, (bodyH + 0.7) / 2 + 0.2, tz, STONE);
      addCrenellations(b, 0.46, 0.46, bodyH + 0.9, STONE, 0.16, 0.3);
      addPyramidRoof(b, 0.5, 0.5, bodyH + 0.32, 0.34, SLATE);
    }
  }
  addBox(b, w * 0.22, 0.55, 0.08, 0, 0.55, d * 0.4, DARK_WOOD);
  addBox(b, w * 0.14, 0.22, 0.06, w * 0.24, 1.5, d * 0.4, 0x3d4a58);
  addBox(b, w * 0.14, 0.22, 0.06, -w * 0.24, 1.5, d * 0.4, 0x3d4a58);
  addBanner(b, 0, 0.26 + bodyH + 0.7, 0, 1.2);
  addBanner(b, -w * 0.3, 0.26, d * 0.3, 2.0);
}

function addLandmarkHall(b: ModelBuilder, w: number, d: number): void {
  const bodyH = 1.7;
  addBox(b, w * 0.98, 0.24, d * 0.98, 0, 0.12, 0, DARK_STONE);
  addBox(b, w * 0.84, bodyH, d * 0.84, 0, 0.24 + bodyH / 2, 0, 0xcbbfa2);
  addBox(b, w * 0.88, 0.14, d * 0.88, 0, 0.24 + bodyH, 0, GOLD);
  addGableRoof(b, w * 0.86, d * 0.86, 0.24 + bodyH, 0.7, SLATE);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.34, bodyH, 0.34, (sx * w * 0.9) / 2, bodyH / 2 + 0.2, (sz * d * 0.9) / 2, STONE);
      addCone(b, 0.26, 0.4, 4, (sx * w * 0.9) / 2, bodyH + 0.45, (sz * d * 0.9) / 2, SLATE, 0, Math.PI / 4, 0);
    }
  }
  addBox(b, w * 0.26, 0.6, 0.1, 0, 0.55, d * 0.42, DARK_WOOD);
  addBox(b, w * 0.3, 0.18, 0.06, 0, 0.24 + bodyH * 0.7, d * 0.43, GOLD);
  addBanner(b, 0, 0.24 + bodyH + 0.7, 0, 1.4);
}

function addWonder(b: ModelBuilder, w: number, d: number): void {
  addBox(b, w * 0.98, 0.3, d * 0.98, 0, 0.15, 0, DARK_STONE);
  addBox(b, w * 0.86, 1.0, d * 0.86, 0, 0.3 + 0.5, 0, 0xd3c6a6);
  addBox(b, w * 0.66, 0.9, d * 0.66, 0, 0.3 + 1.0 + 0.45, 0, 0xc9b998);
  addBox(b, w * 0.46, 0.8, d * 0.46, 0, 0.3 + 1.9 + 0.4, 0, 0xbfae8c);
  addCone(b, Math.hypot(w * 0.46, d * 0.46) / 2, 1.0, 8, 0, 0.3 + 2.7 + 0.5, 0, GOLD);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = (sx * w * 0.92) / 2;
      const tz = (sz * d * 0.92) / 2;
      addCylinder(b, 0.2, 0.26, 2.1, 8, tx, 1.35, tz, STONE);
      addCone(b, 0.3, 0.5, 8, tx, 2.65, tz, GOLD);
    }
  }
  addBox(b, w * 0.3, 0.7, 0.12, 0, 0.65, d * 0.43, DARK_WOOD);
  addBanner(b, 0, 3.2, 0, 1.6);
}

function addFarm(b: ModelBuilder, w: number, d: number): void {
  addBox(b, w * 0.96, 0.06, d * 0.96, 0, 0.03, 0, 0x6b5230);
  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const z = -d * 0.36 + (d * 0.72 * i) / (rows - 1);
    addBox(b, w * 0.82, 0.14, 0.14, 0, 0.12, z, 0x8a9c46);
    addBox(b, w * 0.78, 0.08, 0.08, 0, 0.2, z, 0xb5b957);
  }
  addBox(b, 0.1, 0.5, 0.1, -w * 0.36, 0.25, -d * 0.36, DARK_WOOD);
  addBox(b, 0.2, 0.2, 0.03, -w * 0.36, 0.52, -d * 0.36, TEAM, true);
  addBox(b, 0.5, 0.34, 0.5, w * 0.34, 0.2, d * 0.34, 0xc9a94f);
  addCone(b, 0.4, 0.34, 5, w * 0.34, 0.54, d * 0.34, 0xd9bd63);
}

function addWallSegment(b: ModelBuilder, stone: boolean): void {
  if (stone) {
    addBox(b, 1.0, 0.12, 0.42, 0, 0.06, 0, DARK_STONE);
    addBox(b, 1.0, 0.46, 0.32, 0, 0.35, 0, STONE);
    addBox(b, 1.0, 0.08, 0.4, 0, 0.62, 0, DARK_STONE);
    for (const sz of [-1, 1]) {
      addBox(b, 0.26, 0.16, 0.12, -0.33, 0.74, sz * 0.14, STONE);
      addBox(b, 0.26, 0.16, 0.12, 0, 0.74, sz * 0.14, STONE);
      addBox(b, 0.26, 0.16, 0.12, 0.33, 0.74, sz * 0.14, STONE);
    }
  } else {
    addBox(b, 1.0, 0.1, 0.28, 0, 0.05, 0, DARK_WOOD);
    for (let i = 0; i < 5; i++) {
      const x = -0.4 + i * 0.2;
      addCylinder(b, 0.07, 0.09, 0.78, 5, x, 0.44, 0.02, WOOD);
      addCone(b, 0.08, 0.16, 5, x, 0.9, 0.02, DARK_WOOD);
    }
    addBox(b, 1.0, 0.1, 0.1, 0, 0.6, 0, DARK_WOOD);
  }
}

function addGate(b: ModelBuilder, stone: boolean): void {
  const post = stone ? STONE : WOOD;
  const panel = 0x8a6a3c;
  addBox(b, 1.0, 0.12, 0.44, 0, 0.06, 0, DARK_STONE);
  for (const sx of [-1, 1]) {
    addBox(b, 0.26, 0.9, 0.4, sx * 0.36, 0.51, 0, post);
  }
  addBox(b, 0.98, 0.2, 0.44, 0, 1.04, 0, post);
  addBox(b, 0.98, 0.1, 0.3, 0, 1.16, 0, stone ? DARK_STONE : DARK_WOOD);
  addBox(b, 0.42, 0.72, 0.12, 0, 0.48, 0.02, panel);
  addBox(b, 0.46, 0.1, 0.16, 0, 0.86, 0.02, TEAM, true);
  addBox(b, 0.1, 0.4, 0.06, 0.08, 0.3, 0.1, TEAM, true);
}

/** One merged geometry per building definition, sized to its real footprint. */
export function buildBuildingGeometry(def: BuildingDef): THREE.BufferGeometry {
  const b = new ModelBuilder();
  const w = Math.max(1, def.width);
  const d = Math.max(1, def.height);

  if (def.id === 'farm') {
    addFarm(b, w, d);
  } else if (def.kind === BuildingKind.Wall) {
    addWallSegment(b, def.id === 'stone_wall');
  } else if (def.kind === BuildingKind.Gate) {
    addGate(b, def.id !== 'palisade_gate');
  } else if (def.id === 'town_center') {
    addTownCenter(b, w, d);
  } else if (def.kind === BuildingKind.Wonder) {
    addWonder(b, w, d);
  } else if (def.kind === BuildingKind.Landmark) {
    addLandmarkHall(b, w, d);
  } else if (def.kind === BuildingKind.Defensive) {
    addTower(b, w, d, def.id === 'keep' ? 1.4 : 1);
  } else if (def.kind === BuildingKind.House) {
    addHouse(b, w, d);
  } else if (def.kind === BuildingKind.Production) {
    addHall(b, w, d, ROOF_TILE, true);
  } else if (def.kind === BuildingKind.Research) {
    addHall(b, w, d, SLATE, false);
  } else {
    addHall(b, w, d, THATCH, true);
  }
  return b.build();
}

/* ------------------------------------------------------------------ *
 * Resource nodes and map props
 * ------------------------------------------------------------------ */

function buildTree(b: ModelBuilder, compact: boolean): void {
  const s = compact ? 0.85 : 1;
  addCylinder(b, 0.07 * s, 0.1 * s, 0.5 * s, 6, 0, 0.25 * s, 0, BARK);
  addCone(b, 0.3 * s, 0.62 * s, 7, 0, 0.66 * s, 0, FOLIAGE);
  addCone(b, 0.24 * s, 0.5 * s, 7, 0, 1.0 * s, 0, FOLIAGE);
  addCone(b, 0.16 * s, 0.4 * s, 6, 0, 1.3 * s, 0, FOLIAGE_DARK);
}

function buildGoldMine(b: ModelBuilder): void {
  addRock(b, 0.34, 0, 0.22, 0, DARK_STONE, 1.1, 0.7, 1.1, 0.4);
  addRock(b, 0.24, -0.3, 0.16, 0.18, STONE, 1, 0.7, 1, 1.1);
  addRock(b, 0.22, 0.3, 0.15, -0.2, STONE, 1, 0.7, 1, 2.2);
  addRock(b, 0.12, 0.06, 0.4, 0.1, GOLD);
  addRock(b, 0.1, -0.16, 0.36, -0.12, GOLD);
  addRock(b, 0.09, 0.24, 0.3, 0.22, GOLD);
}

function buildStoneMine(b: ModelBuilder): void {
  addRock(b, 0.36, 0, 0.24, 0, STONE, 1.15, 0.75, 1.15, 0.2);
  addRock(b, 0.26, -0.28, 0.18, 0.2, DARK_STONE, 1, 0.8, 1, 1);
  addRock(b, 0.26, 0.3, 0.18, -0.16, STONE, 1, 0.8, 1, 2);
  addRock(b, 0.18, 0.05, 0.44, 0.12, DARK_STONE);
}

function buildBerryBush(b: ModelBuilder): void {
  addCylinder(b, 0.04, 0.05, 0.2, 5, 0, 0.1, 0, BARK);
  addSphere(b, 0.26, 0, 0.32, 0, FOLIAGE, 1.15, 0.85, 1.15);
  addSphere(b, 0.18, -0.2, 0.26, 0.14, FOLIAGE_DARK);
  addSphere(b, 0.17, 0.2, 0.28, -0.12, FOLIAGE);
  addSphere(b, 0.06, 0.08, 0.44, 0.14, 0xa8323c);
  addSphere(b, 0.055, -0.14, 0.38, -0.06, 0xc23a44);
  addSphere(b, 0.05, 0.2, 0.34, 0.18, 0xa8323c);
}

function buildSheep(b: ModelBuilder): void {
  addSphere(b, 0.26, 0, 0.36, 0, 0xe8e2d4, 1.25, 0.85, 1.5);
  addBox(b, 0.16, 0.16, 0.18, 0, 0.42, 0.34, 0x3f3a36);
  addBox(b, 0.12, 0.06, 0.1, 0, 0.5, 0.26, 0xd8d2c4);
  addBox(b, 0.04, 0.06, 0.04, -0.05, 0.53, 0.3, 0x2f2b28);
  addBox(b, 0.04, 0.06, 0.04, 0.05, 0.53, 0.3, 0x2f2b28);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.08, 0.24, 0.08, sx * 0.14, 0.12, sz * 0.2, 0x3f3a36);
    }
  }
}

function buildDeer(b: ModelBuilder): void {
  addSphere(b, 0.24, 0, 0.6, 0, 0x9a6a42, 1.1, 0.85, 1.6);
  addBox(b, 0.14, 0.14, 0.3, 0, 0.82, 0.36, 0x9a6a42, false, -0.35, 0, 0);
  addBox(b, 0.13, 0.13, 0.2, 0, 0.92, 0.52, 0x8a5c38);
  addBox(b, 0.05, 0.16, 0.05, -0.06, 1.06, 0.5, 0x6b4a2c, false, -0.3, 0, 0.2);
  addBox(b, 0.05, 0.16, 0.05, 0.06, 1.06, 0.5, 0x6b4a2c, false, -0.3, 0, -0.2);
  addBox(b, 0.05, 0.2, 0.05, -0.12, 1.06, 0.44, 0x6b4a2c, false, 0.2, 0, 0.5);
  addBox(b, 0.05, 0.2, 0.05, 0.12, 1.06, 0.44, 0x6b4a2c, false, 0.2, 0, -0.5);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.07, 0.6, 0.07, sx * 0.14, 0.3, sz * 0.3, 0x7d5533);
    }
  }
}

function buildBoar(b: ModelBuilder): void {
  addSphere(b, 0.3, 0, 0.42, 0, 0x4a3a2c, 1.15, 0.9, 1.35);
  addBox(b, 0.2, 0.2, 0.24, 0, 0.46, 0.36, 0x3d2f24);
  addBox(b, 0.12, 0.1, 0.1, 0, 0.4, 0.5, 0x2f261d);
  addBox(b, 0.04, 0.1, 0.04, -0.05, 0.5, 0.46, 0xf0ead8, false, 0.5, 0, 0.2);
  addBox(b, 0.04, 0.1, 0.04, 0.05, 0.5, 0.46, 0xf0ead8, false, 0.5, 0, -0.2);
  addBox(b, 0.05, 0.16, 0.05, -0.09, 0.62, 0.36, 0x3d2f24);
  addBox(b, 0.05, 0.16, 0.05, 0.09, 0.62, 0.36, 0x3d2f24);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(b, 0.09, 0.3, 0.09, sx * 0.16, 0.15, sz * 0.26, 0x2f261d);
    }
  }
}

function buildRelic(b: ModelBuilder): void {
  addBox(b, 0.34, 0.24, 0.24, 0, 0.12, 0, 0x6b4a2c);
  addBox(b, 0.36, 0.06, 0.26, 0, 0.27, 0, GOLD);
  addBox(b, 0.05, 0.1, 0.26, 0, 0.1, 0, GOLD);
  addBox(b, 0.06, 0.06, 0.06, 0, 0.34, 0, 0xf0e6c8);
}

function buildSacredSite(b: ModelBuilder): void {
  addCylinder(b, 0.85, 0.9, 0.1, 12, 0, 0.05, 0, DARK_STONE);
  addCylinder(b, 0.72, 0.78, 0.08, 12, 0, 0.14, 0, 0x8b8878);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addBox(b, 0.16, 0.5, 0.16, Math.cos(a) * 0.66, 0.4, Math.sin(a) * 0.66, STONE, false, 0, a, 0);
  }
  addBox(b, 0.34, 1.3, 0.34, 0, 0.75, 0, 0xb9b3a2);
  addBox(b, 0.42, 0.12, 0.42, 0, 1.44, 0, GOLD);
  addCone(b, 0.24, 0.36, 4, 0, 1.68, 0, GOLD, 0, Math.PI / 4, 0);
}

/** Resource nodes and neutral map props, one geometry per definition id. */
export function buildResourceGeometry(kind: string): THREE.BufferGeometry {
  const b = new ModelBuilder();
  switch (kind) {
    case 'tree':
      buildTree(b, false);
      break;
    case 'berry':
      buildBerryBush(b);
      break;
    case 'gold':
      buildGoldMine(b);
      break;
    case 'stone':
      buildStoneMine(b);
      break;
    case 'sheep':
      buildSheep(b);
      break;
    case 'deer':
      buildDeer(b);
      break;
    case 'boar':
      buildBoar(b);
      break;
    case 'relic':
      buildRelic(b);
      break;
    case 'sacred_site':
      buildSacredSite(b);
      break;
    default:
      buildTree(b, true);
      break;
  }
  return b.build();
}

/**
 * Projectiles travel towards +Z so the renderer can aim them along their
 * velocity with a single quaternion.
 */
export function buildProjectileGeometry(defId: string): THREE.BufferGeometry {
  const b = new ModelBuilder();
  if (defId === 'boulder') {
    addRock(b, 0.16, 0, 0, 0, 0x6a6257);
    addRock(b, 0.09, 0.03, 0.06, 0.02, 0x57514a);
  } else {
    addCylinder(b, 0.022, 0.022, 0.44, 5, 0, 0, 0, WOOD, Math.PI / 2);
    addCone(b, 0.045, 0.12, 5, 0, 0, 0.28, METAL, Math.PI / 2);
    addBox(b, 0.02, 0.1, 0.1, 0, 0, -0.2, 0xe8e2d0);
  }
  return b.build();
}

/* ------------------------------------------------------------------ *
 * Instancing support
 * ------------------------------------------------------------------ */

/**
 * Reserve the per-instance opacity attribute. Every geometry drawn with
 * `createInstancedMaterial` needs it, otherwise the patched shader reads a
 * null attribute and the instance disappears.
 */
export function setInstanceAlphaCapacity(
  geometry: THREE.BufferGeometry,
  capacity: number,
): THREE.InstancedBufferAttribute {
  const existing = geometry.getAttribute(INSTANCE_ALPHA_ATTRIBUTE);
  if (existing instanceof THREE.InstancedBufferAttribute && existing.count === capacity) {
    return existing;
  }
  if (existing) geometry.deleteAttribute(INSTANCE_ALPHA_ATTRIBUTE);
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1), 1);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute(INSTANCE_ALPHA_ATTRIBUTE, attribute);
  return attribute;
}

/**
 * Lambert material for instanced models. It mixes the per-instance owner colour
 * into the vertices tagged as team parts only (the `teamTint` attribute from the
 * model builder) and multiplies the per-instance alpha, so a construction site
 * can fade in without a second material or draw call.
 */
export function createInstancedMaterial(options: InstanceMaterialOptions = {}): THREE.MeshLambertMaterial {
  const transparent = options.transparent === true;
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent,
    depthWrite: true,
    side: THREE.FrontSide,
  });
  material.name = transparent ? 'aegis-instanced-transparent' : 'aegis-instanced';

  material.onBeforeCompile = (shader) => {
    if (!shader.vertexShader.includes('#include <color_vertex>')) return;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          `attribute float ${TEAM_TINT_ATTRIBUTE};`,
          `attribute float ${INSTANCE_ALPHA_ATTRIBUTE};`,
          'varying float vInstanceAlpha;',
        ].join('\n'),
      )
      .replace(
        '#include <color_vertex>',
        [
          '#if defined( USE_COLOR_ALPHA )',
          '\tvColor = vec4( 1.0 );',
          '#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )',
          '\tvColor = vec3( 1.0 );',
          '#endif',
          '#ifdef USE_COLOR',
          '\tvColor *= color;',
          '#endif',
          '#ifdef USE_INSTANCING_COLOR',
          `\tvColor.xyz *= mix( vec3( 1.0 ), instanceColor.xyz, ${TEAM_TINT_ATTRIBUTE} );`,
          '#endif',
          `\tvInstanceAlpha = ${INSTANCE_ALPHA_ATTRIBUTE};`,
        ].join('\n'),
      );

    if (!shader.fragmentShader.includes('#include <color_fragment>')) return;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceAlpha;')
      .replace(
        '#include <color_fragment>',
        [
          '#if defined( USE_COLOR_ALPHA )',
          '\tdiffuseColor *= vColor;',
          '#elif defined( USE_COLOR )',
          '\tdiffuseColor.rgb *= vColor;',
          '#endif',
          '\tdiffuseColor.a *= vInstanceAlpha;',
        ].join('\n'),
      );
  };
  material.customProgramCacheKey = () => (transparent ? 'aegis-instanced-transparent-v1' : 'aegis-instanced-v1');
  return material;
}
