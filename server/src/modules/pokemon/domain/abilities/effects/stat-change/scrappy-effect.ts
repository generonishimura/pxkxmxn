import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * きもったま（Scrappy）特性の効果
 * ゴーストタイプに通常・格闘技が当たる
 *
 * 注意: この特性は、タイプ相性計算時にゴーストタイプに対する
 * 通常・格闘技の効果を「効果抜群」に変更する必要がある。
 * 現在の実装では、タイプ相性計算時にこの特性をチェックする必要がある。
 *
 * この特性は、タイプ相性計算時に使用されるため、
 * DamageCalculatorでタイプ相性を計算する際にチェックする必要がある。
 * 現在の実装では、この特性はゴーストタイプに通常・格闘技が当たることを保証するのみで、
 * 実際のタイプ相性修正処理は、タイプ相性計算側で実装する必要がある。
 */
export class ScrappyEffect implements IAbilityEffect {
  /**
   * ゴーストタイプに通常・格闘技が当たることを保証する
   * この特性は、タイプ相性計算時にゴーストタイプに対する
   * 通常・格闘技の効果を「効果抜群」に変更する必要がある。
   *
   * 注意: このメソッドは、将来的にタイプ相性計算時に
   * この特性をチェックするためのフラグとして使用される可能性がある。
   * 現在の実装では、この特性はゴーストタイプに通常・格闘技が当たることを保証するのみ。
   */
  passiveEffect?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void {
    // この特性は、ゴーストタイプに通常・格闘技が当たることを保証するのみ。
    // 実際のタイプ相性修正処理は、タイプ相性計算側で実装する必要がある。
  }
}
