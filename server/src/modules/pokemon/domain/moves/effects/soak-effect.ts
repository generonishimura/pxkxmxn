import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { setTypes } from '../../battle-events/type-change';

/**
 * みずびたし（Soak）技の効果
 *
 * 効果: 相手のタイプをみずタイプだけにする（3 つめのタイプも消える。本家の setType）
 * - 相手がもうみずタイプだけなら失敗する（3 つめのタイプが足されていれば成功する）
 * - アルセウス・シルヴァディのタイプは変えられず失敗する
 */
export class SoakEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const types = await resolveTypeNames(defender, battleContext);
    if (types.join() === 'みず' || !(await setTypes(defender, ['みず'], battleContext))) {
      return 'But it failed';
    }
    return 'transformed into the みず type!';
  }
}
