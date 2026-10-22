import { BaseMoveFlagImmunityEffect } from '../base/base-move-flag-immunity-effect';

/**
 * ぼうだん（Bulletproof）特性の効果
 * 相手の弾の技（シャドーボール・ヘドロばくだん・タマゴばくだん など）を無効にする。
 * かたやぶりで無視される。
 */
export class BulletproofEffect extends BaseMoveFlagImmunityEffect {
  protected readonly immuneFlag = 'ballistic';
}
