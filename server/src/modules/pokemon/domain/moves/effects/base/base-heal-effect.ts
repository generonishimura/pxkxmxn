import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 回復の対象
 * - self: 技を使ったポケモン自身
 * - target: 技の対象（シングルバトルでは相手）
 */
export type HealTarget = 'self' | 'target';

/**
 * 最大 HP に対する回復割合（分数）
 */
export interface HealFraction {
  numerator: number;
  denominator: number;
}

/**
 * 状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）
 * こんらん・ひるみは含まない
 */
const MAJOR_STATUS_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
  StatusCondition.Burn,
  StatusCondition.Freeze,
  StatusCondition.Paralysis,
  StatusCondition.Poison,
  StatusCondition.BadPoison,
  StatusCondition.Sleep,
]);

/**
 * 状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）かどうかを判定する
 */
export const isMajorStatusCondition = (statusCondition: StatusCondition | null): boolean =>
  statusCondition !== null && MAJOR_STATUS_CONDITIONS.has(statusCondition);

/**
 * 最大 HP の一定割合だけ HP を回復する変化技の基底クラス
 *
 * - 回復量は round(最大 HP × 割合)（第5世代以降の仕様）。最低 1、最大 HP を超えない
 *   1/2 回復では、本家の ceil(最大 HP × 0.5) と同じ値になる
 * - curesStatusCondition が true の技は、状態異常も治す
 * - 回復も状態異常の回復もできない場合（HP 満タンなど）は失敗する
 * - 対象がひんしの場合は失敗する
 */
export abstract class BaseHealEffect implements IMoveEffect {
  /**
   * 回復の対象
   */
  protected abstract readonly healTarget: HealTarget;

  /**
   * 最大 HP に対する回復割合
   */
  protected abstract readonly healFraction: HealFraction;

  /**
   * 状態異常も治すかどうか
   */
  protected readonly curesStatusCondition: boolean = false;

  /**
   * 回復量を計算する（最低 1 にする処理は呼び出し側で行う）
   * フィールドで割合が変わる技や、4096 基準の補正値を使う技はオーバーライドする
   */
  protected computeHealAmount(maxHp: number, _battleContext: BattleContext): number {
    const { numerator, denominator } = this.healFraction;
    return Math.round((maxHp * numerator) / denominator);
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const target = this.healTarget === 'self' ? attacker : defender;
    if (target.currentHp <= 0) {
      return null;
    }

    const canHeal = target.currentHp < target.maxHp;
    const canCure = this.curesStatusCondition && isMajorStatusCondition(target.statusCondition);
    if (!canHeal && !canCure) {
      return null;
    }

    const healAmount = Math.max(1, this.computeHealAmount(target.maxHp, battleContext));
    const updateData: Partial<BattlePokemonStatus> = {
      ...(canHeal ? { currentHp: Math.min(target.maxHp, target.currentHp + healAmount) } : {}),
      ...(canCure ? { statusCondition: StatusCondition.None } : {}),
    };

    await battleContext.battleRepository.updateBattlePokemonStatus(target.id, updateData);

    const messages: string[] = [];
    if (canHeal) {
      messages.push(
        this.healTarget === 'self' ? 'HP was restored!' : "The target's HP was restored!",
      );
    }
    if (canCure) {
      messages.push('Status condition was cured!');
    }
    return messages.join(' ');
  }
}
