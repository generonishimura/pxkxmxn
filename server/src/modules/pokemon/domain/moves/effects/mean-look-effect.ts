import { BaseTrapMoveEffect } from './base/base-trap-move-effect';

/**
 * くろいまなざし（Mean Look）技の効果
 *
 * 相手を逃げられなくする（使用者が場にいる間は交代できない。ゴーストタイプは交代できる）。
 * 相手がすでに逃げられない状態・ゴーストタイプなら失敗する（BaseTrapMoveEffect）
 */
export class MeanLookEffect extends BaseTrapMoveEffect {}
