import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ちからもち（Huge Power）特性の効果
 * 物理攻撃の威力を2倍にする
 */
export class HugePowerEffect implements IAbilityEffect {
  /**
   * 物理攻撃の威力倍率
   */
  private static readonly PHYSICAL_DAMAGE_MULTIPLIER = 2.0;

  /**
   * ダメージを与えるときに発動
   * 物理攻撃の場合、ダメージを2倍にする
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    // 技のカテゴリ情報がない場合は修正しない
    if (!battleContext?.moveCategory) {
      return undefined;
    }

    // 物理攻撃の場合のみダメージを2倍にする
    if (battleContext.moveCategory === 'Physical') {
      return Math.floor(damage * HugePowerEffect.PHYSICAL_DAMAGE_MULTIPLIER);
    }

    // 物理攻撃でない場合は修正しない
    return undefined;
  }
}
