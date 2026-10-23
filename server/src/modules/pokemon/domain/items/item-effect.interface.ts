import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../abilities/ability-effect.interface';
import { BattleContext } from '../abilities/battle-context.interface';
import { HitResult } from '../battle-events/hit-result';

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

  /**
   * 攻撃側: 攻撃技で相手の HP を減らしたあと、技全体で 1 回（かいがらのすず。本家の onAfterMoveSecondarySelf）
   * 防御側の onAfterMoveHit の攻撃側版
   * 呼ぶ場所: MoveExecutorService の技全体のあと（防御側の特性の onAfterMoveHit のあと、攻撃側の特性の onKnockOut の前）。
   * 合計ダメージが 1 以上で、持ち主がひんしでないとき。みがわりにだけ当たったときは呼ばない
   * @param holder 持ち主（攻撃側。最新の状態）
   * @param target 技を受けた相手（最新の状態）
   * @param hit 技全体の情報（damage は全ヒットの合計）
   */
  onSourceAfterMoveHit?(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    hit: HitResult,
    battleContext: BattleContext,
  ): Promise<string | null>;

  /**
   * 防御側: 相手の攻撃技を受けたあと、持ち主が控えと交代し、持ち物を使い切る（だっしゅつボタン）
   * 参照する場所: MoveExecutorService の技のあとの交代（ききかいひと同じ場所）。持ち主がひんしでなく、控えがいて、
   * ドラゴンテールなどで交代させられないときだけ。使ったら、相手のとんぼがえりなどの交代は起きない
   */
  readonly switchesOutAfterHit?: boolean;

  /**
   * 防御側: 相手の攻撃技を受けたあと、攻撃側を控えとランダムに入れ替え、持ち物を使い切る（レッドカード）
   * 参照する場所: MoveExecutorService の技のあとの交代。持ち主と攻撃側がひんしでなく、攻撃側に控えがいて、
   * 持ち主がドラゴンテールなどで交代させられないときだけ。攻撃側がねをはっている・preventsForcedSwitch の特性なら、
   * 入れ替えないが持ち物は使い切る（本家と同じ）。入れ替えたら、攻撃側のとんぼがえりなどの交代は起きない
   */
  readonly forcesAttackerOutAfterHit?: boolean;
}
