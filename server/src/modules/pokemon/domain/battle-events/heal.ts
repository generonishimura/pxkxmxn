import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * かいふくふうじで回復できないか
 */
export const isHealBlocked = (pokemon: BattlePokemonStatus): boolean =>
  pokemon.volatileState.healBlockTurns !== undefined;

/**
 * HP を回復する（アクアリング・ねをはる・ねがいごと・ポイズンヒール・あめうけざらなど）
 *
 * - かいふくふうじ中（volatileState.healBlockTurns がある）なら回復しない
 * - ひんしのポケモンは回復しない。最大 HP を超えて回復しない
 * - 端数処理は呼ぶ側で行う（本家は最大 HP の割合を切り捨て、最低 1）
 *
 * @param target 回復するポケモン（最新の状態を渡す）
 * @param amount 回復する量
 * @returns 実際に回復した HP
 */
export const applyHeal = async (
  target: BattlePokemonStatus,
  amount: number,
  battleContext: BattleContext,
): Promise<number> => {
  if (!battleContext.battleRepository || amount <= 0) {
    return 0;
  }
  if (target.currentHp <= 0 || isHealBlocked(target)) {
    return 0;
  }
  const newHp = Math.min(target.maxHp, target.currentHp + amount);
  if (newHp === target.currentHp) {
    return 0;
  }
  await battleContext.battleRepository.updateBattlePokemonStatus(target.id, { currentHp: newHp });
  return newHp - target.currentHp;
};

/**
 * 最大 HP の 1/divisor（切り捨て、最低 1）を求める（本家の this.damage / this.heal と同じ丸め）
 */
export const fractionOfMaxHp = (pokemon: BattlePokemonStatus, divisor: number): number =>
  Math.max(1, Math.floor(pokemon.maxHp / divisor));
