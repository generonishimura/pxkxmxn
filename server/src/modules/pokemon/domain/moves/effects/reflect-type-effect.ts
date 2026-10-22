import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TYPELESS_TYPE_NAME } from '@/modules/battle/domain/logic/effective-traits';
import { BattleContext } from '../../abilities/battle-context.interface';
import { IMoveEffect } from '../move-effect.interface';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { setTypes } from '../../battle-events/type-change';

/**
 * ミラータイプ（Reflect Type）技の効果
 *
 * 使用者のタイプを相手のタイプと同じにする（本家の Reflect Type）。
 * - 写すのは相手の実効のタイプ（3 つめのタイプを除く。はねやすめでひこうを失っていれば、それも反映する）から、
 *   タイプなし（???）を除いたもの
 * - 写すタイプが残らないとき、相手に 3 つめのタイプがあればノーマルにし、なければ失敗する
 * - 使用者の 3 つめのタイプは、相手の 3 つめのタイプに置き換える（相手になければ消える）
 * - 使用者がアルセウス・シルヴァディ・ひんしなら失敗する（setTypes）
 */
export class ReflectTypeEffect implements IMoveEffect {
  private static readonly NORMAL_TYPE_NAME = 'ノーマル';

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const addedType = defender.volatileState.addedType;
    const reflected = (
      await resolveTypeNames(defender, battleContext, { excludeAddedType: true })
    ).filter(name => name !== TYPELESS_TYPE_NAME);
    const fallback = addedType !== undefined ? [ReflectTypeEffect.NORMAL_TYPE_NAME] : [];
    const typeNames = reflected.length > 0 ? reflected : fallback;
    if (typeNames.length === 0 || !(await setTypes(attacker, typeNames, battleContext))) {
      return 'But it failed';
    }
    if (addedType !== undefined && battleContext.battleRepository) {
      await battleContext.battleRepository.patchVolatileState(attacker.id, { addedType });
    }
    return "The user's type became the same as the target's type!";
  }
}
