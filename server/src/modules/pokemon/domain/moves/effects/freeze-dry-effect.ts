import { IMoveEffect } from '../move-effect.interface';

/**
 * フリーズドライ（Freeze-Dry）技の効果
 *
 * みずタイプへの相性を 2 倍にする（タイプ相性表では 0.5 倍。本家の onEffectiveness）。
 * みず・じめんなら 4 倍、みず・ほのおなら 1 倍になる。
 * チャンピオンズでは、こおりにする追加効果はない（SV は 10%）
 */
export class FreezeDryEffect implements IMoveEffect {
  readonly typeEffectivenessOverrides: Readonly<Record<string, number>> = { みず: 2 };
}
