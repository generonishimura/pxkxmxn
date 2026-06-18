import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * リーフガード（Leaf Guard）特性の効果
 * 晴れの間、すべての主要状態異常（やけど・まひ・どく・もうどく・ねむり・こおり）を無効化する
 *
 * 既存の単一状態異常を無効化する特性（みずのベール等）と異なり、天候条件付きで全状態を無効化
 */
export class LeafGuardEffect implements IAbilityEffect {
  private static readonly IMMUNE_STATUS_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
    StatusCondition.Burn,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.BadPoison,
    StatusCondition.Sleep,
    StatusCondition.Freeze,
  ]);

  canReceiveStatusCondition(
    _pokemon: BattlePokemonStatus,
    statusCondition: StatusCondition,
    battleContext?: BattleContext,
  ): boolean | undefined {
    if (!battleContext) {
      return undefined;
    }
    const weather = battleContext.weather ?? battleContext.battle?.weather ?? null;
    if (weather !== Weather.Sun) {
      return undefined;
    }
    if (LeafGuardEffect.IMMUNE_STATUS_CONDITIONS.has(statusCondition)) {
      return false;
    }
    return undefined;
  }
}
