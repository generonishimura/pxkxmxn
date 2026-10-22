import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * バトル中に効果を持たない特性の共通実装
 *
 * 用途: 野生エンカウント率・逃走可否・バトル後の道具入手のみに影響し、バトル中は何もしない特性。
 *       例:
 *       - にげあし（Run Away）: 野生バトルから必ず逃げられる（バトル中効果なし）
 *       - はっこう（Illuminate）: 野生エンカウント率を上げる（バトル中効果なし、Gen8以前）
 *       - みつあつめ（Honey Gather）: バトル後にあまいミツを拾うことがある（バトル中効果なし）
 *
 * 単一の stateless インスタンスを複数の特性名にエイリアス登録できる。
 * 既存の MoveRegistry の `NoOpEffect` と同様の設計。
 */
export class NoBattleEffectAbility implements IAbilityEffect {
  // すべてのオプショナルメソッドを実装しない（バトル中は何もしない）
}
