import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「キノコのほうし」の特殊効果実装
 *
 * 効果: 必ず相手をねむり状態にする
 * 制約: 粉技のためくさタイプには無効
 */
export class SporeEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Sleep;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = ['くさ'];
  protected readonly message = 'fell asleep!';
}
