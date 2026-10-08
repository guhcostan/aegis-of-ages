/**
 * Combat system: target acquisition, attack wind-up, damage resolution,
 * projectiles, splash damage and death.
 *
 * Damage model (matches the SPEC):
 *   damage = max(1, attackerAttack + sum(bonus vs defender class) - defenderArmor)
 * where the armour used depends on whether the attack is melee or ranged.
 */
import { FP_ONE } from '../constants';
import { fpDist, fpDist2 } from '../fixed';
import { EntityKind, OrderKind, UnitClass, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { effectiveBuilding, effectiveUnit } from '../stats';
import type { World } from '../world';
import { octantAngle, setDestination, sizeOf } from './movement';

/** Range within which units will pick a fight on their own. */
const AGGRO_RADIUS = Math.trunc(FP_ONE * 7);
/** Squared radius for mangonel splash. */
const SPLASH_RADIUS = Math.trunc(FP_ONE * 1.2);
/** How long a projectile lives before it gives up, in ticks. */
const PROJECTILE_TTL = 40;

const scratch: Entity[] = [];

export function combatSystem(world: World): void {
  // --- Buildings shoot ---
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building) continue;
    if (b.construction < 1000) continue;
    const def = BUILDINGS[b.def];
    if (!def || def.attack <= 0) continue;
    runBuildingAttack(world, b, def.attack);
  }

  // --- Units fight ---
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    if (e.inside !== 0) continue;
    const def = UNITS[e.def];
    if (!def) continue;
    if (def.role === UnitRole.Worker || def.role === UnitRole.Trade) {
      // Workers only fight if explicitly ordered.
      if (!hasAttackOrder(e)) continue;
    }
    if (def.meleeAttack <= 0 && def.rangedAttack <= 0) continue;

    runUnitCombat(world, e);
  }

  // --- Projectiles in flight ---
  stepProjectiles(world);
}

function hasAttackOrder(e: Entity): boolean {
  const o = e.orders[0];
  return !!o && (o.kind === OrderKind.Attack || o.kind === OrderKind.AttackMove);
}

function isRanged(def: { range: number }): boolean {
  return def.range > Math.trunc(FP_ONE * 1.4);
}

function runUnitCombat(world: World, e: Entity): void {
  const def = UNITS[e.def];
  if (!def) return;
  const eff = effectiveUnit(world, e.owner, def);

  // Drop dead targets.
  if (e.attackTarget !== 0 && !world.get(e.attackTarget)) {
    e.attackTarget = 0;
    e.windup = -1;
  }

  const order = e.orders[0];

  // Resolve explicit targets from orders.
  if (order && order.kind === OrderKind.Attack) {
    const target = world.get(order.target);
    if (!target) {
      e.orders.shift();
      e.attackTarget = 0;
      return;
    }
    e.attackTarget = target.id;
  } else if (order && order.kind === OrderKind.AttackMove) {
    if (e.attackTarget === 0 || !world.get(e.attackTarget)) {
      const found = findAutoTarget(world, e, AGGRO_RADIUS);
      if (found) e.attackTarget = found.id;
    }
  } else if (order && order.kind === OrderKind.Hold) {
    if (e.attackTarget === 0 || !world.get(e.attackTarget)) {
      const found = findAutoTarget(world, e, AGGRO_RADIUS);
      if (found) e.attackTarget = found.id;
    }
  } else if (!order) {
    // Idle units defend themselves.
    if (e.attackTarget === 0 || !world.get(e.attackTarget)) {
      const found = findAutoTarget(world, e, AGGRO_RADIUS);
      if (found) e.attackTarget = found.id;
    }
  }

  const target = e.attackTarget !== 0 ? world.get(e.attackTarget) : undefined;
  if (!target) {
    // Nothing to fight: carry on with a move order if we have one.
    if (order && order.kind === OrderKind.AttackMove && !e.hasGoal) {
      setDestination(world, e, order.x, order.y, false);
    }
    return;
  }

  const dist = fpDist(e.x, e.y, target.x, target.y);
  const reach = eff.range + footprintRadius(target);
  // Siege engines cannot fire at point-blank range.
  const tooClose = def.minRange > 0 && dist < def.minRange;

  if (tooClose) {
    // Back away from the target until the minimum range is satisfied.
    const away = def.minRange - dist + FP_ONE / 2;
    const d = dist === 0 ? 1 : dist;
    const bx = e.x - Math.trunc(((target.x - e.x) * away) / d);
    const by = e.y - Math.trunc(((target.y - e.y) * away) / d);
    setDestination(world, e, bx, by, true);
    e.windup = -1;
    return;
  }

  if (dist > reach) {
    // Close the distance. Ranged units stop as soon as they are in range.
    if (!e.hasGoal || e.goalX !== target.x || e.goalY !== target.y) {
      const stopAt = isRanged(def) ? reach - FP_ONE / 4 : reach - FP_ONE / 2;
      const stop = Math.max(0, stopAt);
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = dist === 0 ? 1 : dist;
      const gx = target.x - Math.trunc((dx * stop) / d);
      const gy = target.y - Math.trunc((dy * stop) / d);
      setDestination(world, e, gx, gy, true);
    }
    e.windup = -1;
    return;
  }

  e.hasGoal = false;
  e.path = [];
  e.pathIndex = 0;

  // In range: run the attack cycle.
  if (e.windup > 0) {
    e.windup--;
    if (e.windup === 0) {
      resolveAttack(world, e, target);
      e.windup = -1;
    }
    return;
  }
  if (e.cooldown > 0) {
    e.cooldown--;
    return;
  }
  e.windup = Math.max(1, def.windup);
  e.cooldown = eff.attackSpeed;
  // A charge is spent when the unit stops to fight; it recharges by moving.
  if (e.chargeReady === 0) e.chargeReady = 1;
}

/** Enemy entity this unit should attack on its own initiative. */
function findAutoTarget(world: World, e: Entity, radius: number): Entity | null {
  const player = world.players[e.owner];
  if (!player) return null;
  let best: Entity | null = null;
  let bestScore = Number.MAX_SAFE_INTEGER;
  const found = world.queryRadius(e.x, e.y, radius, scratch);
  for (const t of found) {
    if (t.id === e.id) continue;
    if (t.owner === e.owner) continue;
    if (t.owner < 0) continue;
    const other = world.players[t.owner];
    if (!other || other.defeated) continue;
    if (player.team === other.team && player.team !== 0) {
      // Team 0 is free-for-all: everyone else is an enemy.
      continue;
    }
    // Prefer the closest, then the lowest id for determinism.
    const d = fpDist2(e.x, e.y, t.x, t.y);
    const score = d * 2 + (t.kind === EntityKind.Building ? 1 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Radius added to a target's position so buildings can be hit. */
function footprintRadius(target: Entity): number {
  if (target.kind !== EntityKind.Building) return 0;
  const def = BUILDINGS[target.def];
  if (!def) return 0;
  return Math.trunc((Math.max(def.width, def.height) * FP_ONE) / 2);
}

/** Apply one attack from `attacker` onto `target`. */
export function resolveAttack(world: World, attacker: Entity, target: Entity): void {
  const def = UNITS[attacker.def];
  if (!def) return;
  const ranged = isRanged(def);
  const eff = effectiveUnit(world, attacker.owner, def);
  const base = ranged ? eff.rangedAttack : eff.meleeAttack;
  if (base <= 0 && def.bonusVs.length === 0) return;

  const bonus = bonusAgainst(def, target);
  // Heavy cavalry gets one extra burst of damage after closing the distance.
  const charge = !ranged && def.chargeBonus > 0 && attacker.chargeReady === 1 ? def.chargeBonus : 0;
  const damage = Math.max(1, base + bonus + charge);
  if (charge > 0) attacker.chargeReady = 0;

  if (ranged) {
    spawnProjectile(world, attacker, target, damage, def.id === 'mangonel' || def.id === 'trebuchet');
  } else {
    applyDamage(world, target, damage, attacker.owner, attacker.id);
  }
  attacker.facing = angleTo(attacker.x, attacker.y, target.x, target.y);
}

/**
 * Total bonus damage against a target. A unit can carry several classes (a
 * Knight is both Cavalry and Heavy), and each matching bonus applies once.
 */
function bonusAgainst(def: { bonusVs: Array<{ cls: UnitClass; amount: number }> }, target: Entity): number {
  const classes = classesOf(target);
  let sum = 0;
  for (const b of def.bonusVs) {
    if (classes.includes(b.cls)) sum += b.amount;
  }
  return sum;
}

/** Every class a target counts as, for bonus-damage lookups. */
function classesOf(target: Entity): UnitClass[] {
  if (target.kind === EntityKind.Building) return [UnitClass.Building];
  if (target.kind === EntityKind.ResourceNode) return [UnitClass.Fauna];
  const def = UNITS[target.def];
  return def ? def.classes : [UnitClass.Infantry];
}

/** Percentage of incoming ranged damage a siege engine ignores. */
function rangedResistanceOf(world: World, target: Entity): number {
  if (target.kind !== EntityKind.Unit) return 0;
  const def = UNITS[target.def];
  if (!def) return 0;
  void world;
  return def.rangedResistance;
}

function armorAgainst(world: World, target: Entity, ranged: boolean): number {
  if (target.kind === EntityKind.Building) {
    const def = BUILDINGS[target.def];
    if (!def) return 0;
    const eff = effectiveBuilding(world, target.owner, def);
    return ranged ? eff.rangedArmor : eff.meleeArmor;
  }
  if (target.kind === EntityKind.ResourceNode) return 0;
  const def = UNITS[target.def];
  if (!def) return 0;
  const eff = effectiveUnit(world, target.owner, def);
  return ranged ? eff.rangedArmor : eff.meleeArmor;
}

/** Central damage application: armour, death and kill credit. */
export function applyDamage(
  world: World,
  target: Entity,
  rawDamage: number,
  attackerOwner: number,
  attackerId: number,
): void {
  const ranged = false;
  const armor = armorAgainst(world, target, ranged);
  const damage = Math.max(1, rawDamage - armor);
  target.hp -= damage;
  target.lastDamageTick = world.tick;
  if (target.hp <= 0) {
    world.destroyEntity(target.id, attackerOwner);
    void attackerId;
  }
}

/** Damage variant used by projectiles, which know the attack type. */
export function applyDamageTyped(
  world: World,
  target: Entity,
  rawDamage: number,
  ranged: boolean,
  attackerOwner: number,
): void {
  const armor = armorAgainst(world, target, ranged);
  // Siege engines carry a percentage resistance to ranged damage (55-95% in
  // AoE IV). Resistance is multiplicative and applied before armor.
  const resistance = ranged ? rangedResistanceOf(world, target) : 0;
  const afterResistance =
    resistance > 0 ? Math.trunc((rawDamage * (100 - resistance)) / 100) : rawDamage;
  const damage = Math.max(1, afterResistance - armor);
  target.hp -= damage;
  target.lastDamageTick = world.tick;
  if (target.hp <= 0) {
    world.destroyEntity(target.id, attackerOwner);
  }
}

function spawnProjectile(
  world: World,
  attacker: Entity,
  target: Entity,
  damage: number,
  splash: boolean,
): void {
  const p = world.createEntity(EntityKind.Projectile, splash ? 'boulder' : 'arrow', attacker.owner, attacker.x, attacker.y);
  p.target = target.id;
  p.damage = damage;
  p.source = attacker.id;
  p.ttl = PROJECTILE_TTL;
  p.hp = 1;
  p.maxHp = 1;
  // Straight-line speed: fast arrows, slower stones.
  const dist = Math.max(1, fpDist(attacker.x, attacker.y, target.x, target.y));
  const perTick = Math.max(FP_ONE / 8, Math.trunc(dist / (splash ? 14 : 8)));
  p.vx = Math.trunc(((target.x - attacker.x) * perTick) / dist);
  p.vy = Math.trunc(((target.y - attacker.y) * perTick) / dist);
  p.z = Math.trunc(FP_ONE / 2);
  p.vz = splash ? Math.trunc(FP_ONE / 6) : 0;
}

function stepProjectiles(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const p = world.entities[i];
    if (!p || !p.alive || p.kind !== EntityKind.Projectile) continue;

    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    if (p.vz !== 0) p.vz -= Math.trunc(FP_ONE / 30);
    p.ttl--;

    const target = world.get(p.target);
    let consumed = false;
    if (target) {
      const d = fpDist(p.x, p.y, target.x, target.y);
      if (d <= Math.trunc(FP_ONE / 2) || p.ttl <= 0) {
        if (p.def === 'boulder') {
          applySplash(world, p.x, p.y, p.damage, p.owner);
        } else {
          applyDamageTyped(world, target, p.damage, true, p.owner);
        }
        consumed = true;
      }
    } else if (p.ttl <= 0) {
      consumed = true;
    }
    if (consumed) world.destroyEntity(p.id);
  }
}

/** Mangonel/trebuchet area damage: everything inside the splash radius. */
function applySplash(world: World, x: number, y: number, damage: number, owner: number): void {
  const hits = world.queryRadius(x, y, SPLASH_RADIUS, scratch);
  for (const t of hits) {
    if (t.kind === EntityKind.Projectile) continue;
    if (t.owner === owner) continue;
    applyDamageTyped(world, t, damage, true, owner);
  }
}

function runBuildingAttack(world: World, b: Entity, baseAttack: number): void {
  if (b.cooldown > 0) {
    b.cooldown--;
    return;
  }
  const def = BUILDINGS[b.def];
  if (!def) return;
  const eff = effectiveBuilding(world, b.owner, def);
  const range = eff.range > 0 ? eff.range : def.range;
  const target = world.nearest(
    b.x,
    b.y,
    range,
    (t) => t.owner !== b.owner && t.owner >= 0 && t.kind === EntityKind.Unit,
    scratch,
  );
  if (!target) return;
  const bonus = bonusAgainst(def, target);
  const damage = Math.max(1, baseAttack + bonus);
  spawnProjectile(world, b, target, damage, false);
  b.cooldown = def.attackSpeed;
}

/** Integer angle from A to B in 1/256 turns. */
export function angleTo(ax: number, ay: number, bx: number, by: number): number {
  return octantAngle(bx - ax, by - ay);
}

export { sizeOf };
