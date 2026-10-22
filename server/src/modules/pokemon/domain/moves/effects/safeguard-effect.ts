import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * しんぴのまもり（Safeguard）技の効果
 *
 * 5 ターンの間、自分の陣営のポケモンは相手から状態異常・こんらん・あくびを受けない（すりぬけの技は通る）。
 * 防ぐのはエンジン（canInflictStatus・canApplyVolatile）が行う。すでに張っていれば失敗する
 */
export class SafeguardEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'safeguardTurns';
  protected readonly turns = 5;
  protected readonly message = 'The user shrouded itself in a mystical veil!';
}
