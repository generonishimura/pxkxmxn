import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * しろいきり（Mist）技の効果
 *
 * 5 ターンの間、自分の陣営のポケモンは相手に能力を下げられない（すりぬけの技は通る）。
 * 防ぐのはエンジン（applyStatChanges）が行う。すでに張っていれば失敗する
 */
export class MistEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'mistTurns';
  protected readonly turns = 5;
  protected readonly message = 'The user shrouded itself in a white mist!';
}
