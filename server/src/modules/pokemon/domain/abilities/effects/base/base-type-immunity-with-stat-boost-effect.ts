import { BaseTypeImmunityEffect } from './base-type-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatType } from './base-stat-boost-effect';

/**
 * タイプ無効化 + 能力ランク上昇の基底クラス
 *
 * 例:
 *  - ひらいしん（Lightning Rod）: でんき無効化 + 特攻 +1
 *  - よびみず（Storm Drain）: みず無効化 + 特攻 +1
 *  - そうしょく（Sap Sipper）: くさ無効化 + 攻撃 +1（既存実装）
 *  - でんきエンジン（Motor Drive）: でんき無効化 + 素早さ +1（既存実装）
 *
 * 既存の `MotorDriveEffect` / `SapSipperEffect` は本 base を使用していないが、
 * 新規追加分は本 base 経由で実装することでロジック重複を避ける。
 */
export abstract class BaseTypeImmunityWithStatBoostEffect extends BaseTypeImmunityEffect {
  /**
   * 上昇させるステータスの種類
   */
  protected abstract readonly boostStat: StatType;

  /**
   * 上昇させるランク量（既定は +1）
   */
  protected readonly rankIncrease: number = 1;

  private static readonly statRankPropMap: Record<StatType, keyof BattlePokemonStatus> = {
    attack: 'attackRank',
    defense: 'defenseRank',
    specialAttack: 'specialAttackRank',
    specialDefense: 'specialDefenseRank',
    speed: 'speedRank',
    accuracy: 'accuracyRank',
    evasion: 'evasionRank',
  };

  async onAfterTakingDamage(
    pokemon: BattlePokemonStatus,
    _originalDamage: number,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (!battleContext.moveTypeName) {
      return;
    }

    const isImmune = this.isImmuneToType(pokemon, battleContext.moveTypeName, battleContext);
    if (!isImmune) {
      return;
    }

    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(
      pokemon.id,
    );
    if (!currentStatus) {
      return;
    }

    const propName = BaseTypeImmunityWithStatBoostEffect.statRankPropMap[this.boostStat];
    const currentRank = currentStatus[propName] as number;
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankIncrease));
    if (newRank === currentRank) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>);
  }
}
