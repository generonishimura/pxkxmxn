import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * 別の技を出すときの指定（ゆびをふる・ねごと・まねっこ・オウムがえし・さきどり・ねこのて・
 * しぜんのちから・さいはい・おどりこ・よこどり）
 *
 * battleContext.callMove に渡す。技は moveId か moveName のどちらかで指定する
 */
export interface CalledMoveRequest {
  /** 出す技（Move の ID） */
  readonly moveId?: number;
  /** 出す技（DB の技名）。moveId がないときに使う */
  readonly moveName?: string;
  /** 技を出すポケモン。省略すると今の技の使用者（さいはい・おどりこ・よこどりは別のポケモン） */
  readonly user?: BattlePokemonStatus;
  /** 技を受けるポケモン。省略すると user の相手（シングルバトルでは場の相手） */
  readonly target?: BattlePokemonStatus;
  /** 呼び出した技・特性の名前（メッセージ用。例: 'ゆびをふる'） */
  readonly calledBy: string;
  /** 技の威力に掛ける倍率（さきどり = 1.5）。4096 分率で丸める */
  readonly powerMultiplier?: number;
  /**
   * true なら、技を出すポケモンの技を出す前の判定（ねむり・まひ・ひるみ・こんらん・ちょうはつ・かなしばりなど）をする。
   * 止まったら技を出さず、そのメッセージを返す（おどりこ・さいはい）
   */
  readonly runBeforeMoveChecks?: boolean;
  /**
   * true なら、技を出すポケモンが自分で技を出したのと同じに扱う。その技の欄の PP を減らし（プレッシャーも）、
   * そのポケモンの lastMoveId・こだわりなどを書く（さいはい）
   */
  readonly consumePp?: boolean;
}

/**
 * 別の技を、技の処理の流れ（特性の無効化・命中判定・ダメージ・追加効果）に乗せて出す関数
 * 既定では PP は減らさず、技を出す前の判定（ねむり・まひ・ちょうはつなど）もしない（呼び出した技で済んでいる）。
 * 別のポケモンに技を出させるとき（おどりこ・さいはい）は runBeforeMoveChecks・consumePp で変えられる。
 * 戻り値は出した技のメッセージ（"Used かえんほうしゃ and dealt 50 damage" など）
 */
export type CallMove = (request: CalledMoveRequest) => Promise<string>;
