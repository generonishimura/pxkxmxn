import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * タイプ一致時の威力上昇の基底クラス
 * 技のタイプとポケモンのタイプが一致する場合、追加の倍率を適用する汎用的な実装
 *
 * 各特性は、このクラスを継承して倍率を設定するだけで実装できる
 */
export abstract class BaseTypeBoostEffect implements IAbilityEffect {
  /**
   * ダメージ倍率（1.0が通常、1.5が1.5倍など）
   * タイプ一致時に適用される追加の倍率
   */
  protected abstract readonly damageMultiplier: number;

  /**
   * タイプ一致（STAB: Same Type Attack Bonus）を判定
   * 技のタイプとポケモンのタイプが一致する場合、trueを返す
   */
  private async isTypeMatch(
    pokemon: BattlePokemonStatus,
    moveTypeName: string,
    battleContext?: BattleContext,
  ): Promise<boolean> {
    if (!battleContext?.trainedPokemonRepository) {
      return false;
    }

    // 育成ポケモンを取得
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      pokemon.trainedPokemonId,
    );

    if (!trainedPokemon) {
      return false;
    }

    // メインタイプまたはサブタイプが一致するかチェック
    const primaryTypeName = trainedPokemon.pokemon.primaryType.name;
    const secondaryTypeName = trainedPokemon.pokemon.secondaryType?.name;

    return primaryTypeName === moveTypeName || secondaryTypeName === moveTypeName;
  }

  /**
   * ダメージを与えるときに発動
   * タイプ一致の場合、追加の倍率を適用
   */
  async modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): Promise<number | undefined> {
    // 技のタイプ情報がない場合は修正しない
    if (!battleContext?.moveTypeName) {
      return undefined;
    }

    // タイプ一致を判定
    const isMatch = await this.isTypeMatch(pokemon, battleContext.moveTypeName, battleContext);
    if (!isMatch) {
      // タイプ一致でない場合は修正しない
      return undefined;
    }

    // タイプ一致の場合、ダメージを修正
    return Math.floor(damage * this.damageMultiplier);
  }
}

