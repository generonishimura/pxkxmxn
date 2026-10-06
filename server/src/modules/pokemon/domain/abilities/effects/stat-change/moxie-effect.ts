import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * じしんかじょう（Moxie）特性の効果
 * 自分の技で相手をひんしにしたとき、攻撃を1段階上げる
 *
 * - ランクの変化は applyStatChanges で行う（たんじゅん・あまのじゃくなどの影響を受ける）
 * 注: 反動・状態異常・さめはだなど、技以外で相手がひんしになったときは発動しない（onKnockOut の仕様）
 */
export class MoxieEffect implements IAbilityEffect {
  async onKnockOut(
    holder: BattlePokemonStatus,
    _fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'attack', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'じしんかじょう' } },
    );
    return joinStatChangeMessages(result);
  }
}
