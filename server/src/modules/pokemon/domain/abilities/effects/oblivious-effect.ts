import { BaseStatusConditionImmunityEffect } from './base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * どんかん（Oblivious）特性の効果
 * メロメロ・あくび無効化
 * 注: メロメロとあくびは状態異常ではないため、実装を簡略化してねむり無効化として実装
 * （実際のゲームではメロメロ・あくびは状態異常とは別のメカニズムだが、ここでは状態異常として扱う）
 */
export class ObliviousEffect extends BaseStatusConditionImmunityEffect {
  // 注: 実際のゲームではメロメロ・あくびは別のメカニズムだが、
  // ここでは簡略化のため、ねむり無効化として実装
  // 将来的にメロメロ・あくびのメカニズムが実装されたら、それに対応する
  protected readonly immuneStatusConditions = [StatusCondition.Sleep] as const;
}
