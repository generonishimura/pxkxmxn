import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「フラフラダンス」の特殊効果実装
 *
 * 効果: 必ず相手をこんらんにする (Confuses the target)
 * 注: 本来は場のすべてのポケモンを対象とするが、現状は単体対象として実装
 */
export class TeeterDanceEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Confusion;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'became confused!';
}
