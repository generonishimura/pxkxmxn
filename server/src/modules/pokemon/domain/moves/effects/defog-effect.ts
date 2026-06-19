import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「きりばらい」の特殊効果実装
 *
 * 効果: 相手の回避ランクを 1 段階下げる
 * 注: 相手側のフィールド効果（リフレクター・ひかりのかべ・しんぴのまもり等）の解除は
 *     現状の engine には対応するフックがなく、別処理として扱う（フィールド state 拡張が必要）
 */
export class DefogEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'evasion';
  protected readonly rankChange = -1;
}
