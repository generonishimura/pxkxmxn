import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * マイペース（Own Tempo）特性の効果
 * こんらんにならない（こんらんは volatileState.confusionTurns。付与は canInflictStatus を通る）
 *
 * 注: いかくを受けない効果（第8世代から）は、まだ作っていない
 */
export class OwnTempoEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Confusion] as const;
}
