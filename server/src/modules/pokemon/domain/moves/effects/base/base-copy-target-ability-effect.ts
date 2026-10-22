import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';
import { resolveCurrentAbilityName, setAbility } from '../../../battle-events/ability-change';

/**
 * 相手の今の特性を使用者に写す技の基底クラス（なりきり・うつしえ）
 *
 * 相手の今の特性（いえきで消されているかは見ない）を、使用者の特性にする。写した特性は始まる（いかくが発動する）。
 * 次のときは失敗する
 * - 相手に特性がない・相手の特性が写せない特性（failRolePlay。トレース・ふしぎなまもり・マルチタイプなど）
 * - 使用者が相手と同じ特性・使用者の特性が消せない特性（cantSuppress）
 * 注: とくせいガードで防ぐ効果は扱わない（持ち物の仕組みがない）
 */
export abstract class BaseCopyTargetAbilityEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    const abilityName = await resolveCurrentAbilityName(defender, battleContext);
    if (
      abilityName === undefined ||
      hasAbilityFlag(abilityName, 'failRolePlay') ||
      abilityName === (await resolveCurrentAbilityName(attacker, battleContext))
    ) {
      return 'But it failed';
    }
    const result = await setAbility(attacker, abilityName, battleContext);
    return result.changed ? `The user copied ${abilityName}!` : 'But it failed';
  }
}
