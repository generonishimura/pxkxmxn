import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';
import { applyIndirectDamage } from './indirect-damage';

/**
 * 吸収技の回復の結果
 */
export interface DrainHealResult {
  /** 実際に回復したHP */
  readonly healed: number;
  /** 回復のかわりに受けたダメージ（ヘドロえき） */
  readonly damaged: number;
}

/**
 * 吸収技で回復する量を求める（第5世代以降の本家と同じ）
 * 与えたダメージ × 割合を四捨五入する。与えたダメージが1以上なら最低1
 * @param damage 実際に減らしたHP
 * @param ratio 回復の割合（すいとる・ゆめくいは 0.5、ドレインキッスは 0.75）
 */
export const calculateDrainAmount = (damage: number, ratio: number): number =>
  damage > 0 ? Math.max(1, Math.round(damage * ratio)) : 0;

/**
 * HPを吸い取って回復する（すいとる、ギガドレイン、ゆめくい、やどりぎのタネ、ちからをすいとる）
 *
 * - 吸い取られた側が reversesDrainHeal の特性（ヘドロえき）なら、回復せずに同じ量のダメージを受ける。
 *   このダメージは applyIndirectDamage で与えるため、マジックガードで防がれる
 * - ヘドロえきはかたやぶりでは無視されない
 * - 回復する側がひんしなら何もしない。最大HPを超えて回復しない
 *
 * @param healer 回復するポケモン（最新の状態を渡す）
 * @param drainedFrom HPを吸い取られたポケモン
 * @param amount 回復する量（calculateDrainAmount などで求める）
 */
export const applyDrainHeal = async (
  healer: BattlePokemonStatus,
  drainedFrom: BattlePokemonStatus,
  amount: number,
  battleContext: BattleContext,
): Promise<DrainHealResult> => {
  if (!battleContext.battleRepository || amount <= 0 || healer.currentHp <= 0) {
    return { healed: 0, damaged: 0 };
  }

  const drainedAbility = await getAbilityEffect(
    await resolveAbilityName(drainedFrom, battleContext),
  );
  if (drainedAbility?.reversesDrainHeal === true) {
    const damaged = await applyIndirectDamage(healer, amount, battleContext);
    return { healed: 0, damaged };
  }

  const newHp = Math.min(healer.maxHp, healer.currentHp + amount);
  if (newHp === healer.currentHp) {
    return { healed: 0, damaged: 0 };
  }
  await battleContext.battleRepository.updateBattlePokemonStatus(healer.id, { currentHp: newHp });
  return { healed: newHp - healer.currentHp, damaged: 0 };
};
