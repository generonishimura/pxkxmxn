import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * タイプ無効化の基底クラス
 * 特定のタイプの技を無効化する汎用的な実装
 *
 * 各特性は、このクラスを継承して無効化するタイプを設定するだけで実装できる
 */
export abstract class BaseTypeImmunityEffect implements IAbilityEffect {
  /**
   * 無効化するタイプ名の配列（日本語名、例: ["じめん"]）
   */
  protected abstract readonly immuneTypes: readonly string[];

  /**
   * 特定のタイプの技に対して無効化を持つかどうかを判定
   * 無効化するタイプの場合はtrueを返す
   */
  isImmuneToType(
    _pokemon: BattlePokemonStatus,
    typeName: string,
    _battleContext?: BattleContext,
  ): boolean {
    return this.immuneTypes.includes(typeName);
  }
}

