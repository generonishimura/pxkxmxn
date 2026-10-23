import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「アイアンヘッド」の特殊効果実装
 *
 * 効果: 0.2の確率で相手にひるみを付与（チャンピオンズの値。SV は 0.3）
 */
export class IronHeadEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.2;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
