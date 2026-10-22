import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move } from '../../entities/move.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';

/**
 * 連続攻撃技の基底クラス
 * 複数回の攻撃を行う技の汎用的な実装
 *
 * 各技は、このクラスを継承して攻撃回数を設定するだけで実装できる
 * MoveExecutorService は beforeDamage で決まった battleContext.multiHitCount の回数だけダメージを与える
 */
export abstract class BaseMultiHitEffect implements IMoveEffect {
  /**
   * 2-5回攻撃の回数の抽選表（2回:35% 3回:35% 4回:15% 5回:15%、第5世代以降）
   */
  private static readonly TWO_TO_FIVE_HIT_TABLE: readonly number[] = [
    2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5,
  ];

  /**
   * 攻撃回数の最小値
   */
  protected abstract readonly minHits: number;

  /**
   * 攻撃回数の最大値
   */
  protected abstract readonly maxHits: number;

  /**
   * 攻撃回数の範囲（特性補正の前）
   */
  getHitRange(): { min: number; max: number } {
    return { min: this.minHits, max: this.maxHits };
  }

  /**
   * 攻撃回数を決定
   * 2-5回攻撃は TWO_TO_FIVE_HIT_TABLE で抽選し、それ以外はminHitsからmaxHitsの間で均等に抽選する
   */
  protected determineHitCount(): number {
    if (this.minHits === this.maxHits) {
      return this.minHits;
    }
    if (this.minHits === 2 && this.maxHits === 5) {
      const table = BaseMultiHitEffect.TWO_TO_FIVE_HIT_TABLE;
      return table[Math.floor(Math.random() * table.length)];
    }
    return Math.floor(Math.random() * (this.maxHits - this.minHits + 1)) + this.minHits;
  }

  /**
   * ダメージ計算前に発動
   * 攻撃回数を決定し、BattleContextに保存
   * 攻撃側特性の modifyMultiHitCount（スキルリンクなど）が回数を返した場合はそれを使う
   */
  async beforeDamage(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _move: Move,
    battleContext: BattleContext,
  ): Promise<void> {
    const abilityEffect = battleContext.attackerAbilityName
      ? AbilityRegistry.get(battleContext.attackerAbilityName)
      : undefined;
    const overriddenCount = abilityEffect?.modifyMultiHitCount?.(
      attacker,
      this.minHits,
      this.maxHits,
      battleContext,
    );

    // BattleContextに攻撃回数を保存
    battleContext.multiHitCount = overriddenCount ?? this.determineHitCount();
  }
}
