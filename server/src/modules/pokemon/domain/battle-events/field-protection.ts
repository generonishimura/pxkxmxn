import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { isGrounded } from '@/modules/battle/domain/logic/grounded';
import { BattleContext } from '../abilities/battle-context.interface';
import { EffectSource } from './effect-source';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';

/**
 * 場の状態による守り（しんぴのまもり・しろいきり・エレキフィールド・ミストフィールド）
 * canInflictStatus・canApplyVolatile・applyStatChanges が呼ぶ。技・特性からは呼ばない
 */

/**
 * 相手が起こした効果か（source.pokemon が対象と違う）
 */
const isFromOpponent = (target: BattlePokemonStatus, source: EffectSource | undefined): boolean =>
  source?.pokemon !== undefined && source.pokemon.id !== target.id;

/**
 * すりぬけの技か（source が技で、起こしたポケモンの特性が infiltrates）
 */
const isInfiltratingMove = async (
  source: EffectSource | undefined,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (source?.kind !== 'move' || !source.pokemon) {
    return false;
  }
  const abilityName =
    source.abilityName ?? (await resolveAbilityName(source.pokemon, battleContext));
  return (await getAbilityEffect(abilityName))?.infiltrates === true;
};

/**
 * 対象の陣営の守り（しんぴのまもり・しろいきり）で、相手が起こした効果を防ぐか
 * 相手が起こした効果（技・特性・どくびしなど。自分で起こしたものは除く）を防ぐ。すりぬけの技は防がない
 */
const isBlockedBySideGuard = async (
  target: BattlePokemonStatus,
  key: 'safeguardTurns' | 'mistTurns',
  source: EffectSource | undefined,
  battleContext: BattleContext,
): Promise<boolean> => {
  const sideState = battleContext.battle?.sideState;
  if (!sideState || getSideConditions(sideState, target.trainerId)[key] === undefined) {
    return false;
  }
  return isFromOpponent(target, source) && !(await isInfiltratingMove(source, battleContext));
};

/**
 * しんぴのまもりで、状態異常・こんらん・あくびを防ぐか（本家の safeguard の onSetStatus / onTryAddVolatile）
 * 注: ひるみは防がない
 */
export const isProtectedBySafeguard = (
  target: BattlePokemonStatus,
  source: EffectSource | undefined,
  battleContext: BattleContext,
): Promise<boolean> => isBlockedBySideGuard(target, 'safeguardTurns', source, battleContext);

/**
 * しろいきりで、相手が起こした能力の低下を防ぐか（本家の mist の onTryBoost）
 */
export const isProtectedByMist = (
  target: BattlePokemonStatus,
  source: EffectSource | undefined,
  battleContext: BattleContext,
): Promise<boolean> => isBlockedBySideGuard(target, 'mistTurns', source, battleContext);

/**
 * 対象がフィールドの守りを受けるか（地面にいて、隠れていない）
 * @param typeNames 対象のタイプ名
 * @param abilityName 対象の特性名
 */
const isAffectedByTerrain = (
  target: BattlePokemonStatus,
  typeNames: readonly string[],
  abilityName: string | undefined,
  battleContext: BattleContext,
): boolean =>
  target.volatileState.semiInvulnerable === undefined &&
  isGrounded({
    typeNames,
    abilityName,
    volatileState: target.volatileState,
    sideState: battleContext.battle?.sideState,
  });

/**
 * フィールドで状態異常を防ぐか（自分で起こしたものも防ぐ。本家と同じく、ねむるも失敗する）
 * - エレキフィールド: ねむり
 * - ミストフィールド: すべての状態異常とこんらん
 */
export const isStatusPreventedByTerrain = (
  target: BattlePokemonStatus,
  statusCondition: StatusCondition,
  typeNames: readonly string[],
  abilityName: string | undefined,
  battleContext: BattleContext,
): boolean => {
  const field = battleContext.battle?.field;
  const prevents =
    (field === Field.ElectricTerrain && statusCondition === StatusCondition.Sleep) ||
    (field === Field.MistyTerrain && statusCondition !== StatusCondition.Flinch);
  return prevents && isAffectedByTerrain(target, typeNames, abilityName, battleContext);
};

/**
 * エレキフィールドで、あくびを防ぐか（本家の electricterrain の onTryAddVolatile）
 */
export const isYawnPreventedByTerrain = (
  target: BattlePokemonStatus,
  typeNames: readonly string[],
  abilityName: string | undefined,
  battleContext: BattleContext,
): boolean =>
  battleContext.battle?.field === Field.ElectricTerrain &&
  isAffectedByTerrain(target, typeNames, abilityName, battleContext);
