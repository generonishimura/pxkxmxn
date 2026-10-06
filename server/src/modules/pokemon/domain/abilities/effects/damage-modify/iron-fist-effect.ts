import { BaseMoveFlagPowerBoostEffect } from '../base/base-move-flag-power-boost-effect';

/**
 * てつのこぶし（Iron Fist）特性の効果
 * パンチ技（ほのおのパンチ・ドレインパンチ・アームハンマー など）の威力を1.2倍（4915/4096）にする
 */
export class IronFistEffect extends BaseMoveFlagPowerBoostEffect {
  protected readonly boostedFlag = 'punch';
  protected readonly powerModifier = 4915;
}
