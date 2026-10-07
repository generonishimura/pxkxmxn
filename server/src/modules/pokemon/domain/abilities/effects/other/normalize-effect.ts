import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { BattleContext } from '../../battle-context.interface';

/**
 * ノーマルスキンでタイプを変えない技（本家の Normalize の noModifyType）
 * わるあがきはタイプなしの技なので、エンジンが modifyMoveType を呼ばない
 */
const UNCHANGED_MOVE_NAMES: ReadonlySet<string> = new Set([
  'ウェザーボール',
  'テクノバスター',
  'さばきのつぶて',
  'マルチアタック',
  'めざめるダンス',
  'しぜんのめぐみ',
  'だいちのはどう',
  'めざめるパワー',
]);

/**
 * ノーマルスキン（Normalize）特性の効果
 * 使う技をすべてノーマルタイプにし、威力を 1.2 倍（4915/4096）にする
 *
 * - もとからノーマルの技も 1.2 倍になる（本家の typeChangerBoosted）
 * - ウェザーボール・テクノバスター・さばきのつぶて・マルチアタック・めざめるダンス・しぜんのめぐみ・
 *   だいちのはどう・めざめるパワーのタイプは変えず、1.2 倍にもならない
 * 注: エンジンは変化技に特性の modifyMoveType を呼ばないので、変化技のタイプは変わらない
 *   （本家はでんじはなどもノーマルになり、じめんタイプにも効く）
 */
export class NormalizeEffect implements IAbilityEffect {
  modifyMoveType(
    _pokemon: BattlePokemonStatus,
    _typeName: string,
    battleContext?: BattleContext,
  ): string | undefined {
    const moveName = battleContext?.moveName;
    if (moveName !== undefined && UNCHANGED_MOVE_NAMES.has(moveName)) {
      return undefined;
    }
    return 'ノーマル';
  }

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    return battleContext?.moveTypeChangedByAbility === true
      ? modifyByFixedPoint(power, 4915)
      : undefined;
  }
}
