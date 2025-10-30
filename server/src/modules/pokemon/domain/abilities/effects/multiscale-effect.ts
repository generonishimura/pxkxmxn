import { IAbilityEffect } from '../ability-effect.interface';
import { BattlePokemonStatus } from '../../../../battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../battle-context.interface';

/**
 * 「マルチスケイル」特性の効果実装
 *
 * 効果: HPが満タンの時、受けるダメージが半減する
 */
export class MultiscaleEffect implements IAbilityEffect {
  /**
   * ダメージを受けるときに発動
   * HPが満タンの場合、ダメージを半減する
   */
  modifyDamage(
    pokemon: BattlePokemonStatus,
    _damage: number,
    _battleContext?: BattleContext,
  ): number {
    // HPが満タンの場合、ダメージを半減
    if (pokemon.currentHp >= pokemon.maxHp) {
      return Math.floor(_damage / 2);
    }

    // HPが満タンでない場合はダメージを変更しない
    return _damage;
  }
}

