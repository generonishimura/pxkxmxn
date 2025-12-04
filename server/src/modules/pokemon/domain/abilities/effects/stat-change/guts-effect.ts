import { BaseConditionalDamageDealtEffect } from '../base/base-conditional-damage-dealt-effect';

/**
 * はりきり（Guts）特性の効果
 * 状態異常時、攻撃1.5倍
 */
export class GutsEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'statusCondition' as const;
  protected readonly damageMultiplier = 1.5;
}


