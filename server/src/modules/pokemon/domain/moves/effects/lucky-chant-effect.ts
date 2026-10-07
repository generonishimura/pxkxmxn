import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * おまじない（Lucky Chant）技の効果
 *
 * 5 ターンの間、自分の陣営のポケモンは相手の技で急所に当たらない。
 * この技は陣営に luckyChantTurns を書くだけで、急所を防ぐのはエンジン
 * （MoveExecutorService の急所の判定が、防御側の陣営を preventsCriticalHit で調べる）。
 * 残りターン数の管理はエンジン（ターン終了時の処理）が行う。すでに張っていれば失敗する
 * 第 8 世代以降は使えない技だが、DB にあるので登録する
 */
export class LuckyChantEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'luckyChantTurns';
  protected readonly turns = 5;
  protected readonly message = 'The Lucky Chant shielded your team from critical hits!';
}
