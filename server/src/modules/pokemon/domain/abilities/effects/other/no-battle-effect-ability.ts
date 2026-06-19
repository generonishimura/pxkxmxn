import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * バトル中に効果を持たない特性の共通実装
 *
 * 用途: 野生エンカウント率や逃走可否のみに影響し、バトル中は何もしない特性。
 *       例:
 *       - にげあし（Run Away）: 野生バトルから必ず逃げられる（バトル中効果なし）
 *       - はっこう（Illuminate）: 野生エンカウント率を上げる（バトル中効果なし、Gen8以前）
 *       - ハッピータイム（Happy Hour）: 賞金が2倍（バトル中効果なし）
 *
 * 単一の stateless インスタンスを複数の特性名にエイリアス登録できる。
 * 既存の MoveRegistry の `NoOpEffect` と同様の設計。
 */
export class NoBattleEffectAbility implements IAbilityEffect {
  // すべてのオプショナルメソッドを実装しない（バトル中は何もしない）
}
