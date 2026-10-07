import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { MoveSlotOverride } from '@/modules/battle/domain/state/volatile-state';
import { resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import {
  abilityHolderOf,
  battleStatsOf,
  battleTypeNamesOf,
} from '@/modules/battle/domain/logic/battle-pokemon-traits';
import { currentAbilityName } from '@/modules/battle/domain/logic/effective-traits';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect } from './ability-lookup';
import { resolveBattleAbilityName } from './battle-traits';

/** へんしんで写した技の PP の上限（第 5 世代から） */
const TRANSFORMED_MOVE_PP = 5;

/**
 * 能力ランクの列（へんしんで写す）
 */
const RANK_KEYS = [
  'attackRank',
  'defenseRank',
  'specialAttackRank',
  'specialDefenseRank',
  'speedRank',
  'accuracyRank',
  'evasionRank',
] as const satisfies ReadonlyArray<keyof BattlePokemonStatus>;

/**
 * 相手の姿を写す（本家の transformInto）。へんしん・かわりもの が使う
 *
 * 使用者の volatileState に書くもの（交代で消える）:
 * - transformedIntoStatusId: 写した相手
 * - typeOverride: 相手のタイプ（はねやすめで失ったひこうタイプも写す。3 つめのタイプは addedType に写す）
 * - statOverrides: 相手のランク補正の前の実数値（HP を除く。フォルム・パワートリックなどの上書きも写す）
 * - abilityOverride: 相手の今の特性（いえきで消されていても、もとの特性を写す）
 * - moveSlotOverrides: 相手の技の欄（PP と最大 PP は 5。もとの PP が 5 未満ならその値）。へんしん中は、この欄だけを使う
 * - critStageBoost・laserFocusTurns: 相手のきあいだめ・とぎすますを写す（使用者の分は消す）
 * 能力ランク（attackRank など 7 つ）も相手と同じにする。写した特性が効いていれば onEntry を呼ぶ（いかくなど）
 *
 * 次のときは写さずに false を返す（本家と同じ）:
 * どちらかがひんし・どちらかがへんしん中・相手がみがわり中・どちらかがイリュージョンで化けている
 * 注: 重さ・性別は写さない（重さのデータがない）。テラスタルは扱わない
 */
export const transformInto = async (
  user: BattlePokemonStatus,
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (
    !repository ||
    user.id === target.id ||
    user.currentHp <= 0 ||
    target.currentHp <= 0 ||
    user.volatileState.transformedIntoStatusId !== undefined ||
    target.volatileState.transformedIntoStatusId !== undefined ||
    target.volatileState.substituteHp !== undefined ||
    user.volatileState.illusionStatusId !== undefined ||
    target.volatileState.illusionStatusId !== undefined
  ) {
    return false;
  }
  const targetTrainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    target.trainedPokemonId,
  );
  if (!targetTrainedPokemon) {
    return false;
  }

  const abilityName = currentAbilityName(
    abilityHolderOf({ trainedPokemon: targetTrainedPokemon, status: target }),
  );
  const targetMoves =
    (await repository.findBattlePokemonMovesByBattlePokemonStatusId(target.id)) ?? [];
  const moveSlotOverrides: MoveSlotOverride[] = resolveMoveSlots(
    targetMoves,
    target.volatileState,
  ).map(slot => {
    const pp = Math.min(TRANSFORMED_MOVE_PP, slot.maxPp);
    return {
      battlePokemonMoveId: slot.battlePokemonMoveId,
      moveId: slot.moveId,
      currentPp: pp,
      maxPp: pp,
    };
  });
  const state = target.volatileState;
  await repository.patchVolatileState(user.id, {
    transformedIntoStatusId: target.id,
    typeOverride: battleTypeNamesOf(targetTrainedPokemon, target, {
      excludeAddedType: true,
      ignoreRoost: true,
    }),
    addedType: state.addedType ?? null,
    statOverrides: { ...battleStatsOf(targetTrainedPokemon, target) },
    abilityOverride: abilityName ?? null,
    moveSlotOverrides,
    critStageBoost: state.critStageBoost ?? null,
    laserFocusTurns: state.laserFocusTurns ?? null,
  });
  const ranks: Partial<Record<(typeof RANK_KEYS)[number], number>> = {};
  for (const key of RANK_KEYS) {
    ranks[key] = target[key];
  }
  const transformed = await repository.updateBattlePokemonStatus(user.id, ranks);

  // 写した特性が効いていれば始める（本家の setAbility の Start。かわりもので写したいかくが発動する）
  if (abilityName && (await resolveBattleAbilityName(transformed, battleContext)) === abilityName) {
    await (await getAbilityEffect(abilityName))?.onEntry?.(transformed, battleContext);
  }
  return true;
};
