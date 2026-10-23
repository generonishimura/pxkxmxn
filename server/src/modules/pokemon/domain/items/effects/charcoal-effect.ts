import { BaseTypeBoostItemEffect } from './base-type-boost-item-effect';

/**
 * もくたん（Charcoal）
 * ほのおタイプの技の威力を 1.2 倍にする
 */
export class CharcoalEffect extends BaseTypeBoostItemEffect {
  protected readonly boostedType = 'ほのお';
}
