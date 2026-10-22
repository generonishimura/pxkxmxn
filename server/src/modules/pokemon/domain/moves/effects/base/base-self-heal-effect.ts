import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { isHealBlocked } from '../../../battle-events/heal';

/**
 * 回復量を表す分数（最大 HP に対する割合）
 *
 * 浮動小数点の誤差を避けるため、分子と分母を整数で持つ
 */
export interface HealFraction {
  numerator: number;
  denominator: number;
}

/**
 * 自分の HP を回復する技の基底クラス
 *
 * 効果: 自分の HP を「最大 HP × 割合」（四捨五入、最低 1）だけ回復する
 *
 * - 回復後の HP は最大 HP を超えない
 * - HP が満タンのときは失敗する
 * - かいふくふうじ中は失敗する（技の制限で選べないが、ゆびをふるなどで出たとき）
 * - 失敗したときは 'But it failed' を返す（null はエンジンで成功として扱われるため）
 *
 * 各技は、このクラスを継承して回復割合を返すだけで実装できる
 */
export abstract class BaseSelfHealEffect implements IMoveEffect {
  /**
   * 最大 HP に対する回復割合を返す
   * 天候などで割合が変わる技のために battleContext を受け取る
   */
  protected abstract getHealFraction(battleContext: BattleContext): HealFraction;

  /**
   * 回復量を計算する（最低 1 にする処理は呼び出し側で行う）
   * 端数処理が異なる技（4096 基準の補正値を使う技など）はオーバーライドする
   */
  protected computeHealAmount(maxHp: number, battleContext: BattleContext): number {
    const { numerator, denominator } = this.getHealFraction(battleContext);
    return Math.round((maxHp * numerator) / denominator);
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (attacker.currentHp >= attacker.maxHp || isHealBlocked(attacker)) {
      return 'But it failed';
    }

    const healAmount = Math.max(1, this.computeHealAmount(attacker.maxHp, battleContext));
    const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: newHp,
    });

    return 'user restored its HP!';
  }
}
