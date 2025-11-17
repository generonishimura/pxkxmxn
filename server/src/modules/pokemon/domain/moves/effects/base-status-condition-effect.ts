import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 状態異常付与の基底クラス
 * X%の確率でYの状態異常を付与する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseStatusConditionEffect implements IMoveEffect {
  /**
   * 付与する状態異常
   */
  protected abstract readonly statusCondition: StatusCondition;

  /**
   * 付与確率（0.0-1.0、1.0の場合は必ず付与）
   */
  protected abstract readonly chance: number;

  /**
   * 免疫を持つタイプ名の配列（例: ['ほのお']）
   * これらのタイプのポケモンには状態異常を付与しない
   */
  protected abstract readonly immuneTypes: string[];

  /**
   * 状態異常付与時のメッセージ
   */
  protected abstract readonly message: string;

  /**
   * 技が命中したときに発動
   * 確率に基づいて状態異常を付与
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    // 既に状態異常がある場合は付与しない
    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    // タイプによる免疫チェック
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const hasImmuneType =
      this.immuneTypes.includes(trainedPokemon.pokemon.primaryType.name) ||
      (trainedPokemon.pokemon.secondaryType &&
        this.immuneTypes.includes(trainedPokemon.pokemon.secondaryType.name));
    if (hasImmuneType) {
      return null;
    }

    // 確率判定（chanceが1.0の場合は必ず付与）
    if (this.chance < 1.0 && Math.random() >= this.chance) {
      return null;
    }

    // 状態異常を付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: this.statusCondition,
    });

    return this.message;
  }
}

