/**
 * 攻撃技が当たったときの情報
 * 特性の onDamagingHit / onSourceDamagingHit（ヒットごと）と onAfterMoveHit（技全体）に渡す
 */
export interface HitResult {
  /**
   * 実際に減らしたHP（残りHPを超えた分は含めない）
   * onAfterMoveHit では、技のすべてのヒットの合計
   */
  readonly damage: number;

  /**
   * ダメージを受ける前の防御側のHP
   * onAfterMoveHit では、技を受ける前のHP（いかりのこうら・ぎゃくじょうの「半分を下回ったか」の判定用）
   */
  readonly hpBefore: number;

  /**
   * 何回目のヒットか（0始まり）。onAfterMoveHit では最後のヒット
   */
  readonly hitIndex: number;

  /**
   * ここまでのヒット数
   */
  readonly hitCount: number;

  /**
   * 接触技か（isContactMove の結果。えんかくなどで接触しなくなった技は false）
   */
  readonly isContact: boolean;

  /**
   * 技のタイプ名（タイプ変更の反映後、例: "あく"）
   */
  readonly moveTypeName: string;

  /**
   * 技の分類
   */
  readonly moveCategory: 'Physical' | 'Special' | 'Status';

  /**
   * このヒット（onAfterMoveHit では技全体）で防御側がひんしになったか
   */
  readonly targetFainted: boolean;
}
