import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { isGrounded } from '@/modules/battle/domain/logic/grounded';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * グラススライダー（Grassy Glide）技の効果
 *
 * グラスフィールドで、地面にいる使用者が使うと優先度が +1 になる（本家の onModifyPriority）。
 * 地面にいるかは isGrounded で判定する（ひこうタイプ・ふゆう・でんじふゆうなら地面にいない。じゅうりょく中は地面にいる）
 */
export class GrassyGlideEffect implements IMoveEffect {
  modifyPriority(
    attacker: BattlePokemonStatus,
    priority: number,
    battleContext: BattleContext,
  ): number | undefined {
    const field = battleContext.field ?? battleContext.battle.field;
    if (field !== Field.GrassyTerrain) {
      return undefined;
    }
    const grounded = isGrounded({
      typeNames: battleContext.attackerTypeNames ?? [],
      abilityName: battleContext.attackerAbilityName,
      volatileState: attacker.volatileState,
      sideState: battleContext.battle.sideState,
    });
    return grounded ? priority + 1 : undefined;
  }
}
