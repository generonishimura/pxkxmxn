import { BaseContactStatChangeEffect } from '../base/base-contact-stat-change-effect';

/**
 * ぬめぬめ（Gooey）特性の効果
 * 接触技を受けたとき、攻撃側の素早さを1段階下げる
 * 注: 接触技の判定は物理技で近似している（既存の接触系特性と同じ）。
 */
export class GooeyEffect extends BaseContactStatChangeEffect {
  protected readonly target = 'attacker' as const;
  protected readonly statChanges = [{ statType: 'speed', rankChange: -1 }] as const;
}
