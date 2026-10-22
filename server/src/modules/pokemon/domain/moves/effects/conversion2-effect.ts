import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { findResistingTypeNames, setTypes } from '../../battle-events/type-change';

/**
 * テクスチャー２（Conversion 2）技の効果
 *
 * 効果: 相手が最後に使った技のタイプを半減以下（無効を含む）にするタイプから、ランダムに 1 つ選んで自分のタイプにする（第 5 世代から）
 * - 相手が最後に使った技のタイプは、タイプを変える効果を反映したもの（volatileState.lastMoveTypeName。本家の lastMoveUsed.type）
 * - 自分がもう持っているタイプは選ばない。相手がまだ技を使っていない・選べるタイプがない・アルセウス・シルヴァディなら失敗する
 * - みがわりを無視し、まもるで防がれない（技の表に書いてある）
 */
export class Conversion2Effect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const attackTypeName = defender.volatileState.lastMoveTypeName;
    if (attackTypeName === undefined) {
      return 'But it failed';
    }
    const ownTypes = await resolveTypeNames(attacker, battleContext);
    const candidates = (await findResistingTypeNames(attackTypeName, battleContext)).filter(
      typeName => !ownTypes.includes(typeName),
    );
    if (candidates.length === 0) {
      return 'But it failed';
    }
    const typeName = candidates[Math.floor(Math.random() * candidates.length)];
    if (!(await setTypes(attacker, [typeName], battleContext))) {
      return 'But it failed';
    }
    return `transformed into the ${typeName} type!`;
  }
}
