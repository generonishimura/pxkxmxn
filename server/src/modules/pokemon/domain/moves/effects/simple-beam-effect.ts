import { BaseSetTargetAbilityEffect } from './base/base-set-target-ability-effect';

/**
 * シンプルビーム（Simple Beam）技の効果
 *
 * 相手の特性をたんじゅんにする（能力ランクの変化が 2 倍になる）。
 * 相手の今の特性がたんじゅん・なまけか、消せない特性（スワームチェンジなど）なら失敗する
 * 注: とくせいガードで防ぐ効果は扱わない（持ち物の仕組みがない）
 */
export class SimpleBeamEffect extends BaseSetTargetAbilityEffect {
  protected readonly abilityName = 'たんじゅん';
  protected readonly failingAbilityNames = ['たんじゅん', 'なまけ'];
}
