import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * くろいてっきゅう（Iron Ball）
 * 素早さが半分になる。持っている間は地面にいる（ひこうタイプ・ふゆう・でんじふゆうでも）
 *
 * - 地面にいる判定はエンジン（isGrounded の itemName。フィールド・まきびし・ありじごくなどに効く）
 * - じめん技は、ひこうタイプ・ふゆうのポケモンにも当たる（DamageCalculator。じゅうりょくと同じ扱い）
 */
export class IronBallEffect implements IItemEffect {
  modifySpeed(_pokemon: BattlePokemonStatus, speed: number): number {
    return Math.floor(speed / 2);
  }
}
