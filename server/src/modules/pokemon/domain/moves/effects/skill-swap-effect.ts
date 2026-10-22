import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { swapAbilities } from '../../battle-events/ability-change';

/**
 * スキルスワップ（Skill Swap）技の効果
 *
 * 使用者と相手の今の特性を入れ替える（いえきで消されているかは見ない）。入れ替えた特性は、
 * 相手が受け取った特性 → 使用者が受け取った特性の順に始まる（受け取ったいかくが発動する）。
 * どちらかの特性が入れ替えられない特性（ふしぎなまもり・イリュージョン・マルチタイプなど）なら失敗する。
 * 第 9 世代は、同じ特性どうしでも入れ替えられる。みがわりを貫通する
 * 注: とくせいガードで防ぐ効果は扱わない（持ち物の仕組みがない）
 */
export class SkillSwapEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    if (!(await swapAbilities(attacker, defender, battleContext))) {
      return 'But it failed';
    }
    return 'The user swapped Abilities with its target!';
  }
}
