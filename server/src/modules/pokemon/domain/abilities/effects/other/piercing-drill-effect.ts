import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { isContactMove } from '@/modules/pokemon/domain/moves/move-flags';

/**
 * かんつうドリル（Piercing Drill）特性の効果（メガドリュウズ）
 * 自分の接触技が、相手のまもる系を通り抜ける。通り抜けたときのダメージは 1/4 になる
 * （本家の Battle#checkMoveBypassesProtect と、bypassProtect の 0.25 倍）
 *
 * ふかしのこぶしと同じ仕組みで、1/4 は MoveExecutorService が battleContext.brokeThroughProtection を立て、
 * DamageCalculator が掛ける
 */
export class PiercingDrillEffect implements IAbilityEffect {
  bypassesProtection(_holder: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    return isContactMove(battleContext);
  }
}
