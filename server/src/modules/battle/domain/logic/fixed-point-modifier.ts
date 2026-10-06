/**
 * 4096分率の補正値
 */
const FIXED_POINT_BASE = 4096;

/**
 * ゲーム本体と同じ 4096 分率で補正を掛ける（Pokemon Showdown の modify と同じ丸め）
 *
 * 計算: floor((value × floor(numerator × 4096 / denominator) + 2047) / 4096)
 * ちょうど 0.5 の端数は切り捨て、それより大きい端数は切り上げる（五捨五超入）
 *
 * 例: 1.2倍 = modifyByFixedPoint(power, 4915)、1.3倍 = modifyByFixedPoint(power, 5325)
 *
 * @param value 補正前の値（威力・ダメージなど）
 * @param numerator 補正の分子（denominator を省略した場合は 4096 分率）
 * @param denominator 補正の分母
 * @returns 補正後の値
 */
export const modifyByFixedPoint = (
  value: number,
  numerator: number,
  denominator: number = FIXED_POINT_BASE,
): number => {
  const modifier = Math.trunc((numerator * FIXED_POINT_BASE) / denominator);
  return Math.trunc((Math.trunc(value * modifier) + FIXED_POINT_BASE / 2 - 1) / FIXED_POINT_BASE);
};
