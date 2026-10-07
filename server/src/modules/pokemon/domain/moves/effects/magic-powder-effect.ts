import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { IMoveEffect } from '../move-effect.interface';
import { hasType, resolveTypeNames } from '../../battle-events/battle-traits';
import { setTypes } from '../../battle-events/type-change';

/**
 * まほうのこな（Magic Powder）技の効果
 *
 * 相手のタイプをエスパーだけにする（3 つめのタイプも消える。本家の setType）。
 * 相手のタイプがすでにエスパーだけ（3 つめのタイプも含めて判定する）・アルセウス・シルヴァディ・ひんしなら失敗する。
 * 粉技なので、くさタイプの相手には効かない（ぼうじんは特性の isImmuneToMove でエンジンが判定する）。
 */
export class MagicPowderEffect implements IMoveEffect {
  private static readonly PSYCHIC_TYPE_NAME = 'エスパー';

  /** 粉技が効かないタイプ */
  private static readonly POWDER_IMMUNE_TYPE_NAME = 'くさ';

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (await hasType(defender, MagicPowderEffect.POWDER_IMMUNE_TYPE_NAME, battleContext)) {
      return 'But it failed';
    }
    const types = await resolveTypeNames(defender, battleContext);
    if (
      types.join() === MagicPowderEffect.PSYCHIC_TYPE_NAME ||
      !(await setTypes(defender, [MagicPowderEffect.PSYCHIC_TYPE_NAME], battleContext))
    ) {
      return 'But it failed';
    }
    return 'The target transformed into the エスパー type!';
  }
}
