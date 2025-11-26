import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move } from '../../entities/move.entity';

/**
 * 連続攻撃技の基底クラス
 * 複数回の攻撃を行う技の汎用的な実装
 *
 * 各技は、このクラスを継承して攻撃回数を設定するだけで実装できる
 */
export abstract class BaseMultiHitEffect implements IMoveEffect {
  /**
   * 攻撃回数の最小値
   */
  protected abstract readonly minHits: number;

  /**
   * 攻撃回数の最大値
   */
  protected abstract readonly maxHits: number;

  /**
   * 攻撃回数を決定
   * ランダムにminHitsからmaxHitsの間の回数を返す
   */
  protected determineHitCount(): number {
    if (this.minHits === this.maxHits) {
      return this.minHits;
    }
    return Math.floor(Math.random() * (this.maxHits - this.minHits + 1)) + this.minHits;
  }

  /**
   * ダメージ計算前に発動
   * 攻撃回数を決定し、BattleContextに保存
   */
  async beforeDamage(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _move: Move,
    battleContext: BattleContext,
  ): Promise<void> {
    // 攻撃回数を決定
    const hitCount = this.determineHitCount();

    // BattleContextに攻撃回数を保存
    battleContext.multiHitCount = hitCount;
  }
}

