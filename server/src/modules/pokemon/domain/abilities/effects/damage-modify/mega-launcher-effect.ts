import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * メガランチャー（Mega Launcher）特性の効果
 * はどう技（技フラグ pulse。はどうだん・りゅうのはどう・あくのはどう など）の威力を1.5倍（6144/4096）にする
 *
 * 注: いやしのはどうの回復量を3/4にする効果は、回復量を変えるフックがないため実装していない
 */
export class MegaLauncherEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で1.5倍）
   */
  private static readonly POWER_MODIFIER = 6144;

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has('pulse') !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, MegaLauncherEffect.POWER_MODIFIER);
  }
}
