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
}

/**
 * 別の技を、技の処理の流れ（特性の無効化・命中判定・ダメージ・追加効果）に乗せて出す関数
 * PP は減らさず、技を出す前の判定（ねむり・まひ・ちょうはつなど）もしない（呼び出した技で済んでいる）。
 * 戻り値は出した技のメッセージ（"Used かえんほうしゃ and dealt 50 damage" など）
 */
export type CallMove = (request: CalledMoveRequest) => Promise<string>;
