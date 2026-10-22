import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TrapTarget } from '../../../battle-events/switching';

/**
 * ありじごく（Arena Trap）特性の効果
 * 地面にいる相手を逃げられなくする（交代を選べない）
 *
 * - 地面にいるかはエンジンが判定する（ひこうタイプ・ふゆう・でんじふゆうは逃げられる。じゅうりょく・ねをはるなら逃げられない）
 * - ゴーストタイプ・持ち主がひんし・持ち主の特性が消されているときの判定はエンジンが行う
 * - とんぼがえり・ほえるなどの技・特性による交代は止めない（エンジンが判定する）
 */
export class ArenaTrapEffect implements IAbilityEffect {
  trapsOpponent(_holder: BattlePokemonStatus, target: TrapTarget): boolean {
    return target.grounded;
  }
}
