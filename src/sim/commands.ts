/**
 * Command protocol: the only way anything outside the simulation can change
 * simulation state. Both the human UI and the bots emit these.
 *
 * Commands are plain data so they can be logged, replayed and hashed. A match
 * is fully described by (seed, config, ordered command list).
 */

export const enum CommandType {
  Move = 1,
  Attack = 2,
  AttackMove = 3,
  Gather = 4,
  Build = 5,
  Repair = 6,
  Train = 7,
  Research = 8,
  CancelProduction = 9,
  SetRally = 10,
  Stop = 11,
  Hold = 12,
  Garrison = 13,
  Ungarrison = 14,
  Heal = 15,
  Convert = 16,
  Trade = 17,
  AdvanceAge = 18,
  Delete = 19,
  Patrol = 20,
  PickupRelic = 21,
  DropRelic = 22,
  ReturnCargo = 23,
  Cheat = 99,
}

export interface BaseCommand {
  type: CommandType;
  /** Player issuing the command. */
  player: number;
  /** Tick at which the command was issued (filled by the queue). */
  issued?: number;
}

export interface MoveCommand extends BaseCommand {
  type: CommandType.Move;
  units: number[];
  x: number;
  y: number;
  queue: boolean;
}

export interface AttackCommand extends BaseCommand {
  type: CommandType.Attack;
  units: number[];
  target: number;
  queue: boolean;
}

export interface AttackMoveCommand extends BaseCommand {
  type: CommandType.AttackMove;
  units: number[];
  x: number;
  y: number;
  queue: boolean;
}

export interface GatherCommand extends BaseCommand {
  type: CommandType.Gather;
  units: number[];
  target: number;
  queue: boolean;
}

export interface BuildCommand extends BaseCommand {
  type: CommandType.Build;
  units: number[];
  defId: string;
  tileX: number;
  tileY: number;
  /** Wall drag endpoints, when building a wall run. */
  endX?: number;
  endY?: number;
  queue: boolean;
}

export interface RepairCommand extends BaseCommand {
  type: CommandType.Repair;
  units: number[];
  target: number;
  queue: boolean;
}

export interface TrainCommand extends BaseCommand {
  type: CommandType.Train;
  building: number;
  defId: string;
  count: number;
}

export interface ResearchCommand extends BaseCommand {
  type: CommandType.Research;
  building: number;
  techId: string;
}

export interface CancelProductionCommand extends BaseCommand {
  type: CommandType.CancelProduction;
  building: number;
  /** Cancel by queue index, or all when omitted. */
  index?: number;
}

export interface SetRallyCommand extends BaseCommand {
  type: CommandType.SetRally;
  building: number;
  x: number;
  y: number;
  target?: number;
}

export interface StopCommand extends BaseCommand {
  type: CommandType.Stop;
  units: number[];
}

export interface HoldCommand extends BaseCommand {
  type: CommandType.Hold;
  units: number[];
}

export interface GarrisonCommand extends BaseCommand {
  type: CommandType.Garrison;
  units: number[];
  building: number;
}

export interface UngarrisonCommand extends BaseCommand {
  type: CommandType.Ungarrison;
  building: number;
}

export interface HealCommand extends BaseCommand {
  type: CommandType.Heal;
  units: number[];
  target: number;
  queue: boolean;
}

export interface ConvertCommand extends BaseCommand {
  type: CommandType.Convert;
  units: number[];
  target: number;
  queue: boolean;
}

export interface TradeCommand extends BaseCommand {
  type: CommandType.Trade;
  units: number[];
  market: number;
  queue: boolean;
}

export interface AdvanceAgeCommand extends BaseCommand {
  type: CommandType.AdvanceAge;
  /** Landmark building under construction, or already placed. */
  building: number;
  defId: string;
}

export interface DeleteCommand extends BaseCommand {
  type: CommandType.Delete;
  units: number[];
}

export interface PatrolCommand extends BaseCommand {
  type: CommandType.Patrol;
  units: number[];
  x: number;
  y: number;
}

export interface RelicCommand extends BaseCommand {
  type: CommandType.PickupRelic | CommandType.DropRelic;
  units: number[];
  target: number;
}

export interface ReturnCargoCommand extends BaseCommand {
  type: CommandType.ReturnCargo;
  units: number[];
}

export interface CheatCommand extends BaseCommand {
  type: CommandType.Cheat;
  kind: 'resources' | 'reveal' | 'spawn' | 'building';
  amount?: number;
  defId?: string;
  count?: number;
  x?: number;
  y?: number;
  /** Tile position, used by the 'building' cheat. */
  tileX?: number;
  tileY?: number;
}

export type Command =
  | MoveCommand
  | AttackCommand
  | AttackMoveCommand
  | GatherCommand
  | BuildCommand
  | RepairCommand
  | TrainCommand
  | ResearchCommand
  | CancelProductionCommand
  | SetRallyCommand
  | StopCommand
  | HoldCommand
  | GarrisonCommand
  | UngarrisonCommand
  | HealCommand
  | ConvertCommand
  | TradeCommand
  | AdvanceAgeCommand
  | DeleteCommand
  | PatrolCommand
  | RelicCommand
  | ReturnCargoCommand
  | CheatCommand;

/** Validate a command's shape before it enters the queue. */
export function isCommand(value: unknown): value is Command {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { type?: unknown; player?: unknown };
  return typeof v.type === 'number' && typeof v.player === 'number';
}
