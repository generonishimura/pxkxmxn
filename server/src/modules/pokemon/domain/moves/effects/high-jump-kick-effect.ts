import { BaseCrashDamageEffect } from './base/base-crash-damage-effect';

/**
 * とびひざげり（High Jump Kick）技の効果
 *
 * 効果: 外れたときと、まもる系に防がれたとき、使用者が最大HPの半分のダメージを受ける
 *
 * 注: タイプ相性で無効化されたとき（ゴーストタイプ相手など）は自傷しない。
 *     エンジンが命中判定で外れたときと、まもる系に防がれたときだけ onMiss を呼ぶため
 */
export class HighJumpKickEffect extends BaseCrashDamageEffect {}
