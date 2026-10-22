import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * みかづきのまい（Lunar Dance）技の効果
 *
 * 自分がひんしになり、次に自分の陣営に出てきたポケモンの HP・状態異常・PP を回復する。
 * 陣営に healingWish: 'lunarDance' を書き、出てきたときの回復はエンジン（EntryEffectProcessor）が行う。
 * 回復するところがないポケモンが出てきたときは、使わずに残す（第 8 世代から）。
 * 控えがいなければ失敗する（ひんしにならない）
 */
export class LunarDanceEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    if (!(await hasSwitchTarget(battleContext, attacker.trainerId))) {
      return 'But it failed';
    }

    await repository.patchSideConditions(battleContext.battle.id, attacker.trainerId, {
      healingWish: 'lunarDance',
    });
    await repository.updateBattlePokemonStatus(attacker.id, { currentHp: 0 });
    return 'The user fainted! Its replacement will be healed!';
  }
}
