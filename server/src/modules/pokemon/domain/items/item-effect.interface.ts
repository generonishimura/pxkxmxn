import { IAbilityEffect } from '../abilities/ability-effect.interface';

/**
 * 持ち物の効果
 *
 * 特性と同じ場面で働く効果は、特性のフックと同じ名前・同じ引数にしている。
 * エンジンは、特性のフックを呼ぶ場所のあとで、持ち主の持ち物の同じフックを呼ぶ。
 * 1 つ目の引数は持ち物を持っているポケモン。
 *
 * 呼ぶ場所がつながっているフックだけをここに並べる。持ち物に新しいフックが要るときは、
 * ここに足して、エンジンの呼ぶ場所もつなぐ（docs/battle-engine-hooks.md の「持ち物のフック」）
 */
export type IItemEffect = Pick<
  IAbilityEffect,
  | 'modifyBasePower'
  | 'modifyDamageDealt'
  | 'modifyDamage'
  | 'modifySpeed'
  | 'onTurnEnd'
  | 'modifyAccuracy'
  | 'modifyEvasion'
  | 'modifyCritRatio'
  | 'onAfterMoveSecondarySelf'
>;
