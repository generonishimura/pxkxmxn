import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';

/**
 * ポイズンヒール（Poison Heal）特性の効果
 * どく・もうどくのとき、ターン終了時にダメージを受ける代わりに最大HPの1/8を回復する
 *
 * - 回復量は最大HPの1/8の切り捨て（最低1）。もうどくでもターン数に関係なく同じ量
 * - HPが満タンなら回復しないが、ダメージも受けない
 * - やけどのダメージは変えない
 */
export class PoisonHealEffect implements IAbilityEffect {
  private static readonly HEAL_DIVISOR = 8;

  async modifyStatusDamage(
    holder: BattlePokemonStatus,
    statusCondition: StatusCondition,
    _damage: number,
    battleContext?: BattleContext,
  ): Promise<number | undefined> {
    if (
      statusCondition !== StatusCondition.Poison &&
      statusCondition !== StatusCondition.BadPoison
    ) {
      return undefined;
    }

    if (
      battleContext?.battleRepository &&
      holder.currentHp > 0 &&
      holder.currentHp < holder.maxHp
    ) {
      const healAmount = Math.max(1, Math.floor(holder.maxHp / PoisonHealEffect.HEAL_DIVISOR));
      await battleContext.battleRepository.updateBattlePokemonStatus(holder.id, {
        currentHp: Math.min(holder.maxHp, holder.currentHp + healAmount),
      });
    }
    return 0;
  }
}
