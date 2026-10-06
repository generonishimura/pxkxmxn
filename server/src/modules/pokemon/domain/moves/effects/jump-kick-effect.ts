import { BaseCrashDamageEffect } from './base/base-crash-damage-effect';

/**
 * とびげり（Jump Kick）技の効果
 *
 * 効果: 外れたとき、使用者が最大HPの半分のダメージを受ける
 *
 * 注: タイプ相性で無効化されたとき（ゴーストタイプ相手など）は自傷しない。
 *     エンジンが命中判定で外れたときだけ onMiss を呼ぶため。まもるも未実装のため、まもるで防がれたときの自傷も発生しない
 */
export class JumpKickEffect extends BaseCrashDamageEffect {}
