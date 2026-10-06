import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';

/**
 * 技以外のダメージ（間接ダメージ）を受けない特性を持つかを判定する（マジックガード）
 * 特性の preventsIndirectDamage を見る。かたやぶりでは無視されない
 */
export const isIndirectDamagePrevented = async (
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  const abilityEffect = await getAbilityEffect(await resolveAbilityName(target, battleContext));
  return abilityEffect?.preventsIndirectDamage === true;
};

/**
 * 技以外のダメージを与える
 * 状態異常・反動・外したときの自傷・接触時の特性（さめはだ）・ヘドロえきなどのHPの減少はこれを使う
 *
 * - 対象が preventsIndirectDamage の特性（マジックガード）を持つ場合は減らさない
 * - target の HP から減らし、0未満にしない。ひんしのポケモンには与えない
 *
 * @param target ダメージを受けるポケモン（最新の状態を渡す）
 * @param amount 減らすHP（端数処理は呼ぶ側で行う）
 * @returns 実際に減らしたHP（減らさなかった場合は0）
 */
export const applyIndirectDamage = async (
  target: BattlePokemonStatus,
  amount: number,
  battleContext: BattleContext,
): Promise<number> => {
  if (!battleContext.battleRepository || amount <= 0) {
    return 0;
  }
  if (target.currentHp <= 0 || (await isIndirectDamagePrevented(target, battleContext))) {
    return 0;
  }

  const newHp = Math.max(0, target.currentHp - amount);
  await battleContext.battleRepository.updateBattlePokemonStatus(target.id, { currentHp: newHp });
  return target.currentHp - newHp;
};
