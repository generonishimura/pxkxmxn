import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * スイートベール（Sweet Veil）特性の効果
 * ねむり無効化
 *
 * 注: シングルバトルでは自分だけを守る（味方を守る効果は扱わない）。あくびによるねむけは未実装のため対象外。
 */
export class SweetVeilEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Sleep] as const;
}
