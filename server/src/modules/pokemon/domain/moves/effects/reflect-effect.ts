import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * リフレクター（Reflect）技の効果
 *
 * 5 ターンの間（使ったターンを含む）、自分の陣営のポケモンが受ける物理技のダメージを半分にする。
 * 半分にするのはエンジン（DamageCalculator。急所・すりぬけでは効かない）が行う。すでに張っていれば失敗する
 * 注: 持ち物の仕組みがないので、ひかりのねんど（8 ターンになる）には対応していない
 */
export class ReflectEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'reflectTurns';
  protected readonly turns = 5;
  protected readonly message = 'Reflect made the team stronger against physical moves!';
}
