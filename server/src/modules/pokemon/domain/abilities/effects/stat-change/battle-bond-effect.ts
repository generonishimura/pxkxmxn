import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { hasSwitchTarget } from '../../../battle-events/switching';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';
import { isSpecies } from '../base/is-species';

/**
 * ゲッコウガの全国図鑑の番号
 */
const GRENINJA_NATIONAL_DEX = 658;

/**
 * きずなへんげ（Battle Bond）特性の効果
 * ゲッコウガが自分の技で相手をひんしにしたとき、攻撃・特攻・素早さを1段階ずつ上げる（第 9 世代の効果）
 *
 * - 1 バトルに 1 回だけ（persistentState.oncePerBattleAbilityUsed。交代しても戻らない）
 * - 相手にまだ戦えるポケモンが残っているときだけ発動する（本家の foePokemonLeft）
 * - へんしん中・ゲッコウガでないときは発動しない
 * - ランクの変化は applyStatChanges で行う（たんじゅん・あまのじゃくなどの影響を受ける）
 * 注: 第 9 世代と同じく、サトシゲッコウガへのフォルムチェンジはしない
 */
export class BattleBondEffect implements IAbilityEffect {
  async onKnockOut(
    holder: BattlePokemonStatus,
    fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext?.battleRepository ||
      holder.persistentState.oncePerBattleAbilityUsed === true ||
      holder.currentHp <= 0 ||
      holder.volatileState.transformedIntoStatusId !== undefined ||
      !(await isSpecies(holder, GRENINJA_NATIONAL_DEX, battleContext)) ||
      !(await hasSwitchTarget(battleContext, fainted.trainerId))
    ) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [
        { statType: 'attack', rankChange: 1 },
        { statType: 'specialAttack', rankChange: 1 },
        { statType: 'speed', rankChange: 1 },
      ],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'きずなへんげ' } },
    );
    await battleContext.battleRepository.patchPersistentState(holder.id, {
      oncePerBattleAbilityUsed: true,
    });
    return joinStatChangeMessages(result);
  }
}
