import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../abilities/battle-context.interface';
import { EffectSource } from './effect-source';
import { getAbilityEffect, isIgnoredByMoldBreaker, resolveAbilityName } from './ability-lookup';

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
 * 1. ひんし・すでに状態異常がある場合は付与できない
 * 2. タイプによる免疫。付与元の特性の bypassesStatusTypeImmunity（ふしょく）が true なら無視する
 * 3. 対象の特性の canReceiveStatusCondition。技で付与するときは、付与元のかたやぶりで無視される
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
  if (target.statusCondition && target.statusCondition !== StatusCondition.None) {
    return false;
  }

  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    target.trainedPokemonId,
  );
  if (!trainedPokemon) {
    return false;
  }

  const source = options.source;
  let sourceAbilityName: string | undefined = source?.abilityName;
  const getSourceAbilityName = async (): Promise<string | undefined> => {
    if (sourceAbilityName === undefined && source?.pokemon) {
      sourceAbilityName = await resolveAbilityName(source.pokemon, battleContext);
    }
    return sourceAbilityName;
  };

  // タイプによる免疫（ふしょくなど、付与元の特性で無視できる）
  const immuneTypes = options.immuneTypes ?? STATUS_IMMUNE_TYPES[statusCondition];
  const typeNames = [
    trainedPokemon.pokemon.primaryType.name,
    trainedPokemon.pokemon.secondaryType?.name,
  ];
  if (typeNames.some(typeName => typeName !== undefined && immuneTypes.includes(typeName))) {
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
 * 状態異常を書き込み、付与されたあとの特性を呼ぶ
 * 付与できるかは canInflictStatus で先に判定しておく
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
  await battleContext.battleRepository.updateBattlePokemonStatus(target.id, { statusCondition });

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
