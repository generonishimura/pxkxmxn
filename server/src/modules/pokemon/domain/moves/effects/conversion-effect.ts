import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasType } from '../../battle-events/battle-traits';
import { setTypes } from '../../battle-events/type-change';

/**
 * テクスチャー（Conversion）技の効果
 *
 * 効果: 自分のタイプを、1 つめの欄の技のタイプだけにする（第 6 世代から）
 * - 技のもとのタイプを使う（ものまね・へんしんで入れ替わった欄は、入れ替わった技のタイプ）
 * - そのタイプをもう持っていれば失敗する。アルセウス・シルヴァディは失敗する
 * 注: 欄の順は、バトル中の技（BattlePokemonMove）の ID の小さい順とみなす
 */
export class ConversionEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository || !battleContext.moveRepository) {
      return null;
    }
    const moves =
      (await repository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id)) ?? [];
    const sorted = [...moves].sort((a, b) => a.id - b.id);
    const firstSlot = resolveMoveSlots(sorted, attacker.volatileState)[0];
    const move = firstSlot ? await battleContext.moveRepository.findById(firstSlot.moveId) : null;
    if (!move) {
      return 'But it failed';
    }
    const typeName = move.type.name;
    if (
      (await hasType(attacker, typeName, battleContext)) ||
      !(await setTypes(attacker, [typeName], battleContext))
    ) {
      return 'But it failed';
    }
    return `transformed into the ${typeName} type!`;
  }
}
