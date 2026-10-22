import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { resolveAbilityName } from '../../../battle-events/ability-lookup';

/**
 * ステータスランクの種類
 */
export type StatType =
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'accuracy'
  | 'evasion';

/**
 * 自分のステータスランクを上昇させる基底クラス
 * 場に出すとき（onEntry）に自分のステータスランクを変更する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseStatBoostEffect implements IAbilityEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 場に出すときに発動
   * 自分のステータスランクを変更
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    // 自分のランクを変える。原因はこの特性と持ち主（相手のびんじょうなどが反応する）
    const abilityName = await resolveAbilityName(pokemon, battleContext);
    await applyStatChanges(
      pokemon,
      [{ statType: this.statType, rankChange: this.rankChange }],
      battleContext,
      { source: { pokemon, abilityName, kind: 'ability', name: abilityName } },
    );
  }
}
