import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TrapTarget } from '../../../battle-events/switching';

const STEEL_TYPE_NAME = 'はがね';

/**
 * じりょく（Magnet Pull）特性の効果
 * はがねタイプの相手を逃げられなくする（交代を選べない）
 *
 * - ゴーストタイプ（はがね・ゴーストを含む）・持ち主がひんし・持ち主の特性が消されているときの判定はエンジンが行う
 * - とんぼがえり・ほえるなどの技・特性による交代は止めない（エンジンが判定する）
 * 注: タイプはエンジンが渡す typeNames（種族のタイプ）で判定する。みずびたしなどで変わったタイプは反映されない
 */
export class MagnetPullEffect implements IAbilityEffect {
  trapsOpponent(_holder: BattlePokemonStatus, target: TrapTarget): boolean {
    return target.typeNames.includes(STEEL_TYPE_NAME);
  }
}
