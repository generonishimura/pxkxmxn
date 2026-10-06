import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * パステルベール（Pastel Veil）特性の効果
 * どく・もうどく無効化
 *
 * 注: 味方を守る効果と、場に出たとき味方のどくを治す効果はダブルバトル専用のため扱わない。
 * どく無効は `canReceiveStatusCondition` を参照する箇所（技による状態異常付与）でのみ働く。
 */
export class PastelVeilEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [
    StatusCondition.Poison,
    StatusCondition.BadPoison,
  ] as const;
}
