import { BaseIdentifyEffect } from './base/base-identify-effect';

/**
 * ミラクルアイ（Miracle Eye）技の効果
 *
 * 相手を miracleEye の状態にする。
 * この状態の相手は、上がった回避ランクが 0 として扱われ、あくタイプにもエスパー技が当たる
 * （エンジンが行う）。相手がすでにこの状態か、みやぶる・かぎわけるを受けていると失敗する。
 * 注: 第 8 世代から本編に出てこない技なので、Showdown の定義（第 7 世代までと同じ動き）に合わせる
 */
export class MiracleEyeEffect extends BaseIdentifyEffect {
  protected readonly kind = 'miracleEye';
}
