import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlags } from '../../../moves/move-flags';

/**
 * 場全体を対象にする技のうち、優先度を止める特性で止まる技（DB の name）
 * 本家（Pokemon Showdown）の targetAllExceptions と同じ
 */
const BLOCKABLE_FIELD_MOVE_NAMES: ReadonlySet<string> = new Set([
  'ほろびのうた', // Perish Song
  'フラワーガード', // Flower Shield
  'たがやす', // Rototiller
]);

/**
 * 相手の優先度が1以上の技を失敗させる特性の基底クラス
 * じょおうのいげん（Queenly Majesty）、ビビッドボディ（Dazzling）、テイルアーマー（Armor Tail）で使う
 *
 * - 優先度は battleContext.effectivePriority（いたずらごころなどの modifyPriority を反映した値）で判定する
 * - 自分・味方の場・相手の場を対象にする技（まもる、まきびしなど）は止めない
 * - 場全体の技は ほろびのうた・フラワーガード・たがやす だけ止める（本家と同じ）
 * - 相手のかたやぶりでは無視される（エンジンが防御側の特性を無視する）
 */
export abstract class BasePriorityMoveBlockEffect implements IAbilityEffect {
  preventsMove(
    _holder: BattlePokemonStatus,
    role: 'attacker' | 'defender',
    battleContext?: BattleContext,
  ): boolean {
    if (role !== 'defender' || !battleContext?.moveName) {
      return false;
    }
    const moveName = battleContext.moveName;
    const targetsHolder =
      MoveFlags.targetsOpponent(moveName) || BLOCKABLE_FIELD_MOVE_NAMES.has(moveName);
    return targetsHolder && (battleContext.effectivePriority ?? 0) > 0;
  }
}
