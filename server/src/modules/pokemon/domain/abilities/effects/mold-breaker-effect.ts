import { IAbilityEffect } from '../ability-effect.interface';

/**
 * かたやぶり（Mold Breaker）特性の効果
 * 相手の特性を無視して攻撃する
 *
 * この特性は、攻撃側が持っている場合、防御側の以下の特性効果を無視します：
 * - タイプ無効化（例: ふゆう、ちくでん、もらいびなど）
 * - ダメージ修正（例: マルチスケイル、あついしぼうなど）
 * - 回避率修正（例: すなかき、すいすいなど）
 * - 状態異常無効化（例: ふみん、どんかん、めんえきなど）
 *
 * 実装の詳細:
 * この特性自体は何も効果を発動しません（Passive特性として定義されているが、実際には何も効果を発動しない）。
 * 各処理（DamageCalculator、AccuracyCalculatorなど）で、攻撃側がかたやぶりを持っているかチェックし、
 * 持っている場合は防御側の特性効果をスキップします。
 */
export class MoldBreakerEffect implements IAbilityEffect {
  // このクラスは空の実装です。特性効果は各処理でAbilityRegistry.hasMoldBreaker()を呼び出して判定されます。
}
