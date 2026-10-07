import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { hasType } from '../../../battle-events/battle-traits';
import { ALL_TYPE_NAMES, setTypes } from '../../../battle-events/type-change';

/**
 * へんしょく（Color Change）特性の効果
 * 攻撃技でダメージを受けたあと、その技のタイプを持っていなければ、そのタイプだけになる
 * （本家の onAfterMoveSecondary。連続技でも技のあとに 1 回だけ）
 *
 * - ひんしになったとき・タイプなしの技（わるあがきなど）では変わらない
 * - 足されたタイプ（ハロウィン・もりののろい）も含めて、技のタイプを持っているかを見る
 * - アルセウス・シルヴァディは変わらない（setTypes）
 * - かたやぶりでは無視されない（本家も breakable ではない）
 * 注: 本家は、ちからずくの使い手の追加効果のある技では発動しないが、ここでは発動する
 */
export class ColorChangeEffect implements IAbilityEffect {
  async onAfterMoveHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const typeName = hit.moveTypeName;
    if (
      !battleContext ||
      holder.currentHp <= 0 ||
      !(ALL_TYPE_NAMES as readonly string[]).includes(typeName) ||
      (await hasType(holder, typeName, battleContext)) ||
      !(await setTypes(holder, [typeName], battleContext))
    ) {
      return null;
    }
    return `became the ${typeName} type!`;
  }
}
