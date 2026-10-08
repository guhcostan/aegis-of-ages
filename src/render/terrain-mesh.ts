/**
 * Terrain mesh builder.
 *
 * The whole map becomes ONE indexed mesh: one quad per tile, displaced by the
 * shared corner heights derived from `elevation[]`, and coloured per terrain
 * type. Sharing the corner heights between neighbouring tiles makes the surface
 * continuous - no vertical steps, no cracks, no skirts - while each tile keeps
 * a crisp colour, and a whole map still costs a single draw call.
 *
 * Quads are emitted row by row, which lets the renderer restrict a raycast to a
 * few rows of tiles through `geometry.drawRange`.
 */
import * as THREE from 'three';
import { ELEV_UNIT, Terrain } from '../sim/map/terrain';
import type { GameMap } from '../sim/map/terrain';

/** Indices per tile quad in the terrain index buffer. */
export const INDICES_PER_TILE = 6;

/** Waterline in world units. Water tiles sit at -0.1 or lower, land at -0.05. */
export const WATER_LEVEL = -1.5 / ELEV_UNIT;

/** Base sRGB colours per terrain type, indexed by the Terrain enum. */
export const TERRAIN_COLORS: number[] = [
  0x5f8c42, // Grass
  0x8b7a52, // Dirt
  0x2d5f88, // Water
  0x2f5c2c, // Forest
  0x9a9450, // Hill
  0x7d7a72, // Rock
  0x9c8a46, // Farm
];

const _color = new THREE.Color();
const _water = new THREE.Color();

/** Corner-height grids, one per map, built on first use. */
const cornerCache = new WeakMap<GameMap, Float32Array>();

/**
 * Height of every grid corner in world units: the mean of the (up to four)
 * tiles touching it, so neighbouring tiles agree on the shared edge exactly.
 */
export function cornerHeights(map: GameMap): Float32Array {
  const cached = cornerCache.get(map);
  if (cached) return cached;

  const { width, height, elevation } = map;
  const stride = width + 1;
  const corners = new Float32Array(stride * (height + 1));
  for (let cy = 0; cy <= height; cy++) {
    for (let cx = 0; cx <= width; cx++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 0; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
          sum += (elevation[ty * width + tx] as number) / ELEV_UNIT;
          count++;
        }
      }
      corners[cy * stride + cx] = count > 0 ? sum / count : 0;
    }
  }
  cornerCache.set(map, corners);
  return corners;
}

/** Deterministic per-tile brightness jitter in [0, 1). */
export function terrainShade(x: number, y: number): number {
  let h = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2545f491);
  h ^= h >>> 13;
  return ((h >>> 8) & 255) / 255;
}

/** Terrain colour for a tile as an sRGB hex value (used by the minimap). */
export function terrainColorHex(map: GameMap, tileX: number, tileY: number): number {
  const i = tileY * map.width + tileX;
  const type = map.terrain[i] as Terrain;
  return TERRAIN_COLORS[type] ?? 0x808080;
}

/**
 * World-space ground height under a world position. The tile quad is split on
 * the same diagonal as the mesh, so the sampled surface matches the geometry.
 */
export function terrainHeightAtWorld(map: GameMap, worldX: number, worldZ: number): number {
  const { width, height } = map;
  const clampX = worldX < 0 ? 0 : worldX > width - 1e-4 ? width - 1e-4 : worldX;
  const clampZ = worldZ < 0 ? 0 : worldZ > height - 1e-4 ? height - 1e-4 : worldZ;
  const tileX = Math.floor(clampX);
  const tileZ = Math.floor(clampZ);
  const u = clampX - tileX;
  const v = clampZ - tileZ;

  const corners = cornerHeights(map);
  const stride = width + 1;
  const h00 = corners[tileZ * stride + tileX] as number;
  const h10 = corners[tileZ * stride + tileX + 1] as number;
  const h01 = corners[(tileZ + 1) * stride + tileX] as number;
  const h11 = corners[(tileZ + 1) * stride + tileX + 1] as number;

  // Triangle (v0, v2, v1) covers u >= v; triangle (v0, v3, v2) covers the rest.
  if (u >= v) return h00 + (h10 - h00) * u + (h11 - h10) * v;
  return h00 + (h01 - h00) * v + (h11 - h01) * u;
}

/** World-space ground height at the centre of a tile. */
export function terrainHeightAt(map: GameMap, tileX: number, tileY: number): number {
  return terrainHeightAtWorld(map, tileX + 0.5, tileY + 0.5);
}

/**
 * Build the terrain mesh. `material` is expected to use vertex colours and the
 * subtle noise map from textures.ts.
 */
export function buildTerrainMesh(map: GameMap, material: THREE.Material): THREE.Mesh {
  const { width, height, terrain, elevation } = map;
  const tiles = width * height;
  const corners = cornerHeights(map);
  const stride = width + 1;

  const positions = new Float32Array(tiles * 12);
  const normals = new Float32Array(tiles * 12);
  const uvs = new Float32Array(tiles * 8);
  const colors = new Float32Array(tiles * 12);
  const indices = new Uint32Array(tiles * INDICES_PER_TILE);

  let vertex = 0;
  let index = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = y * width + x;
      const base = vertex;
      // Corners in (x, z) order: (0,0) (1,0) (1,1) (0,1).
      const cornerList = [
        corners[y * stride + x] as number,
        corners[y * stride + x + 1] as number,
        corners[(y + 1) * stride + x + 1] as number,
        corners[(y + 1) * stride + x] as number,
      ];
      for (let corner = 0; corner < 4; corner++) {
        const cx = corner === 1 || corner === 2 ? 1 : 0;
        const cz = corner >= 2 ? 1 : 0;
        const p = vertex * 3;
        positions[p] = x + cx;
        positions[p + 1] = cornerList[corner] as number;
        positions[p + 2] = y + cz;
        normals[p] = 0;
        normals[p + 1] = 1;
        normals[p + 2] = 0;
        const u = vertex * 2;
        uvs[u] = (x + cx) * 0.0625;
        uvs[u + 1] = (y + cz) * 0.0625;
        vertex++;
      }

      const type = terrain[tile] as Terrain;
      _color.setHex(TERRAIN_COLORS[type] ?? 0x808080, THREE.SRGBColorSpace);
      _color.multiplyScalar(0.955 + terrainShade(x, y) * 0.09);
      if (type === Terrain.Water) {
        // Deeper water reads darker, which gives the sea some depth.
        const depth = THREE.MathUtils.clamp((-2 - (elevation[tile] as number)) / 8, 0, 0.45);
        _water.setHex(0x16324d, THREE.SRGBColorSpace);
        _color.lerp(_water, depth);
      }
      for (let corner = 0; corner < 4; corner++) {
        const c = (base + corner) * 3;
        colors[c] = _color.r;
        colors[c + 1] = _color.g;
        colors[c + 2] = _color.b;
      }

      indices[index++] = base;
      indices[index++] = base + 2;
      indices[index++] = base + 1;
      indices[index++] = base;
      indices[index++] = base + 3;
      indices[index++] = base + 2;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'aegis-terrain';
  mesh.position.set(0, 0, 0);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

/** Static water plane covering the whole map, sitting just above sea level. */
export function buildWaterMesh(map: GameMap, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(map.width + 6, map.height + 6, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'aegis-water';
  mesh.position.set(map.width / 2, WATER_LEVEL, map.height / 2);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

/**
 * Restrict terrain raycasts to a band of tile rows. `geometry.drawRange` is
 * honoured by three.js raycasting, so a pick only tests a few hundred
 * triangles instead of the whole map.
 */
export function setTerrainRowWindow(
  geometry: THREE.BufferGeometry,
  map: GameMap,
  rowStart: number,
  rowEnd: number,
): void {
  const first = Math.max(0, Math.min(map.height - 1, rowStart));
  const last = Math.max(first, Math.min(map.height - 1, rowEnd));
  geometry.setDrawRange(first * map.width * INDICES_PER_TILE, (last - first + 1) * map.width * INDICES_PER_TILE);
}

/** Restore the full draw range after a windowed raycast. */
export function resetTerrainDrawRange(geometry: THREE.BufferGeometry, map: GameMap): void {
  geometry.setDrawRange(0, map.width * map.height * INDICES_PER_TILE);
}
