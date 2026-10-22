import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { suppressAbility } from '../../battle-events/ability-change';

/**
 * いえき（Gastro Acid）技の効果
 *
 * 相手の特性を消す（volatileState.abilitySuppressed。交代すると戻り、バトンタッチで引き継ぐ）。
 * 相手の特性が消せない特性（cantSuppress。マルチタイプ・ＡＲシステムなど）か、もう消されているなら失敗する
 * 注: とくせいガードで防ぐ効果は扱わない（持ち物の仕組みがない）
 */
export class GastroAcidEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    if (!(await suppressAbility(defender, battleContext))) {
      return 'But it failed';
    }
    return "The target's Ability was suppressed!";
  }
}
