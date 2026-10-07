import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { setTypes } from '../../battle-events/type-change';

/**
 * フィールドごとの、ほごしょくで変わるタイプ（本家の Camouflage の onHit）
 */
const TYPE_BY_FIELD: Readonly<Record<Field, string>> = {
  [Field.None]: 'ノーマル',
  [Field.ElectricTerrain]: 'でんき',
  [Field.GrassyTerrain]: 'くさ',
  [Field.MistyTerrain]: 'フェアリー',
  [Field.PsychicTerrain]: 'エスパー',
};

/**
 * ほごしょく（Camouflage）技の効果
 * 使用者のタイプを、今のフィールドに合わせた 1 つのタイプにする（足されたタイプも消える）
 * エレキフィールド→でんき、グラスフィールド→くさ、ミストフィールド→フェアリー、サイコフィールド→エスパー、
 * フィールドがなければノーマル
 *
 * - 今のタイプがそのタイプだけなら失敗する（本家と同じく、足されたタイプも含めて比べる）
 * - アルセウス・シルヴァディ・ひんしのときは失敗する（setTypes）
 */
export class CamouflageEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const typeName = TYPE_BY_FIELD[battleContext.battle.field ?? Field.None];
    const currentTypeNames = await resolveTypeNames(attacker, battleContext);
    if (
      currentTypeNames.join() === typeName ||
      !(await setTypes(attacker, [typeName], battleContext))
    ) {
      return 'But it failed';
    }
    return `became the ${typeName} type!`;
  }
}
