import { BaseMoveFlagPowerBoostEffect } from '../base/base-move-flag-power-boost-effect';

/**
 * がんじょうあご（Strong Jaw）特性の効果
 * かみつき技（かみくだく・サイコファング・エラがみ など）の威力を1.5倍（6144/4096）にする
 */
export class StrongJawEffect extends BaseMoveFlagPowerBoostEffect {
  protected readonly boostedFlag = 'bite';
  protected readonly powerModifier = 6144;
}
