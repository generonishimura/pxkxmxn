import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * おいかぜ（Tailwind）技の効果
 *
 * 4 ターン（使ったターンを含む）の間、自分の陣営のポケモンの素早さを 2 倍にする。
 * 素早さの補正と残りターン数の管理はエンジン（行動順の決定・ターン終了時の処理）が行う。すでに吹いていれば失敗する
 * 注: 本家で、おいかぜが吹いたときに自分の場のかぜのりの攻撃が 1 段階上がる効果は、かぜのり側の効果なのでここでは扱わない
 */
export class TailwindEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'tailwindTurns';
  protected readonly turns = 4;
  protected readonly message = 'The Tailwind blew from behind your team!';
}
