import { BasePriorityMoveBlockEffect } from '../base/base-priority-move-block-effect';

/**
 * ビビッドボディ（Dazzling）特性の効果
 * 相手が使う優先度1以上の技を失敗させる（いたずらごころで優先度が上がった変化技も含む）
 * 自分を対象にする技・相手の場を対象にする技は止めない。かたやぶりで無視される
 */
export class DazzlingEffect extends BasePriorityMoveBlockEffect {}
