import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';
import { currentAbilityName } from '@/modules/battle/domain/logic/effective-traits';
import { baseAbilityNameOf } from '@/modules/battle/domain/logic/battle-pokemon-traits';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect } from './ability-lookup';
import { resolveBattleAbilityName } from './battle-traits';

/** イリュージョン（特性が変わる・消されると、化けている状態も終わる） */
const ILLUSION_ABILITY_NAME = 'イリュージョン';

/**
 * 場に出たときだけ動く特性（本家の onSwitchIn・onBeforeSwitchIn。onStart を持たない）
 * スキルスワップ・なりきり・へんしんで受け取っても、onEntry を呼ばない（受け取ったかわりものはへんしんしない）
 */
export const SWITCH_IN_ONLY_ABILITY_NAMES: readonly string[] = [
  'かわりもの',
  ILLUSION_ABILITY_NAME,
  'テラスチェンジ',
];

/**
 * 特性を書き換えた結果
 * - changed: 書き換えたか
 * - previousAbilityName: 書き換える前の今の特性名（消されているかは見ない。ミイラのメッセージなどに使う）
 */
export interface AbilityChangeResult {
  readonly changed: boolean;
  readonly previousAbilityName?: string;
}

/**
 * 今の特性名（abilityOverride → もとの特性。いえき・かがくへんかガスで消されているかは見ない。本家の pokemon.ability）
 * なりきり・スキルスワップ・うつしえで写す特性や、ミイラ・とれないにおいで上書きできるかの判定に使う
 */
export const resolveCurrentAbilityName = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string | undefined> => {
  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    pokemon.trainedPokemonId,
  );
  return currentAbilityName({
    baseAbilityName: trainedPokemon ? baseAbilityNameOf(trainedPokemon, pokemon) : undefined,
    volatileState: pokemon.volatileState,
  });
};

/**
 * 書き換えたあとの、化けている状態（イリュージョン）の片付け
 */
const illusionPatch = (
  pokemon: BattlePokemonStatus,
  previousAbilityName: string | undefined,
): StatePatch<VolatileState> =>
  previousAbilityName === ILLUSION_ABILITY_NAME &&
  pokemon.volatileState.illusionStatusId !== undefined
    ? { illusionStatusId: null }
    : {};

/**
 * 特性を書き換えたあとの片付け（本家の setAbility は特性ごとの状態 abilityState を作り直す）
 * - 化けている状態（イリュージョン）を消す
 * - へんげんじざい・リベロを使った記録（typeChangeAbilityUsed）を消す。一度失った特性を取り戻すと、また 1 回使える
 */
const abilityChangePatch = (
  pokemon: BattlePokemonStatus,
  previousAbilityName: string | undefined,
): StatePatch<VolatileState> => ({
  ...illusionPatch(pokemon, previousAbilityName),
  ...(pokemon.volatileState.typeChangeAbilityUsed !== undefined
    ? { typeChangeAbilityUsed: null }
    : {}),
});

/**
 * 書き換えたあとに、新しい特性が効いていれば（いえき・かがくへんかガスで消されていなければ）onEntry を呼ぶ
 * 本家の setAbility は新しい特性の Start を呼ぶ（スキルスワップで受け取ったいかくが発動する）
 * 場に出たときだけ動く特性（SWITCH_IN_ONLY_ABILITY_NAMES）は呼ばない（本家の Start を持たない）
 * へんしん（transformInto）も、今と同じ特性を写したときは呼ばずに、これを使う
 */
export const startAbility = async (
  pokemonId: number,
  abilityName: string,
  battleContext: BattleContext,
): Promise<void> => {
  if (SWITCH_IN_ONLY_ABILITY_NAMES.includes(abilityName)) {
    return;
  }
  const latest = await battleContext.battleRepository?.findBattlePokemonStatusById(pokemonId);
  if (!latest || latest.currentHp <= 0) {
    return;
  }
  if ((await resolveBattleAbilityName(latest, battleContext)) !== abilityName) {
    return;
  }
  await (await getAbilityEffect(abilityName))?.onEntry?.(latest, battleContext);
};

/**
 * ポケモンの特性を書き換える（本家の setAbility）。volatileState.abilityOverride を書き、新しい特性の onEntry を呼ぶ
 * なりきり・なかまづくり・なやみのタネ・シンプルビーム・うつしえ・トレース・ミイラ・とれないにおい・レシーバー が使う
 *
 * 次のときは書き換えずに { changed: false } を返す
 * - ひんし
 * - 新しい特性か今の特性が、消せない特性（cantSuppress。バトルスイッチなど）
 *
 * 技ごとの失敗（なりきりの failRolePlay、なかまづくりの noEntrain、同じ特性など）は、呼ぶ側で
 * resolveCurrentAbilityName と hasAbilityFlag を見て判定する
 * 注: 書き換える前の特性の終わり（本家の End）は呼ばない。ゲンシ天候の終わりは、エンジンが行動のあとに判定する
 */
export const setAbility = async (
  target: BattlePokemonStatus,
  abilityName: string,
  battleContext: BattleContext,
): Promise<AbilityChangeResult> => {
  if (target.currentHp <= 0 || !battleContext.battleRepository) {
    return { changed: false };
  }
  const previousAbilityName = await resolveCurrentAbilityName(target, battleContext);
  if (
    hasAbilityFlag(abilityName, 'cantSuppress') ||
    hasAbilityFlag(previousAbilityName, 'cantSuppress')
  ) {
    return { changed: false, previousAbilityName };
  }
  await battleContext.battleRepository.patchVolatileState(target.id, {
    abilityOverride: abilityName,
    ...abilityChangePatch(target, previousAbilityName),
  });
  await startAbility(target.id, abilityName, battleContext);
  return { changed: true, previousAbilityName };
};

/**
 * 2 匹の特性を入れ替える（本家の skillSwap）。どちらにも volatileState.abilityOverride を書き、新しい特性の onEntry を呼ぶ
 * スキルスワップ・さまようたましい が使う
 *
 * 次のときは入れ替えずに false を返す
 * - どちらかがひんし
 * - どちらかの今の特性が、入れ替えられない特性（failSkillSwap）
 * 第 9 世代は、同じ特性どうしでも入れ替えられる（本家と同じ）
 */
export const swapAbilities = async (
  source: BattlePokemonStatus,
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (source.currentHp <= 0 || target.currentHp <= 0 || !repository) {
    return false;
  }
  const sourceAbilityName = await resolveCurrentAbilityName(source, battleContext);
  const targetAbilityName = await resolveCurrentAbilityName(target, battleContext);
  if (
    hasAbilityFlag(sourceAbilityName, 'failSkillSwap') ||
    hasAbilityFlag(targetAbilityName, 'failSkillSwap') ||
    sourceAbilityName === undefined ||
    targetAbilityName === undefined
  ) {
    return false;
  }
  await repository.patchVolatileState(source.id, {
    abilityOverride: targetAbilityName,
    ...abilityChangePatch(source, sourceAbilityName),
  });
  await repository.patchVolatileState(target.id, {
    abilityOverride: sourceAbilityName,
    ...abilityChangePatch(target, targetAbilityName),
  });
  // 本家と同じく、相手が受け取った特性 → 使用者が受け取った特性の順に始める
  await startAbility(target.id, sourceAbilityName, battleContext);
  await startAbility(source.id, targetAbilityName, battleContext);
  return true;
};

/**
 * 特性を消す（いえき・コアパニッシャー。volatileState.abilitySuppressed を書く）
 * 次のときは消さずに false を返す: ひんし・消せない特性（cantSuppress）・すでに消されている
 * コアパニッシャーの「相手がもう行動していて、このターンに交代で出たのでもないときだけ」は呼ぶ側で判定する
 * （battleContext.defenderPendingMoveId がなく、volatileState.switchedInTurn がこのターンでない。本家の newlySwitched）
 */
export const suppressAbility = async (
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (
    target.currentHp <= 0 ||
    target.volatileState.abilitySuppressed === true ||
    !battleContext.battleRepository
  ) {
    return false;
  }
  const abilityName = await resolveCurrentAbilityName(target, battleContext);
  if (hasAbilityFlag(abilityName, 'cantSuppress')) {
    return false;
  }
  await battleContext.battleRepository.patchVolatileState(target.id, {
    abilitySuppressed: true,
    ...illusionPatch(target, abilityName),
  });
  return true;
};
