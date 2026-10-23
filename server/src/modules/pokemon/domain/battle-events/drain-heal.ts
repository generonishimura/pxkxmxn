import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';
import { applyIndirectDamage } from './indirect-damage';
import { isHealBlocked } from './heal';
// 素早さ・場の状態・交代の持ち物（Issue #264 一部）
import { resolveDrainHealAmount } from './item-lookup';

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
 * - 回復する側がひんし・かいふくふうじ中なら回復しない。最大HPを超えて回復しない
 * - 回復する量は、回復する側の持ち物の modifyDrainHeal で変わる（おおきなねっこで 1.3 倍。ヘドロえきのダメージも変わる）
 *
 * @param healer 回復するポケモン（最新の状態を渡す）
 * @param drainedFrom HPを吸い取られたポケモン
 * @param baseAmount 回復する量（calculateDrainAmount などで求める。持ち物の補正の前）
 */
export const applyDrainHeal = async (
  healer: BattlePokemonStatus,
  drainedFrom: BattlePokemonStatus,
  baseAmount: number,
  battleContext: BattleContext,
): Promise<DrainHealResult> => {
  if (!battleContext.battleRepository || baseAmount <= 0 || healer.currentHp <= 0) {
    return { healed: 0, damaged: 0 };
  }
  const amount = resolveDrainHealAmount(healer, baseAmount);

  const drainedAbility = await getAbilityEffect(
    await resolveAbilityName(drainedFrom, battleContext),
  );
  if (drainedAbility?.reversesDrainHeal === true) {
    const damaged = await applyIndirectDamage(healer, amount, battleContext);
    return { healed: 0, damaged };
  }

  if (isHealBlocked(healer)) {
    return { healed: 0, damaged: 0 };
  }
  const newHp = Math.min(healer.maxHp, healer.currentHp + amount);
  if (newHp === healer.currentHp) {
    return { healed: 0, damaged: 0 };
  }
  await battleContext.battleRepository.updateBattlePokemonStatus(healer.id, { currentHp: newHp });
  return { healed: newHp - healer.currentHp, damaged: 0 };
};
