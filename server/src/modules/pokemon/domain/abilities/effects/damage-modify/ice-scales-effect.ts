import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * こおりのりんぷん（Ice Scales）特性の効果
 * 特殊技で受けるダメージを半減する
 */
export class IceScalesEffect implements IAbilityEffect {
  private static readonly DAMAGE_DIVISOR = 2;

  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (battleContext?.moveCategory !== 'Special') {
      return damage;
    }
    return Math.floor(damage / IceScalesEffect.DAMAGE_DIVISOR);
  }
}
