import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * りゅうのあぎと（Dragon's Maw）特性の効果
 * ドラゴンタイプの技の威力1.5倍
 */
export class DragonsMawEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['ドラゴン'] as const;
  protected readonly damageMultiplier = 1.5;
}
