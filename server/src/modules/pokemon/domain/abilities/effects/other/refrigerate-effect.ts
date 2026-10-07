import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { BattleContext } from '../../battle-context.interface';

/**
 * フリーズスキンでタイプを変えない技（本家の Refrigerate の noModifyType）
 */
const UNCHANGED_MOVE_NAMES: ReadonlySet<string> = new Set([
  'ウェザーボール',
  'テクノバスター',
  'さばきのつぶて',
  'マルチアタック',
  'めざめるダンス',
  'しぜんのめぐみ',
  'だいちのはどう',
]);

/**
 * フリーズスキン（Refrigerate）特性の効果
 * ノーマルタイプの技をこおりタイプにし、威力を 1.2 倍（4915/4096）にする
 *
 * - 技の効果でタイプが決まったあと（晴れのウェザーボールなど）にノーマルでなければ変えない
 * - ウェザーボール・テクノバスター・さばきのつぶて・マルチアタック・めざめるダンス・しぜんのめぐみ・
 *   だいちのはどうは、ノーマルタイプでも変えず、1.2 倍にもならない
 * - プラズマシャワー・そうでんでさらにでんきになっても 1.2 倍のまま（エンジンの moveTypeChangedByAbility）
 * 注: エンジンは変化技に特性の modifyMoveType を呼ばないので、変化技のタイプは変わらない
 */
export class RefrigerateEffect implements IAbilityEffect {
  modifyMoveType(
    _pokemon: BattlePokemonStatus,
    typeName: string,
    battleContext?: BattleContext,
  ): string | undefined {
    const moveName = battleContext?.moveName;
    if (typeName !== 'ノーマル' || (moveName !== undefined && UNCHANGED_MOVE_NAMES.has(moveName))) {
      return undefined;
    }
    return 'こおり';
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
