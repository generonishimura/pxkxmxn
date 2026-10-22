import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';

/**
 * 状態異常として扱う特性（本家のたたりめは、ぜったいねむりの相手にも2倍になる）
 */
const COMATOSE_ABILITY_NAME = 'ぜったいねむり';

/**
 * たたりめ（Hex）技の効果
 *
 * 効果: 相手が状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）のとき、威力が2倍になる（65 → 130）
 * 相手の特性がぜったいねむりなら、状態異常がなくても2倍になる。ひるみ・こんらんでは2倍にならない
 */
export class HexEffect implements IMoveEffect {
  modifyMovePower(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const basePower = battleContext.movePower;
    const afflicted =
      isMajorStatus(defender.statusCondition) ||
      battleContext.defenderAbilityName === COMATOSE_ABILITY_NAME;
    if (basePower === null || basePower === undefined || !afflicted) {
      return undefined;
    }
    return basePower * 2;
  }
}
