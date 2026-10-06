import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * マジックガード（Magic Guard）特性の効果
 * 攻撃技によるダメージ以外のダメージを受けない
 *
 * 注: 今は与えたダメージに応じた反動（すてみタックル、もろはのずつきなど）だけを防ぐ。
 *     どく・やけど・天候のダメージ、わるあがきの反動、外したときの自傷は防がない
 */
export class MagicGuardEffect implements IAbilityEffect {
  readonly preventsRecoil = true;
}
