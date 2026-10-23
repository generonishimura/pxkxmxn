import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ねんちゃく（Sticky Hold）特性の効果
 * 持ち物をほかのポケモンに奪われない・入れ替えられない
 *
 * - トリック・すりかえは、持ち主が持ち物を持っていなくても失敗する（本家の onTryImmunity）
 * - 自分で手放すギフトパスは止めない（本家は source が自分なら止めない）
 * - 相手の技なので、かたやぶりで無視される
 * - 判定は持ち物の補助関数（battle-events/item-transfer.ts の blocksItemRemoval）が行う
 */
export class StickyHoldEffect implements IAbilityEffect {
  readonly preventsItemRemoval = true;
}
