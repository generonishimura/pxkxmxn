import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { setWeather } from '../../battle-events/field-state';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * さむいギャグ（Chilly Reception）技の効果
 *
 * 天候をゆきにして（5 ターン）、控えと交代する（selfSwitch。交代はエンジン）。
 * すでに同じ天候・ゲンシ天候の間で天候を変えられなくても、控えがいれば交代する。
 * 天候を変えられず、控えもいなければ失敗する（本家は天候と交代のどちらかができれば成功）
 * 注: エンジンの天候にゆきがないので、あられ（Weather.Hail）で代用する（ゆきげしきと同じ）
 */
export class ChillyReceptionEffect implements IMoveEffect {
  readonly selfSwitch = true;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    if (await setWeather(battleContext, Weather.Hail)) {
      return 'It started to snow!';
    }
    return (await hasSwitchTarget(battleContext, attacker.trainerId)) ? null : 'But it failed';
  }
}
