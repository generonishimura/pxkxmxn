import { IItemEffect } from '../item-effect.interface';

/**
 * しめつけバンド（Binding Band）
 * 持ち主がかけたバインド状態（しめつける・まきつく・ほのおのうずなど）のターン終了時のダメージが、
 * 最大 HP の 1/8 から 1/6 になる
 *
 * ダメージはエンジン（VolatileResidualProcessor）が、しめつけたポケモンの持ち物の partialTrapDamageDivisor で決める
 * 注: バインド状態にする技は、まだ登録していない
 */
export class BindingBandEffect implements IItemEffect {
  readonly partialTrapDamageDivisor = 6;
}
