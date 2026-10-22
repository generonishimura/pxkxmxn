import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { isContactMove } from '../../../moves/move-flags';

/**
 * もふもふ（Fluffy）特性の効果
 * 接触技のダメージ半減、ほのおタイプのダメージ2倍
 *
 * - 接触の判定は技フラグ（えんかくなどの補正後）で行う
 * - ほのおタイプの接触技は、2倍と半減が打ち消し合って等倍になる
 */
export class FluffyEffect implements IAbilityEffect {
  /**
   * 接触技のダメージ倍率
   */
  private static readonly CONTACT_MOVE_DAMAGE_MULTIPLIER = 0.5;

  /**
   * ほのおタイプのダメージ倍率
   */
  private static readonly FIRE_TYPE_DAMAGE_MULTIPLIER = 2.0;

  /**
   * ダメージを受けるときに発動
   * 接触技の場合は半減、ほのおタイプの場合は2倍（両方なら等倍）
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (!battleContext) {
      return damage;
    }

    let multiplier = 1;
    if (battleContext.moveTypeName === 'ほのお') {
      multiplier *= FluffyEffect.FIRE_TYPE_DAMAGE_MULTIPLIER;
    }
    if (isContactMove(battleContext)) {
      multiplier *= FluffyEffect.CONTACT_MOVE_DAMAGE_MULTIPLIER;
    }

    if (multiplier === 1) {
      return damage;
    }
    return Math.floor(damage * multiplier);
  }
}
