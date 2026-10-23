import { BaseConditionalDamageEffect } from '../base/base-conditional-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { isContactMove } from '../../../moves/move-flags';

/**
 * Aura Guard 特性の効果（メガルカリオZ）
 * 接触技で受けるダメージを半分にする（本家の onSourceModifyDamage で 0.5 倍）
 * もふもふと違い、ほのお技のダメージは増えない。防御側の特性なので、かたやぶりで無視される
 *
 * 注: 日本語名が DB にないため、英語名の Aura Guard で登録する
 */
export class AuraGuardEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'custom';
  protected readonly damageMultiplier = 0.5;

  protected checkCustomCondition(
    _pokemon: BattlePokemonStatus,
    _damage: number,
    battleContext?: BattleContext,
  ): boolean {
    return isContactMove(battleContext);
  }
}
