import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * もふもふ（Fluffy）特性の効果
 * 接触技のダメージ半減、ほのおタイプのダメージ2倍
 *
 * 注意: ほのおタイプの接触技の場合は、2倍が優先される
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
   * 接触技の場合は半減、ほのおタイプの場合は2倍
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (!battleContext) {
      return damage;
    }

    // ほのおタイプの場合は2倍（優先）
    if (battleContext.moveTypeName === 'ほのお') {
      return Math.floor(damage * FluffyEffect.FIRE_TYPE_DAMAGE_MULTIPLIER);
    }

    // 接触技の場合は半減
    if (battleContext.moveCategory === 'Physical') {
      // 接触技の判定は、moveCategoryがPhysicalの場合に接触技とみなす
      // 実際のゲームでは、技ごとに接触技かどうかの判定が必要だが、
      // 現時点ではPhysical技を接触技とみなす
      return Math.floor(damage * FluffyEffect.CONTACT_MOVE_DAMAGE_MULTIPLIER);
    }

    // 条件を満たさない場合は修正しない
    return damage;
  }
}
