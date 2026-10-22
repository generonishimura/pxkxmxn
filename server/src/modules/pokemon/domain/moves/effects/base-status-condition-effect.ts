import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { rollSecondaryEffect } from '../secondary-effect';
import {
  StatusInflictionOptions,
  canInflictStatus,
  inflictStatus,
} from '../../battle-events/status-infliction';

/**
 * 状態異常付与の基底クラス
 * X%の確率でYの状態異常を付与する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 * 付与の判定と書き込みは canInflictStatus / inflictStatus で行う（付与元は技と使用者）
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
   * 変化技（どくどく・でんじは・おにびなど）を使ったときに発動
   * 変化技の状態異常は追加効果ではないため、確率判定をせず、りんぷんでも防がれない
   */
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.inflict(attacker, defender, battleContext, false);
  }

  /**
   * ダメージ技が命中したときに発動（追加効果）
   * 確率に基づいて状態異常を付与
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.inflict(attacker, defender, battleContext, true);
  }

  /**
   * 状態異常を付与する（canInflictStatus → 確率判定 → inflictStatus）
   * @param isSecondaryEffect 追加効果なら true（てんのめぐみ・りんぷんを考慮して確率判定する）
   */
  private async inflict(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
    isSecondaryEffect: boolean,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    // 付与できるか（状態異常・タイプ・特性。付与元のかたやぶり・ふしょくを考慮する）
    const options: StatusInflictionOptions = {
      source: {
        pokemon: attacker,
        abilityName: battleContext.attackerAbilityName,
        kind: 'move',
        name: battleContext.moveName,
      },
      immuneTypes: this.immuneTypes,
    };
    if (!(await canInflictStatus(defender, this.statusCondition, battleContext, options))) {
      return null;
    }

    // 追加効果の確率判定（てんのめぐみ・りんぷんを考慮。chanceが1.0の場合は必ず付与）
    if (isSecondaryEffect && !rollSecondaryEffect(this.chance, battleContext)) {
      return null;
    }

    // 状態異常を付与し、付与されたあとの特性（シンクロなど）のメッセージを足す
    const messages = await inflictStatus(defender, this.statusCondition, battleContext, options);
    return [this.message, ...messages].join(' ');
  }
}
