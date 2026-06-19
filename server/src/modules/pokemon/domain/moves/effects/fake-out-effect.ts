import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ねこだまし」の特殊効果実装
 *
 * 効果: 1.0の確率で相手にひるみを付与
 * 注: 「場に出た最初のターンのみ使用可能」は engine 未整備（turn counter / first-turn フラグが必要）
 */
export class FakeOutEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
