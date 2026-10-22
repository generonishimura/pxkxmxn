import { ChargeTurnConfig, IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import {
  GULP_MISSILE_ABILITY_NAME,
  changeToGulpMissileForm,
} from '../../abilities/effects/other/gulp-missile-effect';

/**
 * ダイビング（Dive）技の効果
 * 1 ターン目に水中にもぐり（隠れる）、2 ターン目に攻撃する（ためる・隠れるのはエンジンが MoveBehaviors で行う）
 *
 * - もぐるとき（1 ターン目）、使用者の特性がうのミサイルなら、ウッウがエサをくわえる
 *   （HP が半分より多ければうのみのすがた、半分以下ならまるのみのすがた。本家の Dive の onTryMove）
 * - 特性は使用者の実効の特性（battleContext.attackerAbilityName）で判定する。へんしん中・特性が消されているときは変えない
 */
export class DiveEffect implements IMoveEffect {
  readonly chargeTurn: Required<Pick<ChargeTurnConfig, 'onCharge'>> = {
    onCharge: async (
      attacker: BattlePokemonStatus,
      _defender: BattlePokemonStatus,
      battleContext: BattleContext,
    ): Promise<string | null> => {
      if (battleContext.attackerAbilityName === GULP_MISSILE_ABILITY_NAME) {
        await changeToGulpMissileForm(attacker, battleContext);
      }
      return null;
    },
  };
}
