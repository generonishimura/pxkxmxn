import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { rollSecondaryEffect } from '../secondary-effect';
import { EffectSource } from '../../battle-events/effect-source';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';

/**
 * 複数の状態異常を付与する際の設定
 */
export interface StatusConditionConfig {
  /**
   * 付与する状態異常
   */
  statusCondition: StatusCondition;

  /**
   * 付与確率（0.0-1.0、1.0の場合は必ず付与）
   */
  chance: number;

  /**
   * 免疫を持つタイプ名の配列（例: ['ほのお']）
   * これらのタイプのポケモンには状態異常を付与しない
   */
  immuneTypes: string[];

  /**
   * 状態異常付与時のメッセージ
   */
  message: string;
}

/**
 * 複数の状態異常を同時に付与できる基底クラス
 * X%の確率でYの状態異常を付与、Z%の確率でWの状態異常を付与する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseMultipleStatusConditionEffect implements IMoveEffect {
  /**
   * 付与する状態異常の設定配列
   */
  protected abstract readonly statusConditions: readonly StatusConditionConfig[];

  /**
   * 技が命中したときに発動
   * 各状態異常に対して独立に確率判定を行い、成功したもののみを付与
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    // 各状態異常に対して独立に判定
    const appliedStatuses: string[] = [];
    const source: EffectSource = {
      pokemon: attacker,
      abilityName: battleContext.attackerAbilityName,
      kind: 'move',
      name: battleContext.moveName,
    };

    for (const config of this.statusConditions) {
      // 付与できるか（状態異常・タイプ・特性。付与元のかたやぶり・ふしょくを考慮する）
      const options = { source, immuneTypes: config.immuneTypes };
      if (!(await canInflictStatus(defender, config.statusCondition, battleContext, options))) {
        continue;
      }

      // 確率判定（てんのめぐみ・りんぷんを考慮。chanceが1.0の場合は必ず付与）
      if (!rollSecondaryEffect(config.chance, battleContext)) {
        continue;
      }

      // 状態異常を付与（最初に成功したもののみ）
      // 複数の状態異常が同時に成功した場合は、最初のものを優先
      if (appliedStatuses.length === 0) {
        const messages = await inflictStatus(
          defender,
          config.statusCondition,
          battleContext,
          options,
        );
        appliedStatuses.push(config.message, ...messages);
      }
    }

    // メッセージを返す（最初に付与された状態異常と、付与されたあとの特性のメッセージ）
    return appliedStatuses.length > 0 ? appliedStatuses.join(' ') : null;
  }
}
