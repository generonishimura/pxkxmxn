import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * でんきだま（Light Ball）
 * ピカチュウが持つと、攻撃と特攻が 2 倍になる（本家の onModifyAtk / onModifySpA の chainModify(2)）
 *
 * ピカチュウかどうかは、技の使用者のもとの全国図鑑の番号（battleContext.attackerNationalDex）で判定する
 * 注: 攻撃・特攻の実数値に掛ける補正のフックがないので、ちからもちと同じく、与えるダメージを 2 倍にする
 *   （端数の丸めが本家と少し違う。ボディプレス・イカサマでも 2 倍になる）
 */
export class LightBallEffect implements IItemEffect {
  /**
   * ピカチュウの全国図鑑の番号
   */
  private static readonly PIKACHU_NATIONAL_DEX = 25;

  private static readonly DAMAGE_MULTIPLIER = 2;

  modifyDamageDealt(
    _holder: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.attackerNationalDex !== LightBallEffect.PIKACHU_NATIONAL_DEX) {
      return undefined;
    }
    if (battleContext.moveCategory !== 'Physical' && battleContext.moveCategory !== 'Special') {
      return undefined;
    }
    return damage * LightBallEffect.DAMAGE_MULTIPLIER;
  }
}
