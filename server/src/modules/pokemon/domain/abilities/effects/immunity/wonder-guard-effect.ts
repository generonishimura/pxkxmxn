import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ふしぎなまもり（Wonder Guard）特性の効果
 * 効果ばつぐん（タイプ相性が1倍より大きい）以外のダメージ技を無効にする
 *
 * - 判定はこのヒットのタイプ相性（`typeEffectiveness`）で行う。きもったま・しんがんで
 *   ゴーストに当たるようになったノーマル・かくとう技は等倍なので、無効になる
 * - 変化技はダメージ計算を通らないので、無効にしない（本家と同じ）
 * - わるあがきは無効にしない（本家と同じ）。わるあがきはタイプなし（相性1倍）なので、ゴーストタイプのヌケニンにも当たる
 * - かたやぶりで無視される（エンジンが判定する）
 * - 無効にした技は、追加効果（onHit。10まんボルトのまひなど）と使用者への効果（afterDamage。反動など）も
 *   起こさない（本家は技そのものが失敗する）。エンジンが、技全体のタイプ相性（moveTypeEffectiveness）が 0 の
 *   ときにこれらを呼ばない
 */
export class WonderGuardEffect implements IAbilityEffect {
  private static readonly STRUGGLE_MOVE_NAME = 'わるあがき';

  isImmuneToType(
    _pokemon: BattlePokemonStatus,
    _typeName: string,
    battleContext?: BattleContext,
  ): boolean {
    const effectiveness = battleContext?.typeEffectiveness;
    if (effectiveness === undefined) {
      return false;
    }
    if (battleContext?.moveName === WonderGuardEffect.STRUGGLE_MOVE_NAME) {
      return false;
    }
    return effectiveness <= 1;
  }
}
