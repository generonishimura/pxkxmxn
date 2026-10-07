import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TYPELESS_TYPE_NAME } from '@/modules/battle/domain/logic/effective-traits';
import { BattleContext } from '../../battle-context.interface';
import { resolveTypeNames } from '../../../battle-events/battle-traits';
import { setTypes } from '../../../battle-events/type-change';

/**
 * へんげんじざい（Protean）特性の効果
 * 技を出す直前に、使用者のタイプをその技のタイプだけにする（本家の onPrepareHit。変化技・外れる技でも変わる）
 *
 * - 第 9 世代と同じく、場に出てから 1 回だけ（volatileState.typeChangeAbilityUsed。交代で消える）。
 *   特性を書き換えたとき（setAbility・swapAbilities）も消えるので、スキルスワップなどで取り戻すと、また 1 回使える
 * - 今のタイプが技のタイプだけのとき・タイプなしの技・タイプを変えられないとき（アルセウスなど）は変わらず、
 *   1 回の分も使わない
 * - はね返した技・みらいよち・よこどりで奪った技・技を呼ぶ技では、エンジンがこのフックを呼ばない
 */
export class ProteanEffect implements IAbilityEffect {
  async onPrepareHit(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const typeName = battleContext?.moveTypeName;
    if (
      !battleContext ||
      !typeName ||
      typeName === TYPELESS_TYPE_NAME ||
      holder.volatileState.typeChangeAbilityUsed === true ||
      (await resolveTypeNames(holder, battleContext)).join() === typeName ||
      !(await setTypes(holder, [typeName], battleContext))
    ) {
      return null;
    }
    await battleContext.battleRepository?.patchVolatileState(holder.id, {
      typeChangeAbilityUsed: true,
    });
    return `became the ${typeName} type!`;
  }
}
