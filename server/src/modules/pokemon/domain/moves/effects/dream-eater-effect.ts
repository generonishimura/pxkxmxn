import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { applyDrainHeal, calculateDrainAmount } from '../../battle-events/drain-heal';

/**
 * ゆめくい（Dream Eater）技の効果
 * 相手がねむりのときだけ当たり、与えたダメージの半分だけ HP を回復する
 *
 * - 相手がねむりでなければ、命中判定の前に失敗する（PP だけ減る）
 * - 相手の特性が ぜったいねむり なら、ねむりと同じく当たる（本家と同じ）
 * - 回復量は与えたダメージ × 1/2 の四捨五入（最低1）。最大 HP を超えない
 * - 相手がヘドロえきなら、回復せずに同じ量のダメージを受ける（applyDrainHeal）
 */
export class DreamEaterEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    const asleep =
      defender.statusCondition === StatusCondition.Sleep ||
      battleContext.defenderAbilityName === 'ぜったいねむり';
    return !asleep;
  }

  async afterDamage(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const { healed, damaged } = await applyDrainHeal(
      attacker,
      defender,
      calculateDrainAmount(damage, 0.5),
      battleContext,
    );
    if (healed > 0) {
      return 'HP was restored!';
    }
    if (damaged > 0) {
      return 'sucked up the liquid ooze!';
    }
    return null;
  }
}
