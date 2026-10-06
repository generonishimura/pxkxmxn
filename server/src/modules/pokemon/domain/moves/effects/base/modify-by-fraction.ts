/**
 * 値に「分子 / 分母」の割合を、本家と同じ 4096 基準の補正値として掛ける
 *
 * 1. 割合を 4096 倍して切り捨て、補正値にする（例: 0.667 → 2732、1/2 → 2048、1/4 → 1024）
 * 2. 値 × 補正値 ÷ 4096 を、端数がちょうど 0.5 のときは切り捨て、それ以外は四捨五入する
 *
 * 2/3 の回復は本家では 0.667 として扱うため、{ numerator: 667, denominator: 1000 } を渡す
 *
 * @param value 元の値（例: 最大 HP）
 * @param fraction 掛ける割合
 * @returns 補正後の値
 */
export const modifyByFraction = (
  value: number,
  fraction: { numerator: number; denominator: number },
): number => {
  const modifier = Math.trunc((fraction.numerator * 4096) / fraction.denominator);
  return Math.trunc((Math.trunc(value * modifier) + 2047) / 4096);
};
