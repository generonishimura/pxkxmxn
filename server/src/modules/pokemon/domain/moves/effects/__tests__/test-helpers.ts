import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../../entities/move.entity';
import { Type } from '../../../entities/type.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用のヘルパー関数
 * 連続攻撃技のテストで使用する共通のセットアップ関数
 */

/**
 * BattlePokemonStatusを作成するヘルパー関数
 */
export const createBattlePokemonStatus = (
  overrides?: Partial<BattlePokemonStatus>,
): BattlePokemonStatus => {
  return {
    id: overrides?.id ?? 1,
    battleId: overrides?.battleId ?? 1,
    trainedPokemonId: overrides?.trainedPokemonId ?? 1,
    trainerId: overrides?.trainerId ?? 1,
    isActive: overrides?.isActive ?? true,
    currentHp: overrides?.currentHp ?? 100,
    maxHp: overrides?.maxHp ?? 100,
    attackRank: overrides?.attackRank ?? 0,
    defenseRank: overrides?.defenseRank ?? 0,
    specialAttackRank: overrides?.specialAttackRank ?? 0,
    specialDefenseRank: overrides?.specialDefenseRank ?? 0,
    speedRank: overrides?.speedRank ?? 0,
    accuracyRank: overrides?.accuracyRank ?? 0,
    evasionRank: overrides?.evasionRank ?? 0,
    statusCondition: overrides?.statusCondition ?? null,
  } as BattlePokemonStatus;
};

/**
 * BattleContextを作成するヘルパー関数
 */
export const createBattleContext = (overrides?: Partial<BattleContext>): BattleContext => {
  return {
    battle: {
      id: overrides?.battle?.id ?? 1,
      trainer1Id: overrides?.battle?.trainer1Id ?? 1,
      trainer2Id: overrides?.battle?.trainer2Id ?? 2,
      team1Id: overrides?.battle?.team1Id ?? 1,
      team2Id: overrides?.battle?.team2Id ?? 2,
      turn: overrides?.battle?.turn ?? 1,
      weather: overrides?.battle?.weather ?? null,
      field: overrides?.battle?.field ?? null,
      status: overrides?.battle?.status ?? BattleStatus.Active,
      winnerTrainerId: overrides?.battle?.winnerTrainerId ?? null,
    } as Battle,
    battleRepository: overrides?.battleRepository,
  };
};

/**
 * Moveを作成するヘルパー関数
 */
export const createMove = (
  name: string,
  nameEn: string,
  type: Type,
  category: MoveCategory,
  overrides?: Partial<Move>,
): Move => {
  return {
    id: overrides?.id ?? 1,
    name,
    nameEn,
    type,
    category,
    power: overrides?.power ?? 25,
    accuracy: overrides?.accuracy ?? 80,
    pp: overrides?.pp ?? 15,
    priority: overrides?.priority ?? 0,
    description: overrides?.description ?? null,
  } as Move;
};
