import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * かたいツメ（Tough Claws）特性の効果
 * 接触技（技フラグ contact）の威力を1.3倍（5325/4096）にする
 *
 * 物理技かどうかではなく技フラグで判定するので、接触する特殊技（ドレインキッスなど）にも掛かり、
 * 接触しない物理技（じしんなど）には掛からない
 */
export class ToughClawsEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で1.3倍）
   */
  private static readonly POWER_MODIFIER = 5325;

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has('contact') !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, ToughClawsEffect.POWER_MODIFIER);
  }
}
