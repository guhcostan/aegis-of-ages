/**
 * Trade system: merchants shuttle between your Market and a partner Market,
 * earning gold proportional to the distance travelled.
 */
import { FP_ONE } from '../constants';
import { fpDist } from '../fixed';
import { EntityKind, OrderKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { TRADE_BASE, TRADE_PER_TILE } from '../data/economy';
import type { World } from '../world';
import { setDestination } from './movement';

const REACH = Math.trunc(FP_ONE * 1.2);

export function tradeSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const m = world.entities[i];
    if (!m || !m.alive || m.kind !== EntityKind.Unit) continue;
    const def = UNITS[m.def];
    if (!def || def.role !== UnitRole.Trade) continue;

    const order = m.orders[0];
    if (!order || order.kind !== OrderKind.Trade) {
      // Idle merchant with no route: find a partner market automatically.
      const partner = findPartnerMarket(world, m);
      if (partner) {
        orderMerchant(world, m, partner.id);
      }
      continue;
    }

    const destination = world.get(order.target);
    if (!destination) {
      const partner = findPartnerMarket(world, m);
      if (partner) orderMerchant(world, m, partner.id);
      else m.orders.length = 0;
      continue;
    }

    if (fpDist(m.x, m.y, destination.x, destination.y) > REACH) {
      if (!m.hasGoal) setDestination(world, m, destination.x, destination.y, true);
      continue;
    }

    // Arrived: pay out, then head back to the home market.
    m.hasGoal = false;
    const home = findHomeMarket(world, m);
    const distance = home
      ? Math.trunc((fpDist(m.x, m.y, home.x, home.y) >> 10) + (fpDist(destination.x, destination.y, home.x, home.y) >> 10))
      : 10;
    const gold = TRADE_BASE + TRADE_PER_TILE * Math.max(1, distance);
    const player = world.players[m.owner];
    if (player) {
      player.resources.gold += gold;
      player.stats.resourcesGathered.gold += gold;
    }

    if (home && home.id !== destination.id) {
      orderMerchant(world, m, home.id);
    } else if (home) {
      // Only our own market exists: bounce between the two ends of the route.
      m.orders.length = 0;
      const partner = findPartnerMarket(world, m);
      if (partner && partner.id !== home.id) orderMerchant(world, m, partner.id);
    }
  }
}

/** Send a merchant to a market, remembering the route. */
export function orderMerchant(world: World, merchant: Entity, marketId: number): void {
  const market = world.get(marketId);
  if (!market) return;
  merchant.orders.length = 0;
  merchant.orders.push({
    kind: OrderKind.Trade,
    target: marketId,
    x: market.x,
    y: market.y,
    defId: 0,
    issued: world.tick,
    aux: merchant.owner,
  });
  setDestination(world, merchant, market.x, market.y, true);
}

/** Our own market (the trade route's home end). */
export function findHomeMarket(world: World, m: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building || b.def !== 'market') continue;
    if (b.owner !== m.owner) continue;
    if (b.construction < 1000) continue;
    const d = fpDist(m.x, m.y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** The other end of the route: another player's market, or a second one of ours. */
export function findPartnerMarket(world: World, m: Entity): Entity | null {
  const home = findHomeMarket(world, m);
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building || b.def !== 'market') continue;
    if (b.construction < 1000) continue;
    if (home && b.id === home.id) continue;
    const d = fpDist(m.x, m.y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}
