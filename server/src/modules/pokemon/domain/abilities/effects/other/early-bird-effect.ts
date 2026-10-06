import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * はやおき（Early Bird）特性の効果
 * ねむりのターンが2倍の速さで進み、早く目を覚ます
 *
 * 注: 本家は行動しようとしたときにねむりのターンを減らすが、ここではターン終了時に進める
 */
export class EarlyBirdEffect implements IAbilityEffect {
  readonly sleepTurnMultiplier = 2;
}
