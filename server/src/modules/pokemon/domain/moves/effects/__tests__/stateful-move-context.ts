import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattleContext, BattleStatValues } from '../../../abilities/battle-context.interface';

/**
 * 一時的な状態を読み書きする技のテスト用の部品
 * リポジトリは書いた値を覚え、findBattlePokemonStatusById で最新の状態を返す
 */

/**
 * テスト用のポケモンの状態
 */
export interface StatusSeed {
  readonly id: number;
  readonly trainerId?: number;
  readonly currentHp?: number;
  readonly defenseRank?: number;
  readonly specialDefenseRank?: number;
  readonly speedRank?: number;
  readonly statusCondition?: StatusCondition | null;
  readonly volatileState?: VolatileState;
}

/**
 * テスト用のポケモンの状態を作る（trainedPokemonId は id と同じ）
 */
export const createStatus = (seed: StatusSeed): BattlePokemonStatus =>
  new BattlePokemonStatus(
    seed.id,
    1,
    seed.id,
    seed.trainerId ?? seed.id,
    true,
    seed.currentHp ?? 100,
    100,
    0,
    seed.defenseRank ?? 0,
    0,
    seed.specialDefenseRank ?? 0,
    seed.speedRank ?? 0,
    0,
    0,
    seed.statusCondition ?? null,
    seed.volatileState ?? {},
  );

/**
 * 状態を覚えるコンテキストを作るときの設定
 */
export interface StatefulMoveContextOptions {
  readonly attacker: BattlePokemonStatus;
  readonly defender: BattlePokemonStatus;
  /** 育成ポケモンの ID（= ポケモンの状態の ID）ごとのタイプ名 */
  readonly typesById?: Readonly<Record<number, readonly string[]>>;
  /** 攻撃側の実数値（上書きを反映した値） */
  readonly attackerStats?: BattleStatValues;
  readonly moveName?: string;
}

/**
 * 状態を覚えるコンテキスト
 */
export interface StatefulMoveContext {
  readonly ctx: BattleContext;
  /** リポジトリに書かれた最新の状態 */
  readonly latest: (id: number) => BattlePokemonStatus;
}

const withChanges = (
  status: BattlePokemonStatus,
  changes: Partial<BattlePokemonStatus>,
): BattlePokemonStatus => {
  const merged = { ...status, ...changes };
  return new BattlePokemonStatus(
    merged.id,
    merged.battleId,
    merged.trainedPokemonId,
    merged.trainerId,
    merged.isActive,
    merged.currentHp,
    merged.maxHp,
    merged.attackRank,
    merged.defenseRank,
    merged.specialAttackRank,
    merged.specialDefenseRank,
    merged.speedRank,
    merged.accuracyRank,
    merged.evasionRank,
    merged.statusCondition,
    merged.volatileState,
    merged.persistentState,
  );
};

const applyPatch = (state: VolatileState, patch: StatePatch<VolatileState>): VolatileState => {
  const next: Record<string, unknown> = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next as VolatileState;
};

/**
 * 書いた値を覚えるリポジトリを持つコンテキストを作る
 */
export const createStatefulMoveContext = (
  options: StatefulMoveContextOptions,
): StatefulMoveContext => {
  const statuses = new Map<number, BattlePokemonStatus>([
    [options.attacker.id, options.attacker],
    [options.defender.id, options.defender],
  ]);
  const get = (id: number): BattlePokemonStatus => {
    const status = statuses.get(id);
    if (!status) {
      throw new Error(`status ${id} not found`);
    }
    return status;
  };

  const battleRepository = {
    findBattlePokemonStatusById: jest.fn(async (id: number) => statuses.get(id) ?? null),
    updateBattlePokemonStatus: jest.fn(
      async (id: number, changes: Partial<BattlePokemonStatus>) => {
        const updated = withChanges(get(id), changes);
        statuses.set(id, updated);
        return updated;
      },
    ),
    patchVolatileState: jest.fn(async (id: number, patch: StatePatch<VolatileState>) => {
      const current = get(id);
      const updated = withChanges(current, {
        volatileState: applyPatch(current.volatileState, patch),
      });
      statuses.set(id, updated);
      return updated;
    }),
  };

  const trainedPokemonRepository = {
    findById: jest.fn(async (id: number) => {
      const [primary, secondary] = options.typesById?.[id] ?? ['ノーマル'];
      return {
        id,
        ability: null,
        pokemon: {
          primaryType: { name: primary },
          secondaryType: secondary ? { name: secondary } : null,
        },
      };
    }),
  };

  const ctx: BattleContext = {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: battleRepository as unknown as IBattleRepository,
    trainedPokemonRepository: trainedPokemonRepository as unknown as ITrainedPokemonRepository,
    attacker: options.attacker,
    defender: options.defender,
    attackerStats: options.attackerStats,
    moveName: options.moveName,
    moveCategory: 'Status',
  };
  return { ctx, latest: get };
};
