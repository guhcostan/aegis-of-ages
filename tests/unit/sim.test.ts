/**
 * Determinism and data-integrity unit tests.
 *
 * These are the balance critic's automated half: they check the numbers in the
 * data tables against docs/SPEC.md's rules and they prove that the simulation
 * is reproducible from a seed.
 */
import { describe, expect, it } from 'vitest';
import { Age, TICK_RATE, POP_CAP_MAX } from '../../src/sim/constants';
import { Game } from '../../src/sim/game';
import { CommandType } from '../../src/sim/commands';
import { EntityKind, UnitClass, UnitRole } from '../../src/sim/types';
import { ALL_UNITS, UNITS } from '../../src/sim/data/units';
import { ALL_BUILDINGS, BUILDINGS } from '../../src/sim/data/buildings';
import { ALL_TECHS, TECHS } from '../../src/sim/data/techs';
import { CIVS } from '../../src/sim/data/civs';
import { GATHER_RATES, NODE_AMOUNTS, START_UNITS } from '../../src/sim/data/economy';
import { effectiveUnit } from '../../src/sim/stats';

describe('determinism', () => {
  it('produces the same state hash for the same seed and command stream', () => {
    const run = (): number => {
      const game = new Game({ seed: 987654, mapSize: 'small', disableBots: true });
      const tc = [...game.world.all()].find((e) => e.def === 'town_center' && e.owner === 0);
      expect(tc).toBeDefined();
      if (tc) {
        for (let i = 0; i < 4; i++) {
          game.enqueue({
            type: CommandType.Train,
            player: 0,
            building: tc.id,
            defId: 'villager',
            count: 1,
          });
        }
      }
      game.runToCompletion(600);
      return game.hash();
    };
    expect(run()).toBe(run());
  });

  it('produces different maps for different seeds', () => {
    const a = new Game({ seed: 1, mapSize: 'small', disableBots: true });
    const b = new Game({ seed: 2, mapSize: 'small', disableBots: true });
    expect(a.hash()).not.toBe(b.hash());
  });

  it('keeps every player state inside integer bounds after a long run', () => {
    const game = new Game({ seed: 31337, mapSize: 'small', disableBots: true });
    game.runToCompletion(TICK_RATE * 120);
    for (const player of game.world.players) {
      for (const value of [
        player.resources.food,
        player.resources.wood,
        player.resources.gold,
        player.resources.stone,
        player.pop,
      ]) {
        expect(Number.isInteger(value), `non-integer resource: ${value}`).toBe(true);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('unit data integrity', () => {
  it('has a definition for every unit id referenced by a production building', () => {
    for (const building of ALL_BUILDINGS) {
      for (const unitId of building.trains) {
        expect(UNITS[unitId], `${building.id} trains unknown unit ${unitId}`).toBeDefined();
      }
      for (const techId of building.researches) {
        expect(TECHS[techId], `${building.id} researches unknown tech ${techId}`).toBeDefined();
      }
    }
  });

  it('trains every unit somewhere', () => {
    for (const unit of ALL_UNITS) {
      expect(unit.trainedAt.length, `${unit.id} has no producer`).toBeGreaterThan(0);
      for (const buildingId of unit.trainedAt) {
        const building = BUILDINGS[buildingId];
        expect(building, `${unit.id} trained at unknown building ${buildingId}`).toBeDefined();
        expect(
          building?.trains.includes(unit.id),
          `${buildingId} does not list ${unit.id} in trains`,
        ).toBe(true);
      }
    }
  });

  it('keeps costs and stats as positive integers', () => {
    for (const unit of ALL_UNITS) {
      for (const key of ['food', 'wood', 'gold', 'stone'] as const) {
        const value = unit.cost[key];
        expect(Number.isInteger(value), `${unit.id}.cost.${key} not an integer`).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.trainTime).toBeGreaterThan(0);
      expect(unit.attackSpeed).toBeGreaterThan(0);
      expect(unit.speed).toBeGreaterThan(0);
      expect(unit.pop).toBeGreaterThan(0);
      if (unit.classes.length === 0) throw new Error(`${unit.id} has no classes`);
    }
  });

  it('matches the AoE IV counter design: spears beat cavalry, cavalry beats archers', () => {
    const spearman = UNITS.spearman;
    const horseman = UNITS.horseman;
    const archer = UNITS.archer;
    const knight = UNITS.knight;
    expect(spearman).toBeDefined();
    expect(horseman).toBeDefined();
    expect(archer).toBeDefined();
    expect(knight).toBeDefined();
    if (!spearman || !horseman || !archer || !knight) return;

    // Spearman carries a large bonus against cavalry.
    expect(spearman.bonusVs.find((b) => b.cls === UnitClass.Cavalry)?.amount ?? 0).toBeGreaterThan(10);
    // Horseman carries a bonus against ranged and siege.
    expect(horseman.bonusVs.find((b) => b.cls === UnitClass.Ranged)?.amount ?? 0).toBeGreaterThan(0);
    expect(horseman.bonusVs.find((b) => b.cls === UnitClass.Siege)?.amount ?? 0).toBeGreaterThan(0);
    // Archer counters light melee infantry, i.e. spearmen.
    expect(archer.bonusVs.find((b) => b.cls === UnitClass.LightInfantry)?.amount ?? 0).toBeGreaterThan(0);
    // Knight is heavy, so crossbows and arbaletriers are its counter.
    expect(knight.classes).toContain(UnitClass.Heavy);
    expect(UNITS.crossbowman?.bonusVs.find((b) => b.cls === UnitClass.Heavy)?.amount ?? 0).toBeGreaterThan(0);
    expect(UNITS.arbaletrier?.bonusVs.find((b) => b.cls === UnitClass.Heavy)?.amount ?? 0).toBeGreaterThan(0);
  });

  it('gives siege engines ranged resistance and a minimum range', () => {
    for (const id of ['battering_ram', 'siege_tower', 'mangonel', 'springald', 'trebuchet']) {
      const def = UNITS[id];
      expect(def, `${id} missing`).toBeDefined();
      expect(def?.rangedResistance ?? 0).toBeGreaterThan(0);
      expect(def?.classes).toContain(UnitClass.Siege);
    }
    expect(UNITS.mangonel?.minRange ?? 0).toBeGreaterThan(0);
    expect(UNITS.trebuchet?.minRange ?? 0).toBeGreaterThan(0);
  });
});

describe('building data integrity', () => {
  it('has positive footprints and hit points', () => {
    for (const building of ALL_BUILDINGS) {
      expect(building.hp).toBeGreaterThan(0);
      expect(building.width).toBeGreaterThan(0);
      expect(building.height).toBeGreaterThan(0);
      expect(building.buildTime).toBeGreaterThan(0);
      expect(building.width).toBeLessThanOrEqual(6);
      expect(building.height).toBeLessThanOrEqual(6);
    }
  });

  it('gives every civilization two landmark choices for every age it advances into', () => {
    for (const civ of Object.values(CIVS)) {
      for (const age of [Age.Feudal, Age.Castle, Age.Imperial]) {
        const choices = civ.landmarks[age];
        expect(choices, `${civ.id} has no landmark pair for age ${age}`).toBeDefined();
        expect(choices.length).toBe(2);
        for (const id of choices) {
          const def = BUILDINGS[id];
          expect(def, `${civ.id} landmark ${id} missing`).toBeDefined();
          expect(def?.isLandmark, `${id} is not flagged as a landmark`).toBe(true);
          expect(def?.landmarkAge, `${id} has no target age`).toBe(age);
          expect(def?.civ).toBe(civ.id);
        }
      }
    }
  });

  it('gives each civilization a unique unit the other cannot build', () => {
    const english = ALL_UNITS.filter((u) => u.civ === 'english').map((u) => u.id);
    const french = ALL_UNITS.filter((u) => u.civ === 'french').map((u) => u.id);
    expect(english.length).toBeGreaterThan(0);
    expect(french.length).toBeGreaterThan(0);
    expect(english.some((id) => french.includes(id))).toBe(false);
  });
});

describe('technology data integrity', () => {
  it('points every technology at a real building that can research it', () => {
    const researchable = new Set<string>();
    for (const building of ALL_BUILDINGS) {
      for (const techId of building.researches) researchable.add(techId);
    }
    for (const tech of ALL_TECHS) {
      expect(
        researchable.has(tech.id),
        `${tech.id} is not listed by any building`,
      ).toBe(true);
    }
  });

  it('has satisfiable prerequisites', () => {
    for (const tech of ALL_TECHS) {
      for (const req of tech.requires) {
        const dep = TECHS[req];
        expect(dep, `${tech.id} requires unknown tech ${req}`).toBeDefined();
        expect(dep?.age ?? 99).toBeLessThanOrEqual(tech.age);
      }
    }
  });

  it('never has an empty effect list', () => {
    for (const tech of ALL_TECHS) {
      expect(tech.effects.length, `${tech.id} has no effects`).toBeGreaterThan(0);
    }
  });
});

describe('economy rules', () => {
  it('uses the researched base gather rates', () => {
    expect(GATHER_RATES.tree?.perSecond).toBe(750);
    expect(GATHER_RATES.gold?.perSecond).toBe(750);
    expect(GATHER_RATES.sheep?.perSecond).toBe(750);
    expect(GATHER_RATES.berry?.perSecond).toBe(690);
    expect(GATHER_RATES.deer?.perSecond).toBe(825);
    expect(GATHER_RATES.boar?.perSecond).toBe(900);
    // Hunted meat carries more than gathered resources.
    expect(GATHER_RATES.deer?.carry).toBe(25);
    expect(GATHER_RATES.tree?.carry).toBe(10);
  });

  it('uses the researched node pool sizes', () => {
    expect(NODE_AMOUNTS.tree).toBe(150);
    expect(NODE_AMOUNTS.sheep).toBe(200);
    expect(NODE_AMOUNTS.deer).toBe(350);
    expect(NODE_AMOUNTS.berry).toBe(250);
    expect(UNITS.villager?.cost.food).toBe(50);
    expect(UNITS.knight?.cost.food).toBe(140);
    expect(UNITS.knight?.cost.gold).toBe(100);
    expect(UNITS.horseman?.cost.food).toBe(100);
    expect(UNITS.archer?.cost.wood).toBe(50);
  });

  it('starts every player with six villagers and a scout', () => {
    const total = START_UNITS.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(7);
    expect(START_UNITS.find((s) => s.defId === 'villager')?.count).toBe(6);
    expect(START_UNITS.find((s) => s.defId === 'scout')?.count).toBe(1);
  });

  it('caps population at 200', () => {
    expect(POP_CAP_MAX).toBe(200);
    expect(BUILDINGS.house?.popProvided).toBe(10);
    expect(BUILDINGS.town_center?.popProvided).toBe(10);
  });
});

describe('effective stats', () => {
  it('applies civilization bonuses without breaking integer invariants', () => {
    const game = new Game({ seed: 5, mapSize: 'tiny', disableBots: true });
    const english = game.world.players[0];
    const french = game.world.players[1];
    expect(english?.civ).toBe('english');
    expect(french?.civ).toBe('french');

    const englishLongbow = effectiveUnit(game.world, 0, UNITS.longbowman as never);
    const frenchCrossbow = effectiveUnit(game.world, 1, UNITS.crossbowman as never);
    // The English bonus gives the longbowman two extra tiles of range.
    expect(englishLongbow.range).toBeGreaterThan(7 * 1024);
    expect(frenchCrossbow.range).toBe(5 * 1024);
    expect(Number.isInteger(englishLongbow.hp)).toBe(true);
  });

  it('makes researched technologies change effective stats', () => {
    const game = new Game({ seed: 6, mapSize: 'tiny', disableBots: true });
    const before = effectiveUnit(game.world, 0, UNITS.spearman as never);
    game.world.players[0]?.techs.add('forged_blades');
    if (game.world.players[0]) game.world.players[0].modVersion++;
    const after = effectiveUnit(game.world, 0, UNITS.spearman as never);
    expect(after.meleeAttack).toBeGreaterThan(before.meleeAttack);
  });
});

describe('roles', () => {
  it('assigns a role to every unit', () => {
    // UnitRole.Worker..UnitRole.Siege inclusive (const enums have no runtime object).
    for (const unit of ALL_UNITS) {
      expect(unit.role, `${unit.id} has role ${unit.role}`).toBeGreaterThanOrEqual(UnitRole.Worker);
      expect(unit.role).toBeLessThanOrEqual(UnitRole.Siege);
    }
  });

  it('uses only known entity kinds when spawning', () => {
    const game = new Game({ seed: 9, mapSize: 'tiny', disableBots: true });
    // EntityKind.Unit..EntityKind.SacredSite inclusive.
    for (const e of game.world.all()) {
      expect(e.kind, `${e.def} has kind ${e.kind}`).toBeGreaterThanOrEqual(EntityKind.Unit);
      expect(e.kind).toBeLessThanOrEqual(EntityKind.SacredSite);
    }
  });
});
