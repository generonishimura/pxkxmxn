import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TrapTarget } from '../../../battle-events/switching';

const SHADOW_TAG_ABILITY_NAME = 'かげふみ';

/**
 * かげふみ（Shadow Tag）特性の効果
 * 相手を逃げられなくする（交代を選べない）
 *
 * - 相手もかげふみなら逃げられる（相手の特性が消されている（いえき）ときは逃げられない）
 * - ゴーストタイプ・持ち主がひんし・持ち主の特性が消されているときの判定はエンジンが行う
 * - とんぼがえり・ほえるなどの技・特性による交代は止めない（エンジンが判定する）
 */
export class ShadowTagEffect implements IAbilityEffect {
  trapsOpponent(_holder: BattlePokemonStatus, target: TrapTarget): boolean {
    const targetHasShadowTag =
      target.abilityName === SHADOW_TAG_ABILITY_NAME &&
      target.pokemon.volatileState.abilitySuppressed !== true;
    return !targetHasShadowTag;
  }
}
