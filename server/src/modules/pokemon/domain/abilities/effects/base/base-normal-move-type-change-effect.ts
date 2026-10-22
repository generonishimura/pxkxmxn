import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * ノーマル技のタイプを変え、威力を 1.2 倍にする特性（-スキン系）の基底クラス
 * - modifyMoveType: 技の効果のあとのタイプがノーマルなら、changedTypeName にする（本家の onModifyType）
 * - modifyBasePower: この特性がタイプを変えた技（ctx.moveTypeChangedByAbility）なら、威力を 4915/4096 倍にする
 *   （本家の typeChangerBoosted。プラズマシャワー・そうでんでさらに変わっても 1.2 倍のまま）
 * - タイプが技の効果で決まる技（ウェザーボール・テクノバスター・さばきのつぶて・マルチアタック・めざめるダンス・
 *   しぜんのめぐみ・だいちのはどう）は、ノーマルのままでも変えない（本家の noModifyType）
 * - 変化技のタイプも変える（本家と同じ。威力がないので 1.2 倍は関係しない）
 *
 * 注: テラスタル中のテラバーストを変えない決まりは、テラスタルを扱わないので持たない
 */
export abstract class BaseNormalMoveTypeChangeEffect implements IAbilityEffect {
  /**
   * 変える前のタイプ名
   */
  private static readonly NORMAL_TYPE_NAME = 'ノーマル';

  /**
   * タイプが技の効果で決まるので、ノーマルのままでも変えない技（本家の noModifyType）
   */
  private static readonly NO_MODIFY_TYPE_MOVE_NAMES: ReadonlySet<string> = new Set([
    'ウェザーボール',
    'テクノバスター',
    'さばきのつぶて',
    'マルチアタック',
    'めざめるダンス',
    'しぜんのめぐみ',
    'だいちのはどう',
  ]);

  /**
   * 威力の補正（4096 分率。1.2 倍）
   */
  private static readonly POWER_MULTIPLIER = 4915;

  /**
   * 変えたあとのタイプ名（DB の Type.name）
   */
  protected abstract readonly changedTypeName: string;

  modifyMoveType(
    _pokemon: BattlePokemonStatus,
    typeName: string,
    battleContext?: BattleContext,
  ): string | undefined {
    if (typeName !== BaseNormalMoveTypeChangeEffect.NORMAL_TYPE_NAME) {
      return undefined;
    }
    const moveName = battleContext?.moveName;
    if (
      moveName !== undefined &&
      BaseNormalMoveTypeChangeEffect.NO_MODIFY_TYPE_MOVE_NAMES.has(moveName)
    ) {
      return undefined;
    }
    return this.changedTypeName;
  }

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveTypeChangedByAbility !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, BaseNormalMoveTypeChangeEffect.POWER_MULTIPLIER);
  }
}
