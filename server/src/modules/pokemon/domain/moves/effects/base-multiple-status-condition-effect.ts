import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../../abilities/ability-registry';

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

    // 既に状態異常がある場合は付与しない（複合効果でも1つの状態異常のみ）
    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    // トレーナーポケモンの情報を取得
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    // 各状態異常に対して独立に判定
    const appliedStatuses: string[] = [];

    for (const config of this.statusConditions) {
      // タイプによる免疫チェック
      const hasImmuneType =
        config.immuneTypes.includes(trainedPokemon.pokemon.primaryType.name) ||
        (trainedPokemon.pokemon.secondaryType &&
          config.immuneTypes.includes(trainedPokemon.pokemon.secondaryType.name));
      if (hasImmuneType) {
        continue;
      }

      // 特性による無効化チェック
      // 攻撃側がかたやぶりを持っている場合は、防御側の特性効果を無視
      if (
        trainedPokemon.ability &&
        !AbilityRegistry.hasMoldBreaker(battleContext.attackerAbilityName)
      ) {
        const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
        if (abilityEffect?.canReceiveStatusCondition) {
          const canReceive = abilityEffect.canReceiveStatusCondition(
            defender,
            config.statusCondition,
            battleContext,
          );
          // canReceiveがfalseの場合は無効化（undefinedの場合は判定しない）
          if (canReceive === false) {
            continue;
          }
        }
      }

      // 確率判定（chanceが1.0の場合は必ず付与）
      if (config.chance < 1.0 && Math.random() >= config.chance) {
        continue;
      }

      // 状態異常を付与（最初に成功したもののみ）
      // 複数の状態異常が同時に成功した場合は、最初のものを優先
      if (appliedStatuses.length === 0) {
        await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
          statusCondition: config.statusCondition,
        });
        appliedStatuses.push(config.message);
      }
    }

    // メッセージを返す（複数の状態異常が付与された場合は結合）
    return appliedStatuses.length > 0 ? appliedStatuses.join(' ') : null;
  }
}

