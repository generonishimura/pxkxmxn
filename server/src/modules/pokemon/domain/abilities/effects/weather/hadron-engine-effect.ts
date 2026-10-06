import { BaseFieldEffect } from '../base/base-field-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * ハドロンエンジン（Hadron Engine）特性の効果
 * 場に出すときエレキフィールドを展開する。エレキフィールドの間、特攻が 5461/4096（約 1.33）倍になる
 *
 * 注: 特攻ステータスではなく、特殊技の与ダメージに 5461/4096 倍を掛けて近似する
 */
export class HadronEngineEffect extends BaseFieldEffect {
  private static readonly SPECIAL_ATTACK_MULTIPLIER = 5461 / 4096;

  protected readonly field = Field.ElectricTerrain;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // フィールドを取得（battleContext.fieldが優先、なければbattle.fieldを使用）
    const field = battleContext.field ?? battleContext.battle?.field ?? null;
    if (field !== Field.ElectricTerrain || battleContext.moveCategory !== 'Special') {
      return undefined;
    }

    return Math.floor(damage * HadronEngineEffect.SPECIAL_ATTACK_MULTIPLIER);
  }
}
