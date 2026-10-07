import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * マジックミラー（Magic Bounce）特性の効果
 * はね返せる技（MoveBehaviors の reflectable。でんじは・まきびしなど）を、使用者に返す
 *
 * - 返した技は、この特性を持つポケモンが元の使用者に出す（PP は減らない）
 * - はね返した技は、もう一度はね返されない（両方がマジックミラーでも 1 回で止まる）
 * - 隠れているとき（そらをとぶなど）と、ひんしのときははね返さない
 * - かたやぶりで無視される
 * 処理は MoveExecutorService が bouncesMoves を見て行う
 */
export class MagicBounceEffect implements IAbilityEffect {
  readonly bouncesMoves = true;
}
