import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * くいしんぼう（Gluttony）特性の効果
 * HP が最大 HP の 1/4 以下で食べるきのみ（フィラのみ・チイラのみなど）を、1/2 以下で食べる
 *
 * - 判定は isPinchBerryHp（battle-events/eat-item.ts）が行う
 * 注: チャンピオンズの持ち物には HP 1/4 以下で食べるきのみがないので、今は効果がない
 *   （オボンのみ・オレンのみは、もとから 1/2 以下で食べる）
 */
export class GluttonyEffect implements IAbilityEffect {
  readonly eatsPinchBerriesEarly = true;
}
