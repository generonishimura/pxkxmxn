import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../abilities/battle-context.interface';
import { EffectSource } from './effect-source';
import { getAbilityEffect, isIgnoredByMoldBreaker, resolveAbilityName } from './ability-lookup';
import {
  hasVolatileStatusCondition,
  isVolatileStatusCondition,
  volatileStatusConditionPatch,
} from '@/modules/battle/domain/logic/volatile-status-condition';
// 場の状態・設置技・交代の仕組み（Issue #103 #110 #135 一部）
import { isProtectedBySafeguard, isStatusPreventedByTerrain } from './field-protection';

/**
 * 状態異常ごとの、付与できないタイプ（本家と同じ）
 * ねむり・ひるみ・こんらんはタイプで防げない
 */
export const STATUS_IMMUNE_TYPES: Readonly<Record<StatusCondition, readonly string[]>> = {
  [StatusCondition.None]: [],
  [StatusCondition.Burn]: ['ほのお'],
  [StatusCondition.Freeze]: ['こおり'],
  [StatusCondition.Paralysis]: ['でんき'],
  [StatusCondition.Poison]: ['どく', 'はがね'],
  [StatusCondition.BadPoison]: ['どく', 'はがね'],
  [StatusCondition.Sleep]: [],
  [StatusCondition.Flinch]: [],
  [StatusCondition.Confusion]: [],
};

/**
 * 状態異常を付与するときのオプション
 */
export interface StatusInflictionOptions {
  /**
   * 付与したもの（技・特性と、そのポケモン）
   */
  readonly source?: EffectSource;

  /**
   * 付与できないタイプ。省略すると STATUS_IMMUNE_TYPES を使う
   */
  readonly immuneTypes?: readonly string[];
}

/**
 * 状態異常を付与できるかを判定する（書き込みはしない）
 *
 * 1. ひんし・すでに状態異常がある場合は付与できない。こんらん・ひるみは volatileState に置くので、
 *    状態異常があっても付与できる（すでにこんらん・ひるみなら付与できない）
 * 2. タイプによる免疫。状態異常そのものの免疫（STATUS_IMMUNE_TYPES）は、付与元の特性の
 *    bypassesStatusTypeImmunity（ふしょく）が true なら無視する。immuneTypes で足した免疫は無視できない
 * 3. 対象の特性の canReceiveStatusCondition。技で付与するときは、付与元のかたやぶりで無視される
 *
 * ねむりは、場の誰かがさわいでいる（volatileState.uproar）と付与できない（さわいでいるポケモン自身も）
 *
 * 場の状態による守り（field-protection.ts）:
 * - しんぴのまもり: 相手が起こした状態異常・こんらん（すりぬけの技は通る。ひるみは防がない）
 * - エレキフィールド: 地面にいて隠れていないポケモンのねむり（自分で起こしたねむるも防ぐ）
 * - ミストフィールド: 地面にいて隠れていないポケモンの状態異常・こんらん（自分で起こしたものも防ぐ）
 */
export const canInflictStatus = async (
  target: BattlePokemonStatus,
  statusCondition: StatusCondition,
  battleContext: BattleContext,
  options: StatusInflictionOptions = {},
): Promise<boolean> => {
  if (target.currentHp <= 0) {
    return false;
  }
  if (isVolatileStatusCondition(statusCondition)) {
    if (hasVolatileStatusCondition(target, statusCondition)) {
      return false;
    }
  } else if (target.statusCondition && target.statusCondition !== StatusCondition.None) {
    return false;
  }
  if (statusCondition === StatusCondition.Sleep && (await isUproarActive(target, battleContext))) {
    return false;
  }

  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    target.trainedPokemonId,
  );
  if (!trainedPokemon) {
    return false;
  }

  const source = options.source;
  const typeNames = [
    trainedPokemon.pokemon.primaryType.name,
    trainedPokemon.pokemon.secondaryType?.name,
  ].filter((typeName): typeName is string => typeName !== undefined);
  if (
    statusCondition !== StatusCondition.Flinch &&
    (await isProtectedBySafeguard(target, source, battleContext))
  ) {
    return false;
  }
  if (
    isStatusPreventedByTerrain(
      target,
      statusCondition,
      typeNames,
      trainedPokemon.ability?.name,
      battleContext,
    )
  ) {
    return false;
  }

  let sourceAbilityName: string | undefined = source?.abilityName;
  const getSourceAbilityName = async (): Promise<string | undefined> => {
    if (sourceAbilityName === undefined && source?.pokemon) {
      sourceAbilityName = await resolveAbilityName(source.pokemon, battleContext);
    }
    return sourceAbilityName;
  };

  // タイプによる免疫
  // 状態異常そのものの免疫（どく・はがねのどくなど）だけ、付与元の特性（ふしょく）で無視できる。
  // 技が足した免疫（粉技のくさ、でんじはのじめんなど）は無視できない
  const immuneTypes = options.immuneTypes ?? STATUS_IMMUNE_TYPES[statusCondition];
  const statusImmuneTypes = immuneTypes.filter(typeName =>
    STATUS_IMMUNE_TYPES[statusCondition].includes(typeName),
  );
  const extraImmuneTypes = immuneTypes.filter(typeName => !statusImmuneTypes.includes(typeName));
  if (typeNames.some(typeName => extraImmuneTypes.includes(typeName))) {
    return false;
  }
  if (typeNames.some(typeName => statusImmuneTypes.includes(typeName))) {
    const sourceAbility = source?.pokemon
      ? await getAbilityEffect(await getSourceAbilityName())
      : undefined;
    const bypassed =
      source?.pokemon !== undefined &&
      sourceAbility?.bypassesStatusTypeImmunity?.(
        source.pokemon,
        statusCondition,
        battleContext,
      ) === true;
    if (!bypassed) {
      return false;
    }
  }

  // 対象の特性による無効化（技で付与するときは、かたやぶりで無視される）
  const targetAbilityName = trainedPokemon.ability?.name;
  const targetAbility = await getAbilityEffect(targetAbilityName);
  if (!targetAbility?.canReceiveStatusCondition) {
    return true;
  }
  const byOpponentMove = source?.kind === 'move' && source.pokemon?.id !== target.id;
  if (
    byOpponentMove &&
    (await isIgnoredByMoldBreaker(await getSourceAbilityName(), targetAbilityName))
  ) {
    return true;
  }
  return (
    targetAbility.canReceiveStatusCondition(target, statusCondition, battleContext, source) !==
    false
  );
};

/**
 * 場の誰かがさわいでいるか（さわぐの間は、場の誰も眠れない）
 * 対象・コンテキストの攻撃側と防御側を見る。シングルバトルでは攻撃側と防御側が場の 2 匹なので、
 * どちらかがコンテキストにないとき（ターン終了時など）だけ、場のポケモンを読み直して確かめる
 */
export const isUproarActive = async (
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  const known = [target, battleContext.attacker, battleContext.defender];
  if (known.some(pokemon => pokemon?.volatileState.uproar === true)) {
    return true;
  }
  if (battleContext.attacker && battleContext.defender) {
    return false;
  }
  const battleId = battleContext.battle?.id;
  if (battleId === undefined || !battleContext.battleRepository) {
    return false;
  }
  const statuses =
    (await battleContext.battleRepository.findBattlePokemonStatusByBattleId(battleId)) ?? [];
  return statuses.some(status => status.isActive && status.volatileState.uproar === true);
};

/**
 * 状態異常を書き込み、付与されたあとの特性を呼ぶ
 * 付与できるかは canInflictStatus で先に判定しておく
 * こんらん・ひるみは statusCondition ではなく volatileState に書く（confusionTurns は 2〜5、flinched は true）
 *
 * - 対象の特性の onStatusInflicted（シンクロ）
 * - 付与元の特性の onInflictStatus（どくくぐつ）。自分で自分に付与したときは呼ばない
 *
 * @returns 特性のメッセージ
 */
export const inflictStatus = async (
  target: BattlePokemonStatus,
  statusCondition: StatusCondition,
  battleContext: BattleContext,
  options: StatusInflictionOptions = {},
): Promise<string[]> => {
  if (!battleContext.battleRepository) {
    return [];
  }
  if (isVolatileStatusCondition(statusCondition)) {
    await battleContext.battleRepository.patchVolatileState(
      target.id,
      volatileStatusConditionPatch(statusCondition),
    );
  } else {
    await battleContext.battleRepository.updateBattlePokemonStatus(target.id, { statusCondition });
  }

  const source = options.source;
  const targetAbility = await getAbilityEffect(await resolveAbilityName(target, battleContext));
  const sourcePokemon =
    source?.pokemon && source.pokemon.id !== target.id ? source.pokemon : undefined;
  const sourceAbility = sourcePokemon
    ? await getAbilityEffect(
        source?.abilityName ?? (await resolveAbilityName(sourcePokemon, battleContext)),
      )
    : undefined;
  if (!targetAbility?.onStatusInflicted && !sourceAbility?.onInflictStatus) {
    return [];
  }

  const latestTarget =
    (await battleContext.battleRepository.findBattlePokemonStatusById(target.id)) ?? target;
  const messages: Array<string | null | undefined> = [];
  messages.push(
    await targetAbility?.onStatusInflicted?.(latestTarget, statusCondition, source, battleContext),
  );
  if (sourcePokemon) {
    const latestSource =
      (await battleContext.battleRepository.findBattlePokemonStatusById(sourcePokemon.id)) ??
      sourcePokemon;
    messages.push(
      await sourceAbility?.onInflictStatus?.(
        latestSource,
        latestTarget,
        statusCondition,
        battleContext,
      ),
    );
  }
  return messages.filter((message): message is string => Boolean(message));
};

/**
 * 状態異常を付与できれば付与する（canInflictStatus → inflictStatus）
 * 確率で付与する効果は、canInflictStatus のあとに確率判定をしてから inflictStatus を呼ぶ
 */
export const tryInflictStatus = async (
  target: BattlePokemonStatus,
  statusCondition: StatusCondition,
  battleContext: BattleContext,
  options: StatusInflictionOptions = {},
): Promise<{ inflicted: boolean; messages: string[] }> => {
  if (!(await canInflictStatus(target, statusCondition, battleContext, options))) {
    return { inflicted: false, messages: [] };
  }
  const messages = await inflictStatus(target, statusCondition, battleContext, options);
  return { inflicted: true, messages };
};
