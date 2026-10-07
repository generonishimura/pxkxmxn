import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ぜったいねむり（Comatose）特性の効果
 * 状態異常（ねむり・やけど・まひ・どく・もうどく・こおり）にならない。あくびも受けない。
 * 状態異常がないときは、ねむりとして扱う（たたりめ・ゆめくい・いびき・あくむ・ねむる）
 *
 * - こんらん・ひるみは防がない（本家と同じ）
 * - かたやぶりでは無視されない（本家の breakable を持たない特性）
 *
 * 注: 本家では ねごと が出せ、めざましビンタ の威力が 2 倍になるが、ねごと は技の効果が未登録で、
 *     めざましビンタ の威力 2 倍もねむりの相手を含めて未実装のため、まだ効かない
 * 注: 本家の「いえき・スキルスワップ・なりきりなどで消せない・写せない」性質は、
 *     特性にその印がないため扱っていない
 */
export class ComatoseEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [
    StatusCondition.Sleep,
    StatusCondition.Burn,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.BadPoison,
    StatusCondition.Freeze,
  ] as const;
  readonly treatedAsStatusCondition = StatusCondition.Sleep;
  readonly unaffectedByMoldBreaker = true;
}
