import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 接触技を受けたときに状態異常を付与する基底クラス
 * どくどく（Poison Point）、せいでんき（Static）、もうふう（Flame Body）などで使用
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseContactStatusConditionEffect implements IAbilityEffect {
  /**
   * ダメージ修正（この特性はダメージを修正しない）
   */
  modifyDamage(_pokemon: BattlePokemonStatus, damage: number, _battleContext?: BattleContext): number {
    return damage;
  }
  /**
   * 付与する状態異常
   */
  protected abstract readonly statusCondition: StatusCondition;

  /**
   * 状態異常を付与する確率（0.0-1.0、例: 0.3は30%）
   */
  protected abstract readonly chance: number;

  /**
   * 状態異常を付与できないタイプ（免疫タイプ）
   */
  protected abstract readonly immuneTypes: readonly string[];

  /**
   * 接触技を受けたときに状態異常を付与する
   * MoveExecutorServiceから呼び出される
   *
   * @param defender 防御側のポケモン（状態異常を付与される側）
   * @param attacker 攻撃側のポケモン（状態異常を付与する側）
   * @param battleContext バトルコンテキスト
   * @returns 状態異常を付与した場合はtrue、付与しなかった場合はfalse
   */
  async applyContactStatusCondition(
    defender: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<boolean> {
    if (!battleContext?.battleRepository || !battleContext.trainedPokemonRepository) {
      return false;
    }

    // 接触技でない場合は処理しない
    if (battleContext.moveCategory !== 'Physical') {
      return false;
    }

    // 既に状態異常がある場合は付与しない
    if (attacker.statusCondition && attacker.statusCondition !== StatusCondition.None) {
      return false;
    }

    // 攻撃側のポケモンのタイプを取得
    const attackerTrainedPokemon = await battleContext.trainedPokemonRepository.findById(
      attacker.trainedPokemonId,
    );
    if (!attackerTrainedPokemon) {
      return false;
    }

    // タイプによる免疫チェック
    const hasImmuneType =
      this.immuneTypes.includes(attackerTrainedPokemon.pokemon.primaryType.name) ||
      (attackerTrainedPokemon.pokemon.secondaryType &&
        this.immuneTypes.includes(attackerTrainedPokemon.pokemon.secondaryType.name));
    if (hasImmuneType) {
      return false;
    }

    // 特性による無効化チェック（動的に取得して循環参照を回避）
    if (attackerTrainedPokemon.ability) {
      // 動的インポートで循環参照を回避
      const { AbilityRegistry } = await import('../../ability-registry');
      const abilityEffect = AbilityRegistry.get(attackerTrainedPokemon.ability.name);
      if (abilityEffect?.canReceiveStatusCondition) {
        const canReceive = abilityEffect.canReceiveStatusCondition(
          attacker,
          this.statusCondition,
          battleContext,
        );
        // canReceiveがfalseの場合は無効化（undefinedの場合は判定しない）
        if (canReceive === false) {
          return false;
        }
      }
    }

    // 確率判定（chanceが1.0の場合は必ず付与）
    if (this.chance < 1.0 && Math.random() >= this.chance) {
      return false;
    }

    // 状態異常を付与
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      statusCondition: this.statusCondition,
    });

    return true;
  }
}

