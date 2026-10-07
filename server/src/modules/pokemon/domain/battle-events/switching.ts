import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { PendingChoiceReason } from '@/modules/battle/domain/state/side-state';
import {
  countFaintedAllies as countFaintedAlliesIn,
  findFaintedPartyMembers,
  findSwitchTargets,
} from '@/modules/battle/domain/logic/party';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * 交代・復活についての補助関数（技・特性から使う）
 * 交代そのものはエンジン（ExecuteTurnUseCase）が、行動のすぐあとに行う
 */

const statusesOf = async (battleContext: BattleContext): Promise<BattlePokemonStatus[]> =>
  (await battleContext.battleRepository?.findBattlePokemonStatusByBattleId(
    battleContext.battle.id,
  )) ?? [];

/**
 * トレーナーに交代先（控えにいて、ひんしでないポケモン）がいるか（テレポート・いやしのねがい・バトンタッチの失敗判定）
 */
export const hasSwitchTarget = async (
  battleContext: BattleContext,
  trainerId: number,
): Promise<boolean> => findSwitchTargets(await statusesOf(battleContext), trainerId).length > 0;

/**
 * トレーナーに、ひんしの手持ち（さいきのいのりで復活させられるポケモン）がいるか
 */
export const hasFaintedPartyMember = async (
  battleContext: BattleContext,
  trainerId: number,
): Promise<boolean> =>
  findFaintedPartyMembers(await statusesOf(battleContext), trainerId).length > 0;

/**
 * 自分以外の手持ちがひんしになった延べ数（そうだいしょう。復活しても減らない）
 * ダメージ技の中では battleContext.attackerFaintedAllyCount に同じ値が入っている
 */
export const countFaintedAllies = async (
  battleContext: BattleContext,
  holder: BattlePokemonStatus,
): Promise<number> => countFaintedAlliesIn(await statusesOf(battleContext), holder);

/**
 * トレーナーに、交代先（復活させるポケモン）を選んでもらう（pendingChoice を書く）
 * - pivot・batonPass・shedTail・emergencyExit: 行動のすぐあとに、エンジンが場のポケモンを控えと交代させる
 *   （batonPass は一時的な状態と能力ランク、shedTail はみがわりを引き継ぐ）
 * - revivalBlessing: エンジンが、ひんしの手持ちを最大 HP の半分で復活させる（場には出さない）
 * 注: 交代先を選ぶ API はまだないので、エンジンは ID の順で最初の候補を選ぶ
 * 技は selfSwitch プロパティを使えば、これを呼ばなくてよい
 */
export const requestSwitch = async (
  battleContext: BattleContext,
  trainerId: number,
  reason: PendingChoiceReason,
): Promise<void> => {
  await battleContext.battleRepository?.patchSideConditions(battleContext.battle.id, trainerId, {
    pendingChoice: { reason },
  });
};

/**
 * トレーナーの場のポケモンを、行動のすぐあとに控えとランダムに入れ替える（forcedSwitch を書く）
 * ねをはる・きゅうばんなどの判定はしない（技は forceSwitch プロパティを使えば、エンジンが判定する）
 */
export const requestForcedSwitch = async (
  battleContext: BattleContext,
  trainerId: number,
): Promise<void> => {
  await battleContext.battleRepository?.patchSideConditions(battleContext.battle.id, trainerId, {
    forcedSwitch: true,
  });
};
