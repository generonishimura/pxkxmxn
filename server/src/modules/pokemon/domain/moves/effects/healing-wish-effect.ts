import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * いやしのねがい（Healing Wish）技の効果
 *
 * 自分がひんしになり、次に自分の陣営に出てきたポケモンの HP と状態異常を回復する。
 * 陣営に healingWish を書き、出てきたときの回復はエンジン（EntryEffectProcessor）が行う。
 * 回復するところがないポケモンが出てきたときは、使わずに残す（第 8 世代から）。
 * 控えがいなければ失敗する（ひんしにならない）
 */
export class HealingWishEffect implements IMoveEffect {
  /**
   * ひんし状態のHP値
   */
  private static readonly FAINTED_HP = 0;

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
      healingWish: 'healingWish',
    });
    await repository.updateBattlePokemonStatus(attacker.id, {
      currentHp: HealingWishEffect.FAINTED_HP,
    });

    return 'The user fainted! Its replacement will be healed!';
  }
}
