import { BaseStatDropImmunityEffect } from '../base/base-stat-drop-immunity-effect';

/**
 * はとむね（Big Pecks）特性の効果
 * 防御ランクが下がらない
 */
export class BigPecksEffect extends BaseStatDropImmunityEffect {
  protected readonly protectedStat = 'defense' as const;
}
