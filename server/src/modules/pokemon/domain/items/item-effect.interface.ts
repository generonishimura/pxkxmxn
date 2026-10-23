import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { SIDE_TURN_COUNTER_KEYS } from '@/modules/battle/domain/state/side-state';
import { IAbilityEffect } from '../abilities/ability-effect.interface';
import { BattleContext } from '../abilities/battle-context.interface';
import { HitResult } from '../battle-events/hit-result';

/**
 * 残りターン数を決める場の状態（modifyFieldTurns に渡す）
 * - weather: 天候（setWeather）
 * - terrain: フィールド（setTerrain）
 * - sideCondition: 陣営の守り（BaseSideConditionMoveEffect。リフレクターなど）
 */
export type FieldTurnsTarget =
  | { readonly kind: 'weather'; readonly weather: Weather }
  | { readonly kind: 'terrain'; readonly field: Field }
  | { readonly kind: 'sideCondition'; readonly key: (typeof SIDE_TURN_COUNTER_KEYS)[number] };

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
  | 'locksMoveChoice'
  | 'modifyFractionalPriority'
  | 'onEntry'
  | 'onTerrainChange'
  | 'onStatusInflicted'
  | 'onStatChanged'
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

  /**
   * 持ち主が出した場の状態の残りターン数を変える（ひかりのねんど・あついいわ・グランドコートなど）
   * setWeather・setTerrain（出したポケモンを渡したとき）と BaseSideConditionMoveEffect が呼ぶ
   * @param holder 場の状態を出したポケモン（持ち物を持っているポケモン）
   * @param target 出した場の状態
   * @param turns 既定の残りターン数（本家の duration）
   * @returns 変えた残りターン数、変えないなら undefined
   */
  modifyFieldTurns?(
    holder: BattlePokemonStatus,
    target: FieldTurnsTarget,
    turns: number,
  ): number | undefined;

  /**
   * 持ち主が HP を吸い取って回復する量を変える（おおきなねっこ）
   * applyDrainHeal（吸収技・やどりぎのタネ・ちからをすいとる）と、ターン終了時のアクアリング・ねをはるの回復が呼ぶ。
   * ヘドロえきで回復のかわりに受けるダメージも、変えたあとの量になる
   * @param holder 回復するポケモン（持ち物を持っているポケモン）
   * @param amount 回復する量
   * @returns 変えた量、変えないなら undefined
   */
  modifyDrainHeal?(holder: BattlePokemonStatus, amount: number): number | undefined;

  /**
   * 持ち主がかけたバインド状態（しめつける・まきつくなど）のターン終了時のダメージの分母（しめつけバンドは 6。ふつうは 8）
   * VolatileResidualProcessor が、しめつけたポケモン（partialTrap.sourceStatusId）の持ち物で読む
   */
  readonly partialTrapDamageDivisor?: number;

  /**
   * 持ち主は、逃げられない状態・バインド状態・ねをはる・相手の特性（かげふみなど）・フェアリーロックでも交代できる（きれいなぬけがら）
   * PokemonSwitcherService.findSwitchBlocker が読む
   */
  readonly escapesTrapping?: boolean;

  /**
   * 持ち主の状態が変わったあとに、持ち物が条件を確かめて働く（本家の onUpdate）
   * HP が半分以下になった（オボンのみ）、PP が 0 になった（ヒメリのみ）、ちょうはつされた（メンタルハーブ）など、
   * 何で変わったかを問わずに、今の状態だけを見て働く持ち物が使う
   *
   * エンジンは次の場所で呼ぶ（runItemUpdate。持ち主が場にいて、ひんしでないときだけ）
   * - 技のヒットごと: 持ち物の onDamagingHit・onSourceDamagingHit などのあとに、防御側 → 攻撃側の順
   * - 技を出し終えたとき（技を出せなかったときも）: 技を出したポケモン → 相手の順
   * - 技以外のダメージ（applyIndirectDamage）で HP が減ったあと: ダメージを受けたポケモン
   * - ターン終了時: ポケモンごとの処理の最後
   *
   * @param holder 持ち物を持っているポケモン（最新の状態）
   * @returns メッセージ（何もしなければ null）
   */
  onUpdate?(holder: BattlePokemonStatus, battleContext: BattleContext): Promise<string | null>;
}
