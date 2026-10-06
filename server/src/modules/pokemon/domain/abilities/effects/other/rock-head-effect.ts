import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * いしあたま（Rock Head）特性の効果
 * 与えたダメージに応じた反動（すてみタックル、もろはのずつきなど）を受けない
 *
 * わるあがきの反動と、とびげりなどの外したときの自傷は防がない（本家と同じ）
 */
export class RockHeadEffect implements IAbilityEffect {
  readonly preventsRecoil = true;
}
