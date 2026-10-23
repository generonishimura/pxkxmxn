import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../abilities/ability-effect.interface';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * 持ち物の効果
 *
 * 特性と同じ場面で働く効果は、特性のフックと同じ名前・同じ引数にしている。
 * エンジンは、特性のフックを呼ぶ場所のあとで、持ち主の持ち物の同じフックを呼ぶ。
 * 1 つ目の引数は持ち物を持っているポケモン。
 *
 * 呼ぶ場所がつながっているフックだけをここに並べる。持ち物に新しいフックが要るときは、
 * ここに足して、エンジンの呼ぶ場所もつなぐ（docs/battle-engine-hooks.md の「持ち物のフック」）
 * 特性に同じ場面のフックがないものだけ、持ち物だけのフックとして ItemOnlyEffect に置く
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
  | 'isImmuneToType'
  | 'onDamagingHit'
  | 'onSourceDamagingHit'
> &
  ItemOnlyEffect;

/**
 * 持ち物だけのフック（特性に同じ場面のフックがないもの）
 */
export interface ItemOnlyEffect {
  /**
   * 防御側: 技のヒットでひんしになるダメージを受けるとき、HP を 1 残すか（きあいのタスキ・きあいのハチマキ。
   * 本家の onDamage で target.hp - 1 を返すもの）
   * 呼ぶ場所: MoveExecutorService のヒットのループで、HP を減らす前。こらえるで残るヒット・みがわりに当たったヒット・
   * 特性で防いだヒットでは呼ばない
   * @param holder ダメージを受ける前の持ち主
   * @param damage このヒットのダメージ（holder.currentHp 以上）
   * @returns HP を 1 残すならメッセージ、残さないなら null
   */
  endureHit?(
    holder: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null>;
}
