import { BaseStatChangeEffect } from './base/base-stat-change-effect';

/**
 * 「サイコキネシス」の特殊効果実装
 *
 * 効果: 10%の確率で相手の特防ランクを1段階下げる
 */
export class PsychicEffect extends BaseStatChangeEffect {
  protected readonly statType = 'specialDefense' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 0.1;
}

